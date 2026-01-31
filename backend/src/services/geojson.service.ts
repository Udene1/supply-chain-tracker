import * as turf from '@turf/turf';
import { keccak256, toUtf8Bytes } from 'ethers';
import type { Feature, FeatureCollection, Point, Polygon, Position } from 'geojson';
import {
    EUDRFeatureCollection,
    EUDRFeature,
    PlotProperties,
    GeoValidationResult,
    EUDR_CONSTANTS
} from '../types/eudr.types';

// =============================================================================
// GeoJSON Validation Service
// =============================================================================

class GeoJSONService {
    /**
     * Validate a GeoJSON FeatureCollection for EUDR compliance
     */
    validateGeoJSON(input: unknown): GeoValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const featureResults: GeoValidationResult['features'] = [];
        let totalAreaHa = 0;
        let requiresPolygonCount = 0;

        // Basic structure validation
        if (!input || typeof input !== 'object') {
            return {
                valid: false,
                errors: ['Input must be a valid GeoJSON object'],
                warnings: [],
                features: [],
                total_area_ha: 0,
                requires_polygon_count: 0
            };
        }

        let featureCollection: FeatureCollection;

        // Normalize to FeatureCollection
        try {
            featureCollection = this.normalizeToFeatureCollection(input);
        } catch (e: any) {
            return {
                valid: false,
                errors: [e.message || 'Failed to parse GeoJSON'],
                warnings: [],
                features: [],
                total_area_ha: 0,
                requires_polygon_count: 0
            };
        }

        if (!featureCollection.features || featureCollection.features.length === 0) {
            return {
                valid: false,
                errors: ['FeatureCollection must contain at least one feature'],
                warnings: [],
                features: [],
                total_area_ha: 0,
                requires_polygon_count: 0
            };
        }

        // Track plot_ids for duplicate detection
        const plotIds = new Set<string>();

        // Validate each feature
        for (let i = 0; i < featureCollection.features.length; i++) {
            const feature = featureCollection.features[i];
            const featureErrors: string[] = [];

            // Check feature type
            if (feature.type !== 'Feature') {
                errors.push(`Feature ${i}: Must be of type "Feature"`);
                continue;
            }

            // Check geometry exists
            if (!feature.geometry) {
                errors.push(`Feature ${i}: Missing geometry`);
                continue;
            }

            const geomType = feature.geometry.type;

            // Only allow Point or Polygon
            if (geomType !== 'Point' && geomType !== 'Polygon') {
                errors.push(`Feature ${i}: Geometry must be Point or Polygon, got ${geomType}`);
                continue;
            }

            // Validate coordinates
            const coordPrecision = this.getMinCoordinatePrecision(feature.geometry);
            if (coordPrecision < EUDR_CONSTANTS.MIN_COORDINATE_PRECISION) {
                errors.push(`Feature ${i}: Coordinates must have at least ${EUDR_CONSTANTS.MIN_COORDINATE_PRECISION} decimal places (found ${coordPrecision})`);
            }

            // Calculate area for polygons
            let areaHa: number | undefined;
            if (geomType === 'Polygon') {
                try {
                    const areaM2 = turf.area(feature as Feature<Polygon>);
                    areaHa = areaM2 / 10000; // Convert to hectares
                    totalAreaHa += areaHa;
                } catch (e) {
                    warnings.push(`Feature ${i}: Could not calculate area`);
                }
            }

            // Check if large plot requires polygon
            if (geomType === 'Point') {
                // For points, we can't determine area - warn if no area_ha property
                if (!feature.properties?.area_ha) {
                    warnings.push(`Feature ${i}: Point geometry without area_ha property. If plot is ≥4 ha, polygon is required.`);
                } else if (feature.properties.area_ha >= EUDR_CONSTANTS.LARGE_PLOT_THRESHOLD_HA) {
                    errors.push(`Feature ${i}: Plot is ${feature.properties.area_ha} ha (≥${EUDR_CONSTANTS.LARGE_PLOT_THRESHOLD_HA} ha) - must use Polygon geometry`);
                    requiresPolygonCount++;
                }
            }

            // Check for duplicate plot_id
            const plotId = feature.properties?.plot_id;
            if (plotId) {
                if (plotIds.has(plotId)) {
                    errors.push(`Feature ${i}: Duplicate plot_id "${plotId}"`);
                } else {
                    plotIds.add(plotId);
                }
            } else {
                warnings.push(`Feature ${i}: Missing plot_id property (recommended for traceability)`);
            }

            featureResults.push({
                index: i,
                type: geomType as 'Point' | 'Polygon',
                area_ha: areaHa,
                plot_id: plotId,
                coordinate_precision: coordPrecision
            });
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            features: featureResults,
            total_area_ha: Math.round(totalAreaHa * 1000) / 1000, // 3 decimal places
            requires_polygon_count: requiresPolygonCount
        };
    }

    /**
     * Normalize various GeoJSON inputs to FeatureCollection
     */
    normalizeToFeatureCollection(input: unknown): FeatureCollection {
        if (!input || typeof input !== 'object') {
            throw new Error('Invalid GeoJSON input');
        }

        const obj = input as Record<string, unknown>;

        // Already a FeatureCollection
        if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
            return obj as unknown as FeatureCollection;
        }

        // Single Feature
        if (obj.type === 'Feature' && obj.geometry) {
            return {
                type: 'FeatureCollection',
                features: [obj as unknown as Feature]
            };
        }

        // Raw geometry (Point or Polygon)
        if (obj.type === 'Point' || obj.type === 'Polygon') {
            return {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: obj as unknown as Point | Polygon,
                    properties: {}
                }]
            };
        }

        throw new Error('Unable to parse as valid GeoJSON (expected FeatureCollection, Feature, Point, or Polygon)');
    }

    /**
     * Get minimum coordinate precision across all coordinates in a geometry
     */
    private getMinCoordinatePrecision(geometry: Point | Polygon): number {
        const coords = this.extractCoordinates(geometry);
        let minPrecision = Infinity;

        for (const coord of coords) {
            for (const value of coord) {
                const precision = this.getDecimalPrecision(value);
                if (precision < minPrecision) {
                    minPrecision = precision;
                }
            }
        }

        return minPrecision === Infinity ? 0 : minPrecision;
    }

    /**
     * Extract all coordinate pairs from a geometry
     */
    private extractCoordinates(geometry: Point | Polygon): Position[] {
        if (geometry.type === 'Point') {
            return [geometry.coordinates];
        }

        if (geometry.type === 'Polygon') {
            // Flatten all rings
            return geometry.coordinates.flat();
        }

        return [];
    }

    /**
     * Get decimal precision of a number
     */
    private getDecimalPrecision(value: number): number {
        const str = value.toString();
        const decimalIndex = str.indexOf('.');
        if (decimalIndex === -1) return 0;
        return str.length - decimalIndex - 1;
    }

    /**
     * Enrich features with calculated area (for polygons)
     */
    enrichWithArea(featureCollection: EUDRFeatureCollection): EUDRFeatureCollection {
        const enrichedFeatures = featureCollection.features.map(feature => {
            if (feature.geometry.type === 'Polygon') {
                const areaM2 = turf.area(feature as Feature<Polygon>);
                const areaHa = Math.round((areaM2 / 10000) * 1000) / 1000;

                return {
                    ...feature,
                    properties: {
                        ...feature.properties,
                        area_ha: areaHa
                    }
                };
            }
            return feature;
        });

        return {
            type: 'FeatureCollection',
            features: enrichedFeatures
        } as EUDRFeatureCollection;
    }

    /**
     * Calculate total area from FeatureCollection
     */
    calculateTotalArea(featureCollection: EUDRFeatureCollection): number {
        let total = 0;

        for (const feature of featureCollection.features) {
            if (feature.geometry.type === 'Polygon') {
                const areaM2 = turf.area(feature as Feature<Polygon>);
                total += areaM2 / 10000;
            } else if (feature.properties?.area_ha) {
                total += feature.properties.area_ha;
            }
        }

        return Math.round(total * 1000) / 1000;
    }

    /**
     * Compute keccak256 hash of GeoJSON for on-chain storage
     */
    computeGeolocationHash(featureCollection: EUDRFeatureCollection): string {
        const jsonString = JSON.stringify(featureCollection);
        return keccak256(toUtf8Bytes(jsonString));
    }

    /**
     * Validate file size
     */
    validateFileSize(sizeBytes: number): boolean {
        return sizeBytes <= EUDR_CONSTANTS.MAX_GEOJSON_SIZE_BYTES;
    }

    /**
     * Get centroid of all features (for map display)
     */
    getCentroid(featureCollection: EUDRFeatureCollection): [number, number] {
        const allCoords: Position[] = [];

        for (const feature of featureCollection.features) {
            if (feature.geometry.type === 'Point') {
                allCoords.push(feature.geometry.coordinates);
            } else if (feature.geometry.type === 'Polygon') {
                const centroid = turf.centroid(feature as Feature<Polygon>);
                allCoords.push(centroid.geometry.coordinates);
            }
        }

        if (allCoords.length === 0) {
            return [0, 0];
        }

        const avgLng = allCoords.reduce((sum, c) => sum + c[0], 0) / allCoords.length;
        const avgLat = allCoords.reduce((sum, c) => sum + c[1], 0) / allCoords.length;

        return [avgLng, avgLat];
    }
}

export const geojsonService = new GeoJSONService();
