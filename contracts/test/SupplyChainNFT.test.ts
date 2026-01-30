import { expect } from "chai";
import { ethers } from "hardhat";
import { SupplyChainNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SupplyChainNFT", function () {
    let contract: SupplyChainNFT;
    let owner: SignerWithAddress;
    let minter: SignerWithAddress;
    let user: SignerWithAddress;

    beforeEach(async function () {
        [owner, minter, user] = await ethers.getSigners();

        const SupplyChainNFT = await ethers.getContractFactory("SupplyChainNFT");
        contract = await SupplyChainNFT.deploy();
        await contract.waitForDeployment();

        // Grant minter role
        const MINTER_ROLE = await contract.MINTER_ROLE();
        await contract.grantRole(MINTER_ROLE, minter.address);
    });

    describe("Minting", function () {
        it("Should mint a new batch", async function () {
            const tx = await contract.connect(minter).mintBatch(
                user.address,
                "ipfs://test-uri",
                "Lagos, Nigeria",
                "NGR-001",
                2500
            );

            await tx.wait();

            expect(await contract.ownerOf(0)).to.equal(user.address);
            expect(await contract.tokenURI(0)).to.equal("ipfs://test-uri");
        });

        it("Should store batch data correctly", async function () {
            await contract.connect(minter).mintBatch(
                user.address,
                "ipfs://test",
                "Lagos, Nigeria",
                "NGR-001",
                2500
            );

            const batch = await contract.batches(0);
            expect(batch.origin).to.equal("Lagos, Nigeria");
            expect(batch.supplierId).to.equal("NGR-001");
            expect(batch.carbonFootprint).to.equal(2500);
        });

        it("Should fail without minter role", async function () {
            await expect(
                contract.connect(user).mintBatch(
                    user.address,
                    "ipfs://test",
                    "Lagos",
                    "NGR-001",
                    100
                )
            ).to.be.reverted;
        });
    });

    describe("Updates", function () {
        beforeEach(async function () {
            await contract.connect(minter).mintBatch(
                user.address,
                "ipfs://test",
                "Lagos, Nigeria",
                "NGR-001",
                2500
            );
        });

        it("Should update batch data", async function () {
            await contract.updateBatchData(0, 250, 650, 100, "Temp update", "");

            const batch = await contract.batches(0);
            expect(batch.temperature).to.equal(250);
            expect(batch.humidity).to.equal(650);
            expect(batch.carbonFootprint).to.equal(2600); // 2500 + 100
        });

        it("Should add to history", async function () {
            await contract.updateBatchData(0, 250, 650, 0, "Test note", "");

            const history = await contract.getBatchHistory(0);
            expect(history).to.include("Test note");
        });
    });

    describe("Custody Transfer", function () {
        beforeEach(async function () {
            await contract.connect(minter).mintBatch(
                user.address,
                "ipfs://test",
                "Lagos",
                "NGR-001",
                2500
            );
        });

        it("Should transfer custody", async function () {
            await contract.connect(user).transferCustody(0, "Manufacturer", "Shipped");

            const batch = await contract.batches(0);
            expect(batch.currentHolder).to.equal("Manufacturer");
        });
    });

    describe("Compliance", function () {
        beforeEach(async function () {
            await contract.connect(minter).mintBatch(
                user.address,
                "ipfs://test",
                "Lagos",
                "NGR-001",
                2500
            );
        });

        it("Should check compliance correctly", async function () {
            expect(await contract.checkCompliance(0, 3000)).to.be.true;
            expect(await contract.checkCompliance(0, 2000)).to.be.false;
        });
    });
});
