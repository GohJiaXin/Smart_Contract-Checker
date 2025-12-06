// test/Integration.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContractsFixture, encodeFunctionCall, mineBlocks } = require("./helpers");

describe("Full System Integration", function() {
  
  it("Should complete full threat lifecycle", async function() {
    const { 
      immunityLayer, 
      bank, 
      owner, 
      aiOperator,
      aiOracle
    } = await loadFixture(deployContractsFixture);
    
    // 1. Setup: Deposit funds
    const depositData = encodeFunctionCall(bank, "deposit", []);
    await immunityLayer.connect(owner).protectedCall(
      bank.address,
      depositData,
      { value: ethers.utils.parseEther("5.0") }
    );
    
    // 2. Deploy malicious contract to trigger detection
    const MockMalicious = await ethers.getContractFactory("MockMalicious");
    const attacker = await MockMalicious.deploy(bank.address);
    await attacker.deployed();
    
    // Fund attacker
    await owner.sendTransaction({
      to: attacker.address,
      value: ethers.utils.parseEther("0.1")
    });
    
    // 3. Try withdraw from malicious contract - should be detected
    const withdrawData = encodeFunctionCall(bank, "withdraw", [
      ethers.utils.parseEther("0.1")
    ]);
    
    // Call from owner but this will be detected as suspicious because of the function
    await expect(
      immunityLayer.connect(owner).protectedCall(bank.address, withdrawData, { value: 0 })
    ).to.be.revertedWith("Transaction frozen for security review");
    
    // Get threat ID
    const filter = immunityLayer.filters.ThreatDetected();
    const events = await immunityLayer.queryFilter(filter);
    const threatId = events[events.length - 1].args.threatId;
    
    // 4. AI Analysis: Submit analysis
    await aiOracle.connect(owner).submitAnalysis(
      threatId,
      "Reentrancy vulnerability detected. Attacker attempting to drain funds.",
      "revert",
      true
    );
    
    // 5. Mitigation: Owner reviews and takes action
    await immunityLayer.connect(owner).executeOwnerOverride(threatId, "revert");
    
    // 6. Verification: Check threat is marked as mitigated
    const threatDetails = await immunityLayer.getThreatDetails(threatId);
    expect(threatDetails.isMitigated).to.be.true;
  });
  
  it("Should handle multiple protected contracts", async function() {
    const { immunityLayer, owner } = await loadFixture(deployContractsFixture);
    
    // Deploy multiple contracts
    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    
    const banks = [];
    for (let i = 0; i < 3; i++) {
      const bank = await VulnerableBank.deploy(immunityLayer.address);
      await bank.deployed();
      banks.push(bank);
      
      await immunityLayer.connect(owner).addContractProtection(bank.address, 2);
      
      // Deposit to each
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(owner).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("1.0") }
      );
    }
    
    // Verify all are protected
    for (const bank of banks) {
      expect(await immunityLayer.isContractProtected(bank.address)).to.be.true;
    }
  });
  
  it("Should expire freeze after duration", async function() {
    const { immunityLayer, bank, owner } = await loadFixture(deployContractsFixture);
    
    // Deposit funds
    const depositData = encodeFunctionCall(bank, "deposit", []);
    await immunityLayer.connect(owner).protectedCall(
      bank.address,
      depositData,
      { value: ethers.utils.parseEther("1.0") }
    );
    
    // Trigger a threat with withdraw
    const withdrawData = encodeFunctionCall(bank, "withdraw", [
      ethers.utils.parseEther("0.1")
    ]);
    
    // Should freeze
    await expect(
      immunityLayer.connect(owner).protectedCall(bank.address, withdrawData, { value: 0 })
    ).to.be.revertedWith("Transaction frozen for security review");
    
    // Get threat ID
    const filter = immunityLayer.filters.ThreatDetected();
    const events = await immunityLayer.queryFilter(filter);
    const threatId = events[events.length - 1].args.threatId;
    
    // Mine blocks to expire freeze duration (default is 30 blocks)
    await mineBlocks(31);
    
    // After freeze expires, owner can still execute override
    await expect(
      immunityLayer.connect(owner).executeOwnerOverride(threatId, "execute")
    ).to.be.revertedWith("Freeze period expired");
  });
});