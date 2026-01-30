import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchain';
import { ipfsService } from '../services/ipfs';

const router = Router();

// Store for simulated IoT data (in production, use a proper database)
const iotDataBuffer: Map<number, any[]> = new Map();

// Receive IoT sensor data
router.post('/data', async (req: Request, res: Response) => {
    try {
        const { tokenId, deviceId, temperature, humidity, location, timestamp } = req.body;

        if (!tokenId || temperature === undefined || humidity === undefined) {
            return res.status(400).json({
                error: 'Missing required fields: tokenId, temperature, humidity'
            });
        }

        const dataPoint = {
            deviceId: deviceId || 'unknown',
            temperature,
            humidity,
            location: location || null,
            timestamp: timestamp || new Date().toISOString(),
            receivedAt: new Date().toISOString()
        };

        // Buffer the data
        if (!iotDataBuffer.has(tokenId)) {
            iotDataBuffer.set(tokenId, []);
        }
        iotDataBuffer.get(tokenId)!.push(dataPoint);

        console.log(`📡 IoT data received for batch ${tokenId}:`, dataPoint);

        res.json({
            success: true,
            message: 'Data received and buffered',
            dataPoint
        });
    } catch (error: any) {
        console.error('IoT data error:', error);
        res.status(500).json({ error: error.message || 'Failed to process IoT data' });
    }
});

// Aggregate and push buffered data to blockchain (oracle function)
router.post('/aggregate/:tokenId', async (req: Request, res: Response) => {
    try {
        const tokenId = parseInt(req.params.tokenId);

        if (isNaN(tokenId)) {
            return res.status(400).json({ error: 'Invalid token ID' });
        }

        const buffer = iotDataBuffer.get(tokenId);

        if (!buffer || buffer.length === 0) {
            return res.status(404).json({ error: 'No buffered data for this batch' });
        }

        // Calculate averages
        const avgTemp = buffer.reduce((sum, d) => sum + d.temperature, 0) / buffer.length;
        const avgHumidity = buffer.reduce((sum, d) => sum + d.humidity, 0) / buffer.length;

        // Estimate carbon footprint based on transport (simplified)
        const carbonEstimate = buffer.length * 10; // 10g CO2 per data point (mock)

        // Create aggregated metadata
        const aggregatedData = {
            tokenId,
            dataPoints: buffer.length,
            averageTemperature: Math.round(avgTemp * 10) / 10,
            averageHumidity: Math.round(avgHumidity * 10) / 10,
            carbonEstimate,
            aggregatedAt: new Date().toISOString(),
            rawData: buffer
        };

        // Upload to IPFS
        const cid = await ipfsService.uploadJSON(
            aggregatedData,
            `iot-aggregate-${tokenId}-${Date.now()}`
        );

        // Update blockchain
        const txHash = await blockchainService.updateBatchData(
            tokenId,
            avgTemp,
            avgHumidity,
            carbonEstimate,
            `IoT data aggregated: ${buffer.length} data points`,
            ipfsService.getGatewayUrl(cid)
        );

        // Clear buffer
        iotDataBuffer.delete(tokenId);

        res.json({
            success: true,
            txHash,
            ipfsCid: cid,
            summary: {
                dataPoints: buffer.length,
                averageTemperature: avgTemp,
                averageHumidity: avgHumidity,
                carbonEstimate
            }
        });
    } catch (error: any) {
        console.error('Aggregate error:', error);
        res.status(500).json({ error: error.message || 'Failed to aggregate IoT data' });
    }
});

// Get buffered data for a batch
router.get('/buffer/:tokenId', (req: Request, res: Response) => {
    const tokenId = parseInt(req.params.tokenId);

    if (isNaN(tokenId)) {
        return res.status(400).json({ error: 'Invalid token ID' });
    }

    const buffer = iotDataBuffer.get(tokenId) || [];

    res.json({
        tokenId,
        dataPoints: buffer.length,
        data: buffer
    });
});

// Simulate IoT device sending data
router.post('/simulate/:tokenId', async (req: Request, res: Response) => {
    try {
        const tokenId = parseInt(req.params.tokenId);
        const { count = 5 } = req.body;

        if (isNaN(tokenId)) {
            return res.status(400).json({ error: 'Invalid token ID' });
        }

        const simulatedData = [];

        for (let i = 0; i < count; i++) {
            const dataPoint = {
                deviceId: `ESP32-${Math.random().toString(36).slice(2, 8)}`,
                temperature: 20 + Math.random() * 15, // 20-35°C
                humidity: 40 + Math.random() * 40,    // 40-80%
                location: {
                    lat: 6.5244 + (Math.random() - 0.5) * 0.1, // Around Lagos, Nigeria
                    lng: 3.3792 + (Math.random() - 0.5) * 0.1
                },
                timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
            };

            if (!iotDataBuffer.has(tokenId)) {
                iotDataBuffer.set(tokenId, []);
            }
            iotDataBuffer.get(tokenId)!.push({
                ...dataPoint,
                receivedAt: new Date().toISOString()
            });

            simulatedData.push(dataPoint);
        }

        res.json({
            success: true,
            message: `Simulated ${count} IoT data points for batch ${tokenId}`,
            data: simulatedData
        });
    } catch (error: any) {
        console.error('Simulation error:', error);
        res.status(500).json({ error: error.message || 'Failed to simulate IoT data' });
    }
});

export default router;
