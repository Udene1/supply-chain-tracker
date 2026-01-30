import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchain';
import { ipfsService } from '../services/ipfs';

const router = Router();

// Mint a new batch
router.post('/mint', async (req: Request, res: Response) => {
    try {
        const { to, origin, supplierId, carbonFootprint, metadata } = req.body;

        if (!to || !origin || !supplierId) {
            return res.status(400).json({ error: 'Missing required fields: to, origin, supplierId' });
        }

        // Upload metadata to IPFS
        const batchMetadata = {
            name: `Cocoa Batch - ${origin}`,
            description: `Sustainable cocoa batch from ${origin}`,
            origin,
            supplierId,
            carbonFootprint: carbonFootprint || 0,
            timestamp: new Date().toISOString(),
            ...metadata
        };

        const cid = await ipfsService.uploadJSON(batchMetadata, `batch-${Date.now()}`);
        const tokenUri = ipfsService.getGatewayUrl(cid);

        // Mint on blockchain
        const result = await blockchainService.mintBatch(
            to,
            tokenUri,
            origin,
            supplierId,
            carbonFootprint || 0
        );

        res.json({
            success: true,
            tokenId: result.tokenId,
            txHash: result.txHash,
            ipfsCid: cid,
            tokenUri
        });
    } catch (error: any) {
        console.error('Mint error:', error);
        res.status(500).json({ error: error.message || 'Failed to mint batch' });
    }
});

// Get batch details
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

// Update batch data (used by oracle/IoT)
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

// Transfer custody
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

// Check compliance
router.get('/:tokenId/compliance', async (req: Request, res: Response) => {
    try {
        const tokenId = parseInt(req.params.tokenId);
        const maxCarbon = parseInt(req.query.maxCarbon as string) || 10000; // Default 10kg CO2

        if (isNaN(tokenId)) {
            return res.status(400).json({ error: 'Invalid token ID' });
        }

        const isCompliant = await blockchainService.checkCompliance(tokenId, maxCarbon);

        res.json({
            tokenId,
            maxCarbon,
            isCompliant
        });
    } catch (error: any) {
        console.error('Compliance check error:', error);
        res.status(500).json({ error: error.message || 'Failed to check compliance' });
    }
});

export default router;
