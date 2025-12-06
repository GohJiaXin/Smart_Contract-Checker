// test/Integration.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContractsFixture, encodeFunctionCall, mineBlocks } = require("./helpers");

describe("Full System Integration", function() {
  
  it("Should complete full threat lifecycle", async function() {
    const { 
      immunityLayer, 
      bank, 
      malicious, 
      owner, 
      aiOperator,
      aiOracle,
      THREAT_LEVELS 
    } = await deployContractsFixture();
    
    // 1. Setup: Deposit funds
    await bank.connect(owner).deposit({ value: ethers.utils.parseEther("5.0") });
    
    // 2. Attack: Try reentrancy
    const attackData = encodeFunctionCall(malicious, "startReentrancyAttack", [
      ethers.utils.parseEther("5.0")
    ]);
    
    // 3. Detection: Should be detected and frozen
    await expect(
      immunityLayer.protectedCall(bank.address, attackData, { value: 0 })
    ).to.be.revertedWith("Transaction frozen for security review");
    
    const threatId = await getThreatId(bank.address, malicious.address, attackData);
    
    // 4. AI Analysis: Submit analysis (simulated)
    await aiOracle.connect(aiOperator).submitAnalysis(
      threatId,
      "Reentrancy vulnerability detected. Attacker attempting to drain funds.",
      "revert",
      true
    );
    
    // 5. Mitigation: Owner reviews and takes action
    await immunityLayer.connect(owner).executeOwnerOverride(threatId, "revert");
    
    // 6. Verification: Check funds are safe
    const bankBalance = await ethers.provider.getBalance(bank.address);
    expect(bankBalance).to.equal(ethers.utils.parseEther("5.0"));
    
    // Check threat is marked as mitigated
    const threatDetails = await immunityLayer.getThreatDetails(threatId);
    expect(threatDetails.isMitigated).to.be.true;
  });
  
  it("Should handle multiple protected contracts", async function() {
    const { immunityLayer, owner } = await deployContractsFixture();
    
    // Deploy multiple contracts
    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    
    const banks = [];
    for (let i = 0; i < 3; i++) {
      const bank = await VulnerableBank.deploy(immunityLayer.address);
      await bank.deployed();
      banks.push(bank);
      
      await immunityLayer.connect(owner).addContractProtection(bank.address, 2);
      
      // Deposit to each
      await bank.connect(owner).deposit({ 
        value: ethers.utils.parseEther("1.0") 
      });
    }
    
    // Verify all are protected
    for (const bank of banks) {
      expect(await immunityLayer.isContractProtected(bank.address)).to.be.true;
    }
  });
  
  it("Should expire freeze after duration", async function() {
    const { immunityLayer, bank, malicious, owner } = await deployContractsFixture();
    
    await bank.connect(owner).deposit({ value: ethers.utils.parseEther("1.0") });
    
    const attackData = encodeFunctionCall(malicious, "simulateAttack", []);
    
    // First attempt - should freeze
    await expect(
      immunityLayer.protectedCall(bank.address, attackData, { value: 0 })
    ).to.be.revertedWith("Transaction frozen for security review");
    
    const threatId = await getThreatId(bank.address, malicious.address, attackData);
    
    // Mine blocks to expire freeze duration
    await mineBlocks(50); // Default freeze is 30 blocks
    
    // After freeze expires, should be able to execute override
    await immunityLayer.connect(owner).executeOwnerOverride(threatId, "safe_execute");
    
    const threatDetails = await immunityLayer.getThreatDetails(threatId);
    expect(threatDetails.isMitigated).to.be.true;
  });
});