import { ethers, waffle } from "hardhat";
import { use, expect } from "chai";
import { MyToken } from "../typechain";
import { setupUsers } from "./utils";
import { BigNumber } from "ethers";
import { waitForDebugger } from "inspector";
import Web3 from "web3";
use(waffle.solidity);

type User = { address: string } & { nft: MyToken };

describe("MyToken.sol", async () => {
    let users: User[],
        owner: User,
        admin: User,
        user1: User,
        user2: User,
        user3: User,
        user4: User,
        user5: User,
        user6: User,
        nft: MyToken;
    beforeEach(async () => {
        const batchSize = 5;
        const collectionSize = 10000;
        const signers = await ethers.getSigners();
        // VESTING
        const myTokenFactory = await ethers.getContractFactory("MyToken");
        nft = (await (
            await myTokenFactory.deploy(batchSize, collectionSize)
        ).deployed()) as MyToken;
        // USERS
        const addresses = await Promise.all(signers.map(async (signer) => signer.getAddress()));
        users = await setupUsers(addresses, { nft });
        owner = users[0];
        admin = users[1];
        user1 = users[2];
        user2 = users[3];
        user3 = users[4];
        user4 = users[5];
        user5 = users[6];
        user6 = users[7];
        await (await owner.nft.setAdmin(admin.address, true)).wait();
    });
    describe("Access Tests", async () => {
        it("owner should be able to set admin", async () => {
            const newAdmin = users[2];
            await expect(owner.nft.setAdmin(newAdmin.address, true)).to.emit(nft, "AdminAccessSet");
            const isAdmin = await owner.nft.isAdmin(newAdmin.address);
            expect(isAdmin).to.be.equal(true);
        });
        it("owner should be able to revoke admin", async () => {
            await expect(owner.nft.setAdmin(admin.address, false)).to.emit(nft, "AdminAccessSet");
            const isAdmin = await owner.nft.isAdmin(admin.address);
            expect(isAdmin).to.be.equal(false);
        });
        it("admin should not be able to set admin", async () => {
            const newAdmin = users[2];
            await expect(admin.nft.setAdmin(newAdmin.address, true)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });
        it("user should not be able to set admin", async () => {
            const user = users[2];
            const newAdmin = users[3];
            await expect(user.nft.setAdmin(newAdmin.address, true)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });
    });
    describe("MyToken", async () => {
        it("Owner should be able to mint before sale and without mint fee", async () => {
            const quantity = 5;
            await owner.nft.teamMint(
                quantity
            )
            const totalSupply = await nft.totalSupply()
            await expect(totalSupply).to.be.equal(5);
        });
        it("Owner should be able to mint more than 200 NFT before sale and without mint fee", async () => {
            const quantity = 5;
            for (let i = 0; i < 40; i++) {
                await owner.nft.teamMint(
                    quantity
                )
            }
            await expect(owner.nft.teamMint(quantity)).to.be.revertedWith("More than 200 NFTs cannot be minted");
        });
        it("Owner should be able to start sale", async () => {
            await expect(owner.nft.enableSale()).to.emit(nft, "enabled");
        });
        it("Whitelisted user should be able to mint in early sale", async () => {
            const quantity = 5;
            const whitelistedUser = users[3];
            const ethAmount = "2";
            const weiAmount = ethers.utils.parseEther(ethAmount);
            const transaction = {
                value: weiAmount,
            };
            await expect(owner.nft.enableSale()).to.emit(nft, "enabled");
            await owner.nft.addToWhitelist(whitelistedUser.address)
            // FOR UPDATING BLOCK
            await ethers.provider.send("evm_setNextBlockTimestamp", [Date.now() + 1800]);
            await ethers.provider.send("evm_mine", []);
            await whitelistedUser.nft.mint(quantity, transaction)
        });
        it("user should not be able to mint in early sale", async () => {
            const quantity = 5;
            const beneficiary = users[4];
            const ethAmount = "2";
            const weiAmount = ethers.utils.parseEther(ethAmount);
            const transaction = {
                value: weiAmount,
            };
            await expect(owner.nft.enableSale()).to.emit(nft, "enabled");
            // FOR UPDATING BLOCK
            await ethers.provider.send("evm_setNextBlockTimestamp", [Date.now() + 1800]);
            await ethers.provider.send("evm_mine", []);
            await expect(beneficiary.nft.mint(quantity, transaction)).to.be.revertedWith("not eligible for whiteList mint")
        });
        it("user should be able to mint in public sale", async () => {
            const quantity = 5;
            const beneficiary = users[4];
            const ethAmount = "2";
            const weiAmount = ethers.utils.parseEther(ethAmount);
            const transaction = {
                value: weiAmount,
            };
            await expect(owner.nft.enableSale()).to.emit(nft, "enabled");
            // FOR UPDATING BLOCK
            await ethers.provider.send("evm_setNextBlockTimestamp", [Date.now() + 96450]);
            await ethers.provider.send("evm_mine", []);
            await beneficiary.nft.mint(quantity, transaction)
        });
        it("owner should be able to withdraw ether from contract", async () => {
            const provider = waffle.provider;
            const quantity = 5;
            const beneficiary = users[4];
            const ethAmount = "2";
            const weiAmount = ethers.utils.parseEther(ethAmount);
            const transaction = {
                value: weiAmount,
            };
            await expect(owner.nft.enableSale()).to.emit(nft, "enabled");
            // FOR UPDATING BLOCK
            await ethers.provider.send("evm_setNextBlockTimestamp", [Date.now() + 96450]);
            await ethers.provider.send("evm_mine", []);
            await owner.nft.addToWhitelist(beneficiary.address)
            await beneficiary.nft.mint(quantity, transaction)
            const contractBalance = await ethers.provider.getBalance(nft.address);
            // Withdraw
            await (await owner.nft.withdrawMoney()).wait();
            const walletBalance_new = await ethers.provider.getBalance(owner.address);
            const contractBalance_new = await ethers.provider.getBalance(nft.address);

            expect(contractBalance_new).to.be.equal(0);
        });
    });
});
