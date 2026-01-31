import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchain';
import { ipfsService } from '../services/ipfs';
import { geojsonService } from '../services/geojson.service';
import {
    MintBatchRequest,
    MintBatchResponse,
    BatchMetadata,
    ComplianceStatus,
    EUDR_CONSTANTS,
    EUDRFeatureCollection
} from '../types/eudr.types';

const router = Router();

/**
 * Mint a new batch with EUDR compliance data
 * POST /api/batch/mint
 */
router.post('/mint', async (req: Request, res: Response) => {
    try {
        const {
            to,
            origin,
            supplierId,
            geolocation,
            hs_code,
            commodity_name,
            scientific_name,
            quantity_net_mass_kg,
            deforestationCheck,
            legalityDocuments,
            harvest_period,
            carbonFootprint,
            metadata
        } = req.body as MintBatchRequest & { metadata?: Record<string, unknown> };

        // Required field validation
        if (!to || !origin || !supplierId) {
            return res.status(400).json({
                error: 'Missing required fields: to, origin, supplierId'
            });
        }

        // EUDR: Geolocation is now REQUIRED
        if (!geolocation) {
            return res.status(400).json({
                error: 'Missing required field: geolocation (GeoJSON FeatureCollection)',
                hint: 'Provide plot-level geolocation per EUDR requirements. For plots <4 ha, Point or Polygon accepted. For plots ≥4 ha, Polygon required.'
            });
        }

        // Validate and normalize geolocation
        let normalizedGeo: EUDRFeatureCollection;
        try {
            normalizedGeo = geojsonService.normalizeToFeatureCollection(geolocation) as EUDRFeatureCollection;
        } catch (e: any) {
            return res.status(400).json({
                error: 'Invalid geolocation format',
                details: e.message
            });
        }

        // Validate GeoJSON
        const geoValidation = geojsonService.validateGeoJSON(normalizedGeo);
        if (!geoValidation.valid) {
            return res.status(400).json({
                error: 'Geolocation validation failed',
                errors: geoValidation.errors,
                warnings: geoValidation.warnings
            });
        }

        // Enrich features with calculated area
        const enrichedGeo = geojsonService.enrichWithArea(normalizedGeo);

        // Compute geolocation hash for on-chain storage
        const geolocationHash = geojsonService.computeGeolocationHash(enrichedGeo);

        // Determine compliance status
        let complianceStatus: ComplianceStatus = 'pending';
        const hasDeforestationCheck = deforestationCheck?.status === true;
        const hasLegalityDocs = (legalityDocuments?.length || 0) > 0;

        if (hasDeforestationCheck && hasLegalityDocs && geoValidation.valid) {
            complianceStatus = 'compliant';
        } else if (!geoValidation.valid) {
            complianceStatus = 'draft';
        }

        // Build EUDR-compliant metadata
        const batchMetadata: BatchMetadata = {
            // Basic info
            batch_id: `BATCH-${Date.now()}`,
            name: `Cocoa Batch - ${origin}`,
            description: (metadata?.description as string) || `Sustainable cocoa batch from ${origin}`,

            // Origin & Product
            origin,
            supplierId,
            hs_code: hs_code || EUDR_CONSTANTS.DEFAULT_HS_CODE,
            commodity_name: commodity_name || EUDR_CONSTANTS.DEFAULT_COMMODITY_NAME,
            scientific_name: scientific_name || EUDR_CONSTANTS.DEFAULT_SCIENTIFIC_NAME,
            quantity_net_mass_kg: quantity_net_mass_kg || 0,

            // Production details
            harvest_period,
            production_date: new Date().toISOString().split('T')[0],

            // EUDR Compliance
            geolocation: enrichedGeo,
            geolocation_hash: geolocationHash,
            deforestation_check: deforestationCheck,
            legality_documents: legalityDocuments || [],

            // Sensor data (initial)
            carbonFootprint: carbonFootprint || 0,
            sensor_aggregates: undefined,

            // Status
            compliance_status: complianceStatus,
            origin_farmers: (metadata?.farmers as string[]) || [],

            // Timestamps
            timestamp: new Date().toISOString(),
            mintedAt: new Date().toISOString(),

            // Spread any additional metadata
            ...metadata
        };

        // Upload metadata to IPFS
        const cid = await ipfsService.uploadJSON(batchMetadata, `batch-${Date.now()}`);
        const tokenUri = ipfsService.getGatewayUrl(cid);

        // Mint on blockchain with EUDR geolocationHash
        const result = await blockchainService.mintBatch(
            to,
            tokenUri,
            origin,
            supplierId,
            carbonFootprint || 0,
            geolocationHash
        );

        const response: MintBatchResponse = {
            success: true,
            tokenId: parseInt(result.tokenId),
            txHash: result.txHash,
            ipfsCid: cid,
            tokenUri,
            geolocationHash,
            compliance_status: complianceStatus
        };

        // Include validation warnings in response
        if (geoValidation.warnings.length > 0) {
            (response as any).warnings = geoValidation.warnings;
        }

        res.json(response);
    } catch (error: any) {
        console.error('Mint error:', error);
        res.status(500).json({ error: error.message || 'Failed to mint batch' });
    }
});

/**
 * Get batch details
 * GET /api/batch/:tokenId
 */
router.get('/:tokenId', async (req: Request, res: Response) => {
    try {
        const tokenId = parseInt(req.params.tokenId);

        if (isNaN(tokenId)) {
            return res.status(400).json({ error: 'Invalid token ID' });
        }

        const batch = await blockchainService.getBatch(tokenId);

        // Fetch IPFS metadata if available
        let ipfsMetadata = null;
        if (batch.tokenUri && batch.tokenUri.includes('ipfs')) {
            try {
                const cid = batch.tokenUri.split('/').pop();
                ipfsMetadata = await ipfsService.fetchFromIPFS(cid);
            } catch (e) {
                console.warn('Could not fetch IPFS metadata');
            }
        }

        res.json({
            ...batch,
            ipfsMetadata
        });
    } catch (error: any) {
        console.error('Get batch error:', error);
        res.status(500).json({ error: error.message || 'Failed to get batch' });
    }
});

/**
 * Update batch data (used by oracle/IoT)
 * POST /api/batch/:tokenId/update
 */
router.post('/:tokenId/update', async (req: Request, res: Response) => {
    try {
        const tokenId = parseInt(req.params.tokenId);
        const { temperature, humidity, carbonFootprint, historyNote, metadata } = req.body;

        if (isNaN(tokenId)) {
            return res.status(400).json({ error: 'Invalid token ID' });
        }

        let newUri = '';

        // If new metadata provided, upload to IPFS
        if (metadata) {
            const cid = await ipfsService.uploadJSON(metadata, `batch-update-${tokenId}-${Date.now()}`);
            newUri = ipfsService.getGatewayUrl(cid);
        }

        const txHash = await blockchainService.updateBatchData(
            tokenId,
            temperature || 0,
            humidity || 0,
            carbonFootprint || 0,
            historyNote || `Data update at ${new Date().toISOString()}`,
            newUri
        );

        res.json({
            success: true,
            txHash,
            newUri: newUri || undefined
        });
    } catch (error: any) {
        console.error('Update batch error:', error);
        res.status(500).json({ error: error.message || 'Failed to update batch' });
    }
});

/**
 * Transfer custody
 * POST /api/batch/:tokenId/transfer
 */
router.post('/:tokenId/transfer', async (req: Request, res: Response) => {
    try {
        const tokenId = parseInt(req.params.tokenId);
        const { nextHolder, historyNote } = req.body;

        if (isNaN(tokenId) || !nextHolder) {
            return res.status(400).json({ error: 'Invalid token ID or missing nextHolder' });
        }

        const txHash = await blockchainService.transferCustody(
            tokenId,
            nextHolder,
            historyNote || `Custody transferred to ${nextHolder}`
        );

        res.json({
            success: true,
            txHash
        });
    } catch (error: any) {
        console.error('Transfer custody error:', error);
        res.status(500).json({ error: error.message || 'Failed to transfer custody' });
    }
});

/**
 * Check compliance
 * GET /api/batch/:tokenId/compliance
 */
router.get('/:tokenId/compliance', async (req: Request, res: Response) => {
    try {
        const tokenId = parseInt(req.params.tokenId);
        const maxCarbon = parseInt(req.query.maxCarbon as string) || 10000; // Default 10kg CO2

        if (isNaN(tokenId)) {
            return res.status(400).json({ error: 'Invalid token ID' });
        }

        const isCompliant = await blockchainService.checkCompliance(tokenId, maxCarbon);

        // Also fetch EUDR compliance status from IPFS
        let eudrStatus = null;
        try {
            const batch = await blockchainService.getBatch(tokenId);
            if (batch.tokenUri && batch.tokenUri.includes('ipfs')) {
                const cid = batch.tokenUri.split('/').pop();
                const metadata = await ipfsService.fetchFromIPFS(cid);
                eudrStatus = {
                    compliance_status: metadata.compliance_status,
                    has_geolocation: !!metadata.geolocation?.features?.length,
                    deforestation_free: metadata.deforestation_check?.status,
                    legality_documents_count: metadata.legality_documents?.length || 0
                };
            }
        } catch (e) {
            console.warn('Could not fetch EUDR status');
        }

        res.json({
            tokenId,
            maxCarbon,
            isCompliant,
            eudr: eudrStatus
        });
    } catch (error: any) {
        console.error('Compliance check error:', error);
        res.status(500).json({ error: error.message || 'Failed to check compliance' });
    }
});

/**
 * Validate geolocation (helper endpoint)
 * POST /api/batch/validate-geolocation
 */
router.post('/validate-geolocation', async (req: Request, res: Response) => {
    try {
        const { geolocation } = req.body;

        if (!geolocation) {
            return res.status(400).json({ error: 'Missing geolocation field' });
        }

        const validation = geojsonService.validateGeoJSON(geolocation);

        res.json({
            ...validation,
            geolocation_hash: validation.valid
                ? geojsonService.computeGeolocationHash(
                    geojsonService.normalizeToFeatureCollection(geolocation) as EUDRFeatureCollection
                )
                : null
        });
    } catch (error: any) {
        console.error('Geolocation validation error:', error);
        res.status(500).json({ error: error.message || 'Failed to validate geolocation' });
    }
});

export default router;
