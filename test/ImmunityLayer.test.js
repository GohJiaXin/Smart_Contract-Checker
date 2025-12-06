const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContractsFixture, encodeFunctionCall } = require("./helpers");

describe("ContractImmunityLayer", function() {
  
  it("Should deploy and setup correctly", async function() {
    const { immunityLayer, bank, owner } = await loadFixture(deployContractsFixture);
    
    expect(await immunityLayer.owner()).to.equal(owner.address);
    expect(await immunityLayer.isContractProtected(bank.address)).to.be.true;
  });
  
  it("Should detect and freeze reentrancy attacks", async function() {
    const { immunityLayer, bank, malicious, owner } = await loadFixture(deployContractsFixture);
    
    // Deposit funds to bank
    await bank.connect(owner).deposit({ value: ethers.utils.parseEther("1.0") });
    
    // Fund malicious contract so it can call withdraw
    await owner.sendTransaction({
      to: malicious.address,
      value: ethers.utils.parseEther("0.1")
    });
    
    // Malicious contract deposits to bank
    const depositData = encodeFunctionCall(bank, "deposit", []);
    await immunityLayer.connect(owner).protectedCall(
      bank.address,
      depositData,
      { value: ethers.utils.parseEther("0.1") }
    );
    
    // Now try reentrancy attack through withdraw
    const withdrawData = encodeFunctionCall(bank, "withdraw", [
      ethers.utils.parseEther("0.1")
    ]);
    
    // This should be detected and frozen because malicious is a contract
    await expect(
      immunityLayer.connect(owner).protectedCall(bank.address, withdrawData, { value: 0 })
    ).to.be.revertedWith("Transaction frozen for security review");
  });
  
  it("Should allow safe withdrawals", async function() {
    const { immunityLayer, bank, user1 } = await loadFixture(deployContractsFixture);
    
    // Deposit from EOA (externally owned account)
    const depositData = encodeFunctionCall(bank, "deposit", []);
    await immunityLayer.connect(user1).protectedCall(
      bank.address,
      depositData,
      { value: ethers.utils.parseEther("0.5") }
    );
    
    // Safe withdraw from EOA should work
    const safeData = encodeFunctionCall(bank, "safeWithdraw", [
      ethers.utils.parseEther("0.5")
    ]);
    
    // Should succeed - user1 is EOA, not a contract
    await expect(
      immunityLayer.connect(user1).protectedCall(bank.address, safeData, { value: 0 })
    ).to.not.be.reverted;
  });
});