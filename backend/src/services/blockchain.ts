import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Contract ABI - Updated for EUDR compliance with geolocationHash
const contractABI = [
    "function mintBatch(address to, string memory uri, string memory origin, string memory supplierId, uint256 carbonFootprint, bytes32 geolocationHash) public returns (uint256)",
    "function mintBatchLegacy(address to, string memory uri, string memory origin, string memory supplierId, uint256 carbonFootprint) public returns (uint256)",
    "function updateBatchData(uint256 tokenId, int256 temperature, uint256 humidity, uint256 carbonFootprint, string memory historyNote, string memory newUri) public",
    "function updateGeolocation(uint256 tokenId, bytes32 newGeolocationHash, string memory newUri) public",
    "function transferCustody(uint256 tokenId, string memory nextHolder, string memory historyNote) public",
    "function getBatchHistory(uint256 tokenId) public view returns (string[] memory)",
    "function batches(uint256 tokenId) public view returns (string origin, uint256 timestamp, string supplierId, uint256 carbonFootprint, int256 temperature, uint256 humidity, bool complianceStatus, string currentHolder, bytes32 geolocationHash)",
    "function checkCompliance(uint256 tokenId, uint256 maxCarbon) public view returns (bool)",
    "function getGeolocationHash(uint256 tokenId) public view returns (bytes32)",
    "function hasGeolocation(uint256 tokenId) public view returns (bool)",
    "function ownerOf(uint256 tokenId) public view returns (address)",
    "function tokenURI(uint256 tokenId) public view returns (string memory)",
    "event BatchMinted(uint256 indexed tokenId, string origin, string supplierId, bytes32 geolocationHash)",
    "event BatchDataUpdated(uint256 indexed tokenId, int256 temperature, uint256 humidity, uint256 carbonFootprint)",
    "event MetadataUpdated(uint256 indexed tokenId, string newUri, bytes32 geolocationHash)",
    "event GeolocationUpdated(uint256 indexed tokenId, bytes32 newGeolocationHash)",
    "event CustodyTransferred(uint256 indexed tokenId, string nextHolder)"
];

class BlockchainService {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private contract: ethers.Contract;

    constructor() {
        const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
        const privateKey = process.env.PRIVATE_KEY;
        const contractAddress = process.env.CONTRACT_ADDRESS;

        if (!privateKey || !contractAddress) {
            throw new Error('Missing PRIVATE_KEY or CONTRACT_ADDRESS in environment');
        }

        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet);
    }

    async mintBatch(
        to: string,
        uri: string,
        origin: string,
        supplierId: string,
        carbonFootprint: number,
        geolocationHash: string = '0x' + '0'.repeat(64)
    ): Promise<{ tokenId: string; txHash: string }> {
        const tx = await this.contract.mintBatch(to, uri, origin, supplierId, carbonFootprint, geolocationHash);
        const receipt = await tx.wait();

        // Find the BatchMinted event to get tokenId
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = this.contract.interface.parseLog(log);
                return parsed?.name === 'BatchMinted';
            } catch {
                return false;
            }
        });

        const parsedEvent = this.contract.interface.parseLog(event);
        const tokenId = parsedEvent?.args[0].toString() || '0';

        return { tokenId, txHash: receipt.hash };
    }

    /**
     * Mint batch without geolocation (legacy support)
     */
    async mintBatchLegacy(
        to: string,
        uri: string,
        origin: string,
        supplierId: string,
        carbonFootprint: number
    ): Promise<{ tokenId: string; txHash: string }> {
        const tx = await this.contract.mintBatchLegacy(to, uri, origin, supplierId, carbonFootprint);
        const receipt = await tx.wait();

        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = this.contract.interface.parseLog(log);
                return parsed?.name === 'BatchMinted';
            } catch {
                return false;
            }
        });

        const parsedEvent = this.contract.interface.parseLog(event);
        const tokenId = parsedEvent?.args[0].toString() || '0';

        return { tokenId, txHash: receipt.hash };
    }

    async updateBatchData(
        tokenId: number,
        temperature: number,
        humidity: number,
        carbonFootprint: number,
        historyNote: string,
        newUri: string = ''
    ): Promise<string> {
        const tx = await this.contract.updateBatchData(
            tokenId,
            Math.round(temperature * 10), // Store as integer (Celsius * 10)
            Math.round(humidity * 10),    // Store as integer (% * 10)
            carbonFootprint,
            historyNote,
            newUri
        );
        const receipt = await tx.wait();
        return receipt.hash;
    }

    async transferCustody(
        tokenId: number,
        nextHolder: string,
        historyNote: string
    ): Promise<string> {
        const tx = await this.contract.transferCustody(tokenId, nextHolder, historyNote);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    async getBatch(tokenId: number): Promise<any> {
        const batch = await this.contract.batches(tokenId);
        const history = await this.contract.getBatchHistory(tokenId);
        const owner = await this.contract.ownerOf(tokenId);
        const tokenUri = await this.contract.tokenURI(tokenId);

        return {
            tokenId,
            origin: batch.origin,
            timestamp: Number(batch.timestamp),
            supplierId: batch.supplierId,
            carbonFootprint: Number(batch.carbonFootprint),
            temperature: Number(batch.temperature) / 10,
            humidity: Number(batch.humidity) / 10,
            complianceStatus: batch.complianceStatus,
            currentHolder: batch.currentHolder,
            geolocationHash: batch.geolocationHash,
            owner,
            tokenUri,
            history
        };
    }

    /**
     * Update geolocation hash for EUDR compliance
     */
    async updateGeolocation(
        tokenId: number,
        newGeolocationHash: string,
        newUri: string = ''
    ): Promise<string> {
        const tx = await this.contract.updateGeolocation(tokenId, newGeolocationHash, newUri);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    /**
     * Check if batch has geolocation data
     */
    async hasGeolocation(tokenId: number): Promise<boolean> {
        return await this.contract.hasGeolocation(tokenId);
    }

    async checkCompliance(tokenId: number, maxCarbon: number): Promise<boolean> {
        return await this.contract.checkCompliance(tokenId, maxCarbon);
    }

    getContractAddress(): string {
        return process.env.CONTRACT_ADDRESS || '';
    }
}

export const blockchainService = new BlockchainService();
