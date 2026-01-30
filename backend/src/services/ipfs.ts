import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface PinataResponse {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
}

class IPFSService {
    private pinataJWT: string;
    private gatewayUrl: string;

    constructor() {
        this.pinataJWT = process.env.PINATA_JWT || '';
        this.gatewayUrl = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
    }

    async uploadJSON(data: object, name: string): Promise<string> {
        if (!this.pinataJWT) {
            console.warn('Pinata JWT not configured, returning mock CID');
            return `mock-cid-${Date.now()}`;
        }

        try {
            const response = await axios.post<PinataResponse>(
                'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                {
                    pinataContent: data,
                    pinataMetadata: { name }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.pinataJWT}`
                    }
                }
            );

            return response.data.IpfsHash;
        } catch (error) {
            console.error('IPFS upload error:', error);
            throw new Error('Failed to upload to IPFS');
        }
    }

    async uploadFile(file: Buffer, name: string): Promise<string> {
        if (!this.pinataJWT) {
            console.warn('Pinata JWT not configured, returning mock CID');
            return `mock-cid-file-${Date.now()}`;
        }

        const FormData = (await import('form-data')).default;
        const formData = new FormData();
        formData.append('file', file, { filename: name });
        formData.append('pinataMetadata', JSON.stringify({ name }));

        try {
            const response = await axios.post<PinataResponse>(
                'https://api.pinata.cloud/pinning/pinFileToIPFS',
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${this.pinataJWT}`,
                        ...formData.getHeaders()
                    },
                    maxBodyLength: Infinity
                }
            );

            return response.data.IpfsHash;
        } catch (error) {
            console.error('IPFS file upload error:', error);
            throw new Error('Failed to upload file to IPFS');
        }
    }

    getGatewayUrl(cid: string): string {
        return `${this.gatewayUrl}/${cid}`;
    }

    async fetchFromIPFS(cid: string): Promise<any> {
        try {
            const response = await axios.get(this.getGatewayUrl(cid));
            return response.data;
        } catch (error) {
            console.error('IPFS fetch error:', error);
            throw new Error('Failed to fetch from IPFS');
        }
    }
}

export const ipfsService = new IPFSService();
