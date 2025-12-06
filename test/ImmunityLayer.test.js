const { expect } = require("chai");
const { deployContractsFixture, encodeFunctionCall } = require("./helpers");

describe("ContractImmunityLayer", function() {
  
  it("Should deploy and setup correctly", async function() {
    const { immunityLayer, bank, owner } = await loadFixture(deployContractsFixture);
    
    expect(await immunityLayer.owner()).to.equal(owner.address);
    expect(await immunityLayer.isContractProtected(bank.address)).to.be.true;
  });
  
  it("Should detect and freeze reentrancy attacks", async function() {
    const { immunityLayer, bank, malicious, owner } = await loadFixture(deployContractsFixture);
    
    // Deposit funds
    await bank.connect(owner).deposit({ value: ethers.utils.parseEther("1.0") });
    
    // Prepare attack
    const attackData = encodeFunctionCall(malicious, "executeReentrancy", [
      ethers.utils.parseEther("1.0")
    ]);
    
    // Execute through immunity layer
    await expect(
      immunityLayer.protectedCall(bank.address, attackData, { value: 0 })
    ).to.be.revertedWith("Transaction frozen for security review");
    
    // Bank balance should remain unchanged
    const bankBalance = await bank.getBalance();
    expect(bankBalance).to.equal(ethers.utils.parseEther("1.0"));
  });
  
  it("Should allow safe withdrawals", async function() {
    const { immunityLayer, bank, user1 } = await loadFixture(deployContractsFixture);
    
    // Deposit
    await bank.connect(user1).deposit({ value: ethers.utils.parseEther("0.5") });
    
    // Safe withdraw
    const safeData = encodeFunctionCall(bank, "safeWithdraw", [
      ethers.utils.parseEther("0.5")
    ]);
    
    // Should succeed without freeze
    await expect(
      immunityLayer.connect(user1).protectedCall(bank.address, safeData, { value: 0 })
    ).to.not.be.reverted;
  });
});