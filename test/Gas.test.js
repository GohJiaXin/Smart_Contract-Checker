// test/Gas.test.js
const { expect } = require("chai");
const { deployContractsFixture, encodeFunctionCall } = require("./helpers");

describe("Gas Usage Analysis", function() {
  
  it("Should have reasonable gas costs for normal operations", async function() {
    const { immunityLayer, bank, user1 } = await deployContractsFixture();
    
    // Test deposit gas cost
    const depositData = encodeFunctionCall(bank, "deposit", []);
    
    const tx = await immunityLayer.connect(user1).protectedCall(
      bank.address,
      depositData,
      { value: ethers.utils.parseEther("0.1") }
    );
    
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed;
    
    console.log(`Gas used for protected deposit: ${gasUsed}`);
    
    // Expect gas to be reasonable (under 200k for simple operation)
    expect(gasUsed).to.be.lessThan(200000);
  });
  
  it("Should not have excessive overhead for threat detection", async function() {
    const { immunityLayer, bank, malicious } = await deployContractsFixture();
    
    const attackData = encodeFunctionCall(malicious, "simulateAttack", []);
    
    // Estimate gas for attack detection
    const gasEstimate = await immunityLayer.estimateGas.protectedCall(
      bank.address,
      attackData,
      { value: 0 }
    );
    
    console.log(`Gas estimate for threat detection: ${gasEstimate}`);
    
    // Detection should add some overhead but not be excessive
    expect(gasEstimate).to.be.lessThan(300000);
  });
});