import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';

// =============================================================================
// GeoJSON Types for EUDR Plot-Level Geolocation
// =============================================================================

export interface PlotProperties {
    plot_id?: string;
    farm_id?: string;
    area_ha?: number;
    farmer_name?: string;
}

export type EUDRPoint = Feature<Point, PlotProperties>;
export type EUDRPolygon = Feature<Polygon, PlotProperties>;
export type EUDRFeature = EUDRPoint | EUDRPolygon;
export type EUDRFeatureCollection = FeatureCollection<Point | Polygon, PlotProperties>;

// =============================================================================
// Deforestation & Legality
// =============================================================================

export interface DeforestationCheck {
    status: boolean;
    checked_date: string;
    source: 'manual' | 'global_forest_watch' | 'satellite' | 'other';
    evidence_ipfs?: string;
}

export type LegalityDocumentType =
    | 'land_tenure'
    | 'harvest_permit'
    | 'export_license'
    | 'tax_compliance'
    | 'phytosanitary_certificate'
    | 'other';

export interface LegalityDocument {
    type: LegalityDocumentType;
    issuer: string;
    issue_date: string;
    expiry_date?: string;
    ipfs_hash: string;
    document_reference?: string;
}

// =============================================================================
// Batch Metadata
// =============================================================================

export type ComplianceStatus = 'pending' | 'compliant' | 'non_compliant' | 'draft';

export interface BatchMetadata {
    batch_id: string;
    name: string;
    description?: string;
    origin: string;
    supplierId: string;
    hs_code: string;
    commodity_name: string;
    scientific_name?: string;
    quantity_net_mass_kg: number;
    geolocation: EUDRFeatureCollection;
    geolocation_hash: string;
    deforestation_check?: DeforestationCheck;
    legality_documents: LegalityDocument[];
    carbonFootprint: number;
    compliance_status: ComplianceStatus;
    timestamp: string;
}

// =============================================================================
// Due Diligence Statement
// =============================================================================

export type RiskLevel = 'negligible' | 'low' | 'standard' | 'non-negligible';

export interface DueDiligenceStatement {
    dds_reference_number: string;
    verification_number?: string;
    company_internal_reference?: string;
    operator: {
        name: string;
        address: string;
        country: string;
        eori_number?: string;
    };
    activity_type: 'IMPORT' | 'EXPORT' | 'TRADE';
    product: {
        hs_code: string;
        commodity_name: string;
        scientific_name?: string;
        quantity_net_mass_kg: number;
    };
    country_of_production: string;
    geolocation: EUDRFeatureCollection;
    total_area_ha: number;
    plot_count: number;
    deforestation_free: boolean;
    legality_compliant: boolean;
    risk_assessment: {
        risk_level: RiskLevel;
        mitigation_measures?: string[];
    };
    declaration: {
        timestamp: string;
        attestation: string;
    };
    batch_nft_token_id: number;
    ipfs_metadata_hash: string;
    generated_at: string;
}

// =============================================================================
// API Types
// =============================================================================

export interface MintBatchRequest {
    to: string;
    origin: string;
    supplierId: string;
    geolocation: EUDRFeatureCollection;
    hs_code?: string;
    commodity_name?: string;
    scientific_name?: string;
    quantity_net_mass_kg: number;
    deforestationCheck?: DeforestationCheck;
    legalityDocuments?: LegalityDocument[];
    harvest_period?: { start_date: string; end_date: string };
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
    warnings?: string[];
}

// =============================================================================
// Constants
// =============================================================================

export const EUDR_CONSTANTS = {
    MIN_COORDINATE_PRECISION: 6,
    LARGE_PLOT_THRESHOLD_HA: 4,
    HIGH_AREA_WARNING_THRESHOLD_HA: 100,
    MAX_GEOJSON_SIZE_BYTES: 5 * 1024 * 1024,
    DEFAULT_HS_CODE: '180100',
    DEFAULT_COMMODITY_NAME: 'cocoa beans',
    DEFAULT_SCIENTIFIC_NAME: 'Theobroma cacao',
} as const;

export const HS_CODES = [
    { code: '180100', label: 'Cocoa beans, whole or broken, raw or roasted' },
    { code: '180200', label: 'Cocoa shells, husks, skins and waste' },
    { code: '180310', label: 'Cocoa paste, not defatted' },
    { code: '180320', label: 'Cocoa paste, wholly or partly defatted' },
    { code: '180400', label: 'Cocoa butter, fat and oil' },
    { code: '180500', label: 'Cocoa powder (unsweetened)' },
    { code: '180610', label: 'Cocoa powder with sugar' },
    { code: '180620', label: 'Chocolate preparations (>2kg)' },
    { code: '180631', label: 'Chocolate bars (filled)' },
    { code: '180632', label: 'Chocolate bars (not filled)' },
] as const;

export const LEGALITY_DOC_TYPES = [
    { value: 'land_tenure', label: 'Land Tenure Certificate' },
    { value: 'harvest_permit', label: 'Harvest Permit' },
    { value: 'export_license', label: 'Export License' },
    { value: 'tax_compliance', label: 'Tax Compliance Certificate' },
    { value: 'phytosanitary_certificate', label: 'Phytosanitary Certificate' },
    { value: 'other', label: 'Other Document' },
] as const;
