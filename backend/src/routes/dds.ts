import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchain';
import { ipfsService } from '../services/ipfs';
import { geojsonService } from '../services/geojson.service';
import {
    DueDiligenceStatement,
    DDSRiskAssessment,
    RiskLevel,
    BatchMetadata,
    EUDR_CONSTANTS,
    EUDRFeatureCollection
} from '../types/eudr.types';

const router = Router();

/**
 * Generate Due Diligence Statement (DDS) for a batch
 * GET /api/dds/generate/:tokenId
 */
router.get('/generate/:tokenId', async (req: Request, res: Response) => {
    try {
        const tokenId = parseInt(req.params.tokenId);

        if (isNaN(tokenId)) {
            return res.status(400).json({ error: 'Invalid token ID' });
        }

        // Fetch batch data from blockchain
        const batch = await blockchainService.getBatch(tokenId);

        if (!batch || !batch.tokenUri) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        // Fetch IPFS metadata
        let ipfsMetadata: Partial<BatchMetadata> = {};
        if (batch.tokenUri.includes('ipfs')) {
            try {
                const cid = batch.tokenUri.split('/').pop();
                ipfsMetadata = await ipfsService.fetchFromIPFS(cid);
            } catch (e) {
                console.warn('Could not fetch IPFS metadata:', e);
            }
        }

        // Build DDS
        const dds = buildDueDiligenceStatement(tokenId, batch, ipfsMetadata);

        // Set filename for download
        const filename = `DDS_${dds.dds_reference_number}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');

        res.json(dds);
    } catch (error: any) {
        console.error('DDS generation error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate DDS' });
    }
});

/**
 * Preview DDS without download headers
 * GET /api/dds/preview/:tokenId
 */
router.get('/preview/:tokenId', async (req: Request, res: Response) => {
    try {
        const tokenId = parseInt(req.params.tokenId);

        if (isNaN(tokenId)) {
            return res.status(400).json({ error: 'Invalid token ID' });
        }

        const batch = await blockchainService.getBatch(tokenId);

        if (!batch || !batch.tokenUri) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        let ipfsMetadata: Partial<BatchMetadata> = {};
        if (batch.tokenUri.includes('ipfs')) {
            try {
                const cid = batch.tokenUri.split('/').pop();
                ipfsMetadata = await ipfsService.fetchFromIPFS(cid);
            } catch (e) {
                console.warn('Could not fetch IPFS metadata:', e);
            }
        }

        const dds = buildDueDiligenceStatement(tokenId, batch, ipfsMetadata);

        res.json(dds);
    } catch (error: any) {
        console.error('DDS preview error:', error);
        res.status(500).json({ error: error.message || 'Failed to preview DDS' });
    }
});

/**
 * Build a complete Due Diligence Statement
 */
function buildDueDiligenceStatement(
    tokenId: number,
    batch: any,
    metadata: Partial<BatchMetadata>
): DueDiligenceStatement {
    const now = new Date().toISOString();

    // Generate reference number (placeholder - real one assigned by TRACES)
    const ddsRef = `DDS-${Date.now()}-${tokenId.toString().padStart(6, '0')}`;

    // Get geolocation
    const geolocation: EUDRFeatureCollection = metadata.geolocation || {
        type: 'FeatureCollection',
        features: []
    };

    // Calculate totals
    const totalAreaHa = geojsonService.calculateTotalArea(geolocation);
    const plotCount = geolocation.features?.length || 0;

    // Determine deforestation status
    const deforestationFree = metadata.deforestation_check?.status === true;

    // Determine legality status
    const hasLegalityDocs = (metadata.legality_documents?.length || 0) > 0;
    const legalityCompliant = hasLegalityDocs;

    // Calculate risk assessment
    const riskAssessment = calculateRiskAssessment(
        geolocation,
        deforestationFree,
        legalityCompliant,
        metadata
    );

    // Build operator info (from metadata or defaults)
    const operator = {
        name: metadata.origin_farmers?.[0] || 'Unknown Operator',
        address: batch.origin || metadata.origin || 'Nigeria',
        country: 'NG',
        eori_number: undefined // To be filled by operator
    };

    // Build product info
    const product = {
        hs_code: metadata.hs_code || EUDR_CONSTANTS.DEFAULT_HS_CODE,
        commodity_name: metadata.commodity_name || EUDR_CONSTANTS.DEFAULT_COMMODITY_NAME,
        scientific_name: metadata.scientific_name || EUDR_CONSTANTS.DEFAULT_SCIENTIFIC_NAME,
        description: metadata.description,
        quantity_net_mass_kg: metadata.quantity_net_mass_kg || 0
    };

    // Build legality document references
    const legalityDocRefs = (metadata.legality_documents || []).map(doc => ({
        type: doc.type,
        issuer: doc.issuer,
        reference: doc.document_reference
    }));

    const dds: DueDiligenceStatement = {
        // Box 1: References
        dds_reference_number: ddsRef,
        verification_number: generateVerificationNumber(),
        company_internal_reference: metadata.batch_id,

        // Box 2: Activity
        activity_type: 'EXPORT',
        upstream_dds_references: [],

        // Box 3: Operator
        operator,

        // Box 4: Product
        product,

        // Box 5: Origin & Geolocation
        country_of_production: 'NG',
        geolocation,
        total_area_ha: totalAreaHa,
        plot_count: plotCount,

        // Box 6: Deforestation Status
        deforestation_free: deforestationFree,
        deforestation_evidence: metadata.deforestation_check ? {
            source: metadata.deforestation_check.source,
            checked_date: metadata.deforestation_check.checked_date,
            ipfs_hash: metadata.deforestation_check.evidence_ipfs
        } : undefined,

        // Box 7: Legality Status
        legality_compliant: legalityCompliant,
        legality_documents: legalityDocRefs,

        // Box 8: Risk Assessment
        risk_assessment: riskAssessment,

        // Declaration
        declaration: {
            timestamp: now,
            attestation: EUDR_CONSTANTS.ATTESTATION_TEXT
        },

        // Blockchain References
        batch_nft_token_id: tokenId,
        ipfs_metadata_hash: metadata.geolocation_hash || '',
        blockchain_network: 'Base',
        contract_address: process.env.CONTRACT_ADDRESS || '',

        // Generation info
        generated_at: now,
        generator_version: EUDR_CONSTANTS.GENERATOR_VERSION
    };

    return dds;
}

/**
 * Calculate risk assessment based on completeness of data
 */
function calculateRiskAssessment(
    geolocation: EUDRFeatureCollection,
    deforestationFree: boolean,
    legalityCompliant: boolean,
    metadata: Partial<BatchMetadata>
): DDSRiskAssessment {
    const mitigationMeasures: string[] = [];
    let riskLevel: RiskLevel = 'negligible';

    const hasGeolocation = geolocation.features && geolocation.features.length > 0;
    const allPlotsHaveIds = geolocation.features?.every(f => f.properties?.plot_id);
    const validation = geojsonService.validateGeoJSON(geolocation);

    // Check conditions for negligible risk
    if (!hasGeolocation) {
        riskLevel = 'non-negligible';
        mitigationMeasures.push('Provide plot-level geolocation data');
    } else if (!validation.valid) {
        riskLevel = 'non-negligible';
        mitigationMeasures.push('Fix geolocation validation errors: ' + validation.errors.join(', '));
    }

    if (!deforestationFree) {
        riskLevel = 'non-negligible';
        mitigationMeasures.push('Verify deforestation-free status via satellite imagery or Global Forest Watch');
    }

    if (!legalityCompliant) {
        riskLevel = 'non-negligible';
        mitigationMeasures.push('Upload required legality documents (land tenure, harvest permit, tax compliance)');
    }

    if (!allPlotsHaveIds && hasGeolocation) {
        if (riskLevel === 'negligible') riskLevel = 'low';
        mitigationMeasures.push('Assign unique plot_id to all geolocation features for traceability');
    }

    if (!metadata.quantity_net_mass_kg) {
        if (riskLevel === 'negligible') riskLevel = 'low';
        mitigationMeasures.push('Specify net mass quantity in kg');
    }

    return {
        risk_level: riskLevel,
        assessment_date: new Date().toISOString(),
        mitigation_measures: mitigationMeasures.length > 0 ? mitigationMeasures : undefined
    };
}

/**
 * Generate a verification number (security token)
 */
function generateVerificationNumber(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export default router;
