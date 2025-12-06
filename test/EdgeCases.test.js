// test/EdgeCases.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContractsFixture } = require("./helpers");

describe("Edge Cases", function() {
  
  it("Should handle zero-value transactions", async function() {
    const { immunityLayer, bank, user1 } = await deployContractsFixture();
    
    // Call with zero value
    const data = ethers.utils.hexlify(ethers.utils.randomBytes(100)); // Random data
    
    // Should handle gracefully
    await expect(
      immunityLayer.connect(user1).protectedCall(
        bank.address,
        data,
        { value: 0 }
      )
    ).to.be.reverted; // Reverted by bank, not immunity layer
  });
  
  it("Should handle large calldata", async function() {
    const { immunityLayer, bank, user1 } = await deployContractsFixture();
    
    // Create large calldata (10KB)
    let largeData = "0x";
    for (let i = 0; i < 10000; i++) {
      largeData += "00";
    }
    
    // Should not revert due to size
    await expect(
      immunityLayer.connect(user1).protectedCall(
        bank.address,
        largeData,
        { value: 0 }
      )
    ).to.not.be.revertedWith("Transaction too large");
  });
  
  it("Should handle reentrancy in immunity layer itself", async function() {
    const { immunityLayer, owner } = await deployContractsFixture();
    
    // Try to call immunity layer from within a callback
    const ReentrancyTester = await ethers.getContractFactory("ReentrancyTester");
    const tester = await ReentrancyTester.deploy(immunityLayer.address);
    
    await expect(
      tester.testReentrancy()
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
  });
  
  it("Should handle unregistered contracts", async function() {
    const { immunityLayer, user1 } = await deployContractsFixture();
    
    const RandomContract = await ethers.getContractFactory("RandomContract");
    const random = await RandomContract.deploy();
    
    await expect(
      immunityLayer.connect(user1).protectedCall(
        random.address,
        "0x",
        { value: 0 }
      )
    ).to.be.revertedWith("Target not protected");
  });
});