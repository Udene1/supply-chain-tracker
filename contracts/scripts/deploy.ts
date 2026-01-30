import { ethers } from "hardhat";

async function main() {
    console.log("Deploying SupplyChainNFT...");

    const SupplyChainNFT = await ethers.getContractFactory("SupplyChainNFT");
    const contract = await SupplyChainNFT.deploy();

    await contract.waitForDeployment();

    console.log(`SupplyChainNFT deployed to: ${await contract.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
