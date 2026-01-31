import type { Feature, FeatureCollection, Point, Polygon, Position } from 'geojson';

// =============================================================================
// GeoJSON Types for EUDR Plot-Level Geolocation
// =============================================================================

export interface PlotProperties {
    plot_id?: string;           // Unique persistent ID for this plot
    farm_id?: string;           // Parent farm identifier
    area_ha?: number;           // Auto-calculated area in hectares
    farmer_name?: string;       // Optional: farmer/owner name
}

export type EUDRPoint = Feature<Point, PlotProperties>;
export type EUDRPolygon = Feature<Polygon, PlotProperties>;
export type EUDRFeature = EUDRPoint | EUDRPolygon;
export type EUDRFeatureCollection = FeatureCollection<Point | Polygon, PlotProperties>;

// =============================================================================
// Deforestation Check
// =============================================================================

export interface DeforestationCheck {
    status: boolean;                                        // true = verified deforestation-free
    checked_date: string;                                   // ISO 8601 date
    source: 'manual' | 'global_forest_watch' | 'satellite' | 'other';
    evidence_ipfs?: string;                                 // IPFS hash of evidence (screenshot, report)
    notes?: string;
}

// =============================================================================
// Legality Documents
// =============================================================================

export type LegalityDocumentType =
    | 'land_tenure'
    | 'harvest_permit'
    | 'export_license'
    | 'tax_compliance'
    | 'phytosanitary_certificate'
    | 'other';

export interface LegalityDocument {
    type: LegalityDocumentType;
    issuer: string;                                         // Issuing authority
    issue_date: string;                                     // ISO 8601 date
    expiry_date?: string;                                   // ISO 8601 date (if applicable)
    ipfs_hash: string;                                      // IPFS CID of uploaded document
    document_reference?: string;                            // Official document number
}

// =============================================================================
// Batch Metadata (Enhanced for EUDR)
// =============================================================================

export interface SensorAggregates {
    temp_avg: number;
    temp_min: number;
    temp_max: number;
    humidity_avg: number;
    humidity_min: number;
    humidity_max: number;
    reading_count: number;
    last_updated: string;
}

export type ComplianceStatus = 'pending' | 'compliant' | 'non_compliant' | 'draft';

export interface BatchMetadata {
    // Basic info
    batch_id: string;
    name: string;
    description?: string;

    // Origin & Product
    origin: string;
    supplierId: string;
    hs_code: string;                                        // e.g., "180100" for cocoa beans
    commodity_name: string;                                 // e.g., "cocoa beans"
    scientific_name?: string;                               // e.g., "Theobroma cacao"
    quantity_net_mass_kg: number;

    // Production details
    harvest_period?: {
        start_date: string;
        end_date: string;
    };
    production_date?: string;

    // EUDR Compliance
    geolocation: EUDRFeatureCollection;
    geolocation_hash: string;                               // keccak256 of geolocation JSON
    deforestation_check?: DeforestationCheck;
    legality_documents: LegalityDocument[];

    // Sensor data
    carbonFootprint: number;
    sensor_aggregates?: SensorAggregates;

    // Status
    compliance_status: ComplianceStatus;
    origin_farmers?: string[];

    // Timestamps
    timestamp: string;
    mintedAt: string;
}

// =============================================================================
// Due Diligence Statement (DDS) - Matches TRACES NT / Annex II Structure
// =============================================================================

export interface DDSOperator {
    name: string;
    address: string;
    country: string;
    eori_number?: string;                                   // EU customs identifier
    registration_number?: string;
}

export interface DDSProduct {
    hs_code: string;                                        // Harmonized System code
    commodity_name: string;                                 // e.g., "cocoa beans"
    scientific_name?: string;                               // e.g., "Theobroma cacao"
    description?: string;
    quantity_net_mass_kg: number;
    supplementary_unit?: string;
}

export type RiskLevel = 'negligible' | 'low' | 'standard' | 'non-negligible';

export interface DDSRiskAssessment {
    risk_level: RiskLevel;
    assessment_date: string;
    mitigation_measures?: string[];
    notes?: string;
}

export type ActivityType = 'IMPORT' | 'EXPORT' | 'DOMESTIC_PRODUCTION' | 'TRADE' | 'PLACING_ON_MARKET';

export interface DDSDeclaration {
    timestamp: string;
    attestation: string;
    operator_signature_hash?: string;                       // Optional: wallet signature
}

export interface DueDiligenceStatement {
    // Box 1: References
    dds_reference_number: string;                           // System-generated, placeholder until TRACES
    verification_number?: string;                           // Security token for downstream sharing
    company_internal_reference?: string;

    // Box 2: Activity
    activity_type: ActivityType;
    upstream_dds_references?: string[];                     // Chain-of-custody references

    // Box 3: Operator
    operator: DDSOperator;

    // Box 4: Product
    product: DDSProduct;

    // Box 5: Origin & Geolocation
    country_of_production: string;                          // ISO 3166-1 alpha-2 (e.g., "NG")
    geolocation: EUDRFeatureCollection;
    total_area_ha: number;
    plot_count: number;

    // Box 6: Deforestation Status
    deforestation_free: boolean;
    deforestation_evidence?: {
        source: string;
        checked_date: string;
        ipfs_hash?: string;
    };

    // Box 7: Legality Status
    legality_compliant: boolean;
    legality_documents: Array<{
        type: LegalityDocumentType;
        issuer: string;
        reference?: string;
    }>;

    // Box 8: Risk Assessment
    risk_assessment: DDSRiskAssessment;

    // Declaration
    declaration: DDSDeclaration;

    // Blockchain References
    batch_nft_token_id: number;
    ipfs_metadata_hash: string;
    blockchain_network: string;
    contract_address: string;

    // Generation info
    generated_at: string;
    generator_version: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface MintBatchRequest {
    to: string;                                             // Wallet address
    origin: string;
    supplierId: string;

    // EUDR Required
    geolocation: EUDRFeatureCollection;
    hs_code?: string;                                       // Default: "180100"
    commodity_name?: string;                                // Default: "cocoa beans"
    quantity_net_mass_kg: number;

    // Optional EUDR
    scientific_name?: string;
    deforestationCheck?: DeforestationCheck;
    legalityDocuments?: LegalityDocument[];
    harvest_period?: { start_date: string; end_date: string };

    // Existing fields
    carbonFootprint?: number;
    metadata?: Record<string, unknown>;
}

export interface MintBatchResponse {
    success: boolean;
    tokenId: number;
    txHash: string;
    ipfsCid: string;
    tokenUri: string;
    geolocationHash: string;
    compliance_status: ComplianceStatus;
}

export interface GeoValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    features: Array<{
        index: number;
        type: 'Point' | 'Polygon';
        area_ha?: number;
        plot_id?: string;
        coordinate_precision: number;
    }>;
    total_area_ha: number;
    requires_polygon_count: number;                         // Features ≥4ha that need polygon
}

// =============================================================================
// Constants
// =============================================================================

export const EUDR_CONSTANTS = {
    MIN_COORDINATE_PRECISION: 6,                            // ≥6 decimal places required
    LARGE_PLOT_THRESHOLD_HA: 4,                             // Plots ≥4ha require polygon
    MAX_GEOJSON_SIZE_BYTES: 5 * 1024 * 1024,               // 5MB limit
    MAX_DOC_SIZE_BYTES: 5 * 1024 * 1024,                   // 5MB limit
    DEFAULT_HS_CODE: '180100',                              // Cocoa beans
    DEFAULT_COMMODITY_NAME: 'cocoa beans',
    DEFAULT_SCIENTIFIC_NAME: 'Theobroma cacao',
    ATTESTATION_TEXT: 'I confirm that due diligence was conducted in accordance with Regulation (EU) 2023/1115 and the risk is assessed as indicated above.',
    GENERATOR_VERSION: '1.0.0',
} as const;
