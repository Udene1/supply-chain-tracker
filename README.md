# Supply Chain Tracker for Sustainable Manufacturing

A blockchain-enabled supply chain tracking system built on Base (Ethereum L2) for tracking cocoa batches from Nigerian suppliers to German manufacturers with transparency, sustainability compliance, and immutability.

## Tech Stack

- **Smart Contracts**: Solidity, Hardhat, OpenZeppelin (ERC-721)
- **Backend**: Node.js, Express, TypeScript, ethers.js
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Recharts
- **Blockchain**: Base Sepolia (testnet) / Base Mainnet
- **Storage**: IPFS (via Pinata)

## Project Structure

```
supply-chain-tracker/
├── contracts/          # Solidity smart contracts
│   ├── contracts/      # Contract source files
│   ├── scripts/        # Deployment scripts
│   └── test/           # Contract tests
├── backend/            # Express API server
│   └── src/
│       ├── routes/     # API endpoints
│       └── services/   # Blockchain & IPFS services
├── frontend/           # React dashboard
│   └── src/
│       ├── components/ # UI components
│       ├── pages/      # Page components
│       ├── hooks/      # Custom React hooks
│       └── services/   # API client
└── scripts/            # Utility scripts
```

## Quick Start

### Prerequisites

- Node.js 18+
- MetaMask wallet
- Base Sepolia ETH (from faucet)

### 1. Clone and Install

```bash
# Install contract dependencies
cd contracts
npm install

# Install backend dependencies
cd ../backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# contracts/.env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_wallet_private_key
BASESCAN_API_KEY=your_basescan_api_key

# backend/.env
PORT=3001
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=deployed_contract_address
PINATA_JWT=your_pinata_jwt
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs
```

### 3. Deploy Contracts

```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network base-sepolia
```

### 4. Run Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

## API Endpoints

### Batch Management
- `POST /api/batch/mint` - Mint new batch NFT
- `GET /api/batch/:tokenId` - Get batch details
- `POST /api/batch/:tokenId/update` - Update batch data
- `POST /api/batch/:tokenId/transfer` - Transfer custody
- `GET /api/batch/:tokenId/compliance` - Check compliance

### IoT Simulation
- `POST /api/iot/data` - Receive sensor data
- `POST /api/iot/simulate/:tokenId` - Simulate IoT sensors
- `POST /api/iot/aggregate/:tokenId` - Aggregate and push to chain
- `GET /api/iot/buffer/:tokenId` - Get buffered data

## Smart Contract Features

- **ERC-721 NFTs**: Each batch is a unique NFT
- **Role-Based Access**: MINTER_ROLE, ORACLE_ROLE via OpenZeppelin
- **Batch Data**: Origin, supplier, carbon footprint, temperature, humidity
- **History Tracking**: Immutable on-chain history
- **Compliance Checks**: Carbon threshold verification

## Deployment

### Contract Verification
```bash
npx hardhat verify --network base-sepolia CONTRACT_ADDRESS
```

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
```

### Backend (Render/Heroku)
```bash
cd backend
npm run build
# Deploy with start command: node dist/index.js
```

## Base Network Config

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Base Sepolia | 84532 | https://sepolia.base.org |
| Base Mainnet | 8453 | https://mainnet.base.org |

## License

MIT
