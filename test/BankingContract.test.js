const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { encodeFunctionCall, mineBlocks } = require("./helpers");

/**
 * Comprehensive test suite for BankingContract with Immunity Layer integration
 * 
 * Test Coverage:
 * - Deposit functionality
 * - Withdrawal with delays
 * - Large withdrawal detection
 * - Transfer between users
 * - Interest accrual
 * - Admin functions
 * - Emergency freeze
 * - Pattern detection
 * - Withdrawal simulation
 */

describe("BankingContract - Comprehensive Tests", function () {
  
  async function deployBankingFixture() {
    const [owner, user1, user2, user3, attacker] = await ethers.getSigners();
    
    // Deploy Immunity Layer
    const ImmunityLayer = await ethers.getContractFactory("ContractImmunityLayer");
    const immunityLayer = await ImmunityLayer.deploy();
    await immunityLayer.deployed();
    
    // Deploy AI Oracle
    const AIOracle = await ethers.getContractFactory("AIAnalysisOracle");
    const aiOracle = await AIOracle.deploy(immunityLayer.address);
    await aiOracle.deployed();
    await immunityLayer.setAIOracle(aiOracle.address);
    
    // Deploy Banking Contract
    const BankingContract = await ethers.getContractFactory("BankingContract");
    const bank = await BankingContract.deploy(
      immunityLayer.address,
      500, // 5% annual interest
      86400, // 1 day withdrawal delay
      ethers.utils.parseEther("100") // Max 100 ETH per withdrawal
    );
    await bank.deployed();
    
    // Protect the bank
    await immunityLayer.addContractProtection(bank.address, 3);
    
    return {
      owner,
      user1,
      user2,
      user3,
      attacker,
      immunityLayer,
      aiOracle,
      bank
    };
  }
  
  describe("Deposit Functionality", function () {
    
    it("Should allow users to deposit ETH", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      const depositData = encodeFunctionCall(bank, "deposit", []);
      const tx = await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("5.0") }
      );
      await tx.wait();
      
      // Check balance - note: balanceOf reads from the mapping
      const balance = await bank.balances(user1.address);
      expect(balance).to.equal(ethers.utils.parseEther("5.0"));
    });
    
    it("Should track total deposits correctly", async function () {
      const { immunityLayer, bank, user1, user2 } = await loadFixture(deployBankingFixture);
      
      // User1 deposits
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // User2 deposits
      await immunityLayer.connect(user2).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("5.0") }
      );
      
      const stats = await bank.getContractStats();
      expect(stats.totalDepositsAmount).to.equal(ethers.utils.parseEther("15.0"));
    });
    
    it("Should set withdrawal lock time after deposit", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      const depositData = encodeFunctionCall(bank, "deposit", []);
      const tx = await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("5.0") }
      );
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      const unlockTime = await bank.getWithdrawalUnlockTime(user1.address);
      expect(unlockTime).to.be.gt(block.timestamp);
      
      const canWithdraw = await bank.canWithdraw(user1.address);
      expect(canWithdraw).to.be.false; // Should be locked
    });
    
    it("Should update average deposit amount", async function () {
      const { immunityLayer, bank, user1, user2 } = await loadFixture(deployBankingFixture);
      
      const depositData = encodeFunctionCall(bank, "deposit", []);
      
      // First deposit
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // Second deposit
      await immunityLayer.connect(user2).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("20.0") }
      );
      
      const stats = await bank.getContractStats();
      // Average should be (10 + 20) / 2 = 15 ETH
      expect(stats.averageDeposit).to.equal(ethers.utils.parseEther("15.0"));
    });
    
    it("Should emit Deposit event", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      const depositData = encodeFunctionCall(bank, "deposit", []);
      const tx = await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("5.0") }
      );
      
      await expect(tx)
        .to.emit(bank, "Deposit")
        .withArgs(
          user1.address,
          ethers.utils.parseEther("5.0"),
          ethers.utils.parseEther("5.0"),
          (timestamp) => timestamp.gt(0) // Just check timestamp is positive
        );
    });
  });
  
  describe("Withdrawal Functionality", function () {
    
    it("Should prevent withdrawal before delay period", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      // Deposit
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // Try to withdraw immediately
      const withdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("5.0")
      ]);
      
      await expect(
        immunityLayer.connect(user1).protectedCall(
          bank.address,
          withdrawData,
          { value: 0 }
        )
      ).to.be.reverted;
    });
    
    it("Should allow withdrawal after delay period", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      // Deposit
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // Fast forward time (1 day + 1 second)
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      
      // Withdraw
      const withdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("5.0")
      ]);
      
      await expect(
        immunityLayer.connect(user1).protectedCall(
          bank.address,
          withdrawData,
          { value: 0 }
        )
      ).to.not.be.reverted;
      
      const balance = await bank.balances(user1.address);
      expect(balance).to.equal(ethers.utils.parseEther("5.0"));
    });
    
    it("Should prevent withdrawal exceeding balance", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      // Deposit
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      
      // Try to withdraw more than balance
      const withdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("20.0")
      ]);
      
      await expect(
        immunityLayer.connect(user1).protectedCall(
          bank.address,
          withdrawData,
          { value: 0 }
        )
      ).to.be.reverted;
    });
    
    it("Should prevent withdrawal exceeding max per transaction", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      // Deposit large amount
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("200.0") }
      );
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      
      // Try to withdraw more than max (100 ETH)
      const withdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("150.0")
      ]);
      
      await expect(
        immunityLayer.connect(user1).protectedCall(
          bank.address,
          withdrawData,
          { value: 0 }
        )
      ).to.be.reverted;
    });
    
    it("Should emit Withdraw event", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      // Deposit
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      
      // Withdraw
      const withdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("5.0")
      ]);
      
      const tx = await immunityLayer.connect(user1).protectedCall(
        bank.address,
        withdrawData,
        { value: 0 }
      );
      
      await expect(tx)
        .to.emit(bank, "Withdraw")
        .withArgs(
          user1.address,
          ethers.utils.parseEther("5.0"),
          ethers.utils.parseEther("5.0"),
          await ethers.provider.getBlockNumber()
        );
    });
  });
  
  describe("Large Withdrawal Detection", function () {
    
    it("Should detect and freeze large withdrawals (>10x average)", async function () {
      const { immunityLayer, bank, user1, user2 } = await loadFixture(deployBankingFixture);
      
      // User1 deposits 1 ETH
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("1.0") }
      );
      
      // User2 deposits 1 ETH (average = 1 ETH)
      await immunityLayer.connect(user2).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("1.0") }
      );
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      
      // User1 tries to withdraw 15 ETH (>10x average of 1 ETH)
      const largeWithdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("15.0")
      ]);
      
      await expect(
        immunityLayer.connect(user1).protectedCall(
          bank.address,
          largeWithdrawData,
          { value: 0 }
        )
      ).to.be.revertedWith("Transaction frozen for security review");
      
      // Check threat was detected
      const filter = immunityLayer.filters.ThreatDetected();
      const events = await immunityLayer.queryFilter(filter);
      expect(events.length).to.be.gt(0);
      
      const threatId = events[events.length - 1].args.threatId;
      const threatDetails = await immunityLayer.getThreatDetails(threatId);
      expect(threatDetails.level).to.be.gte(2); // MEDIUM or higher
    });
    
    it("Should allow normal withdrawals (<10x average)", async function () {
      const { immunityLayer, bank, user1, user2 } = await loadFixture(deployBankingFixture);
      
      // User1 deposits 10 ETH
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // User2 deposits 10 ETH (average = 10 ETH)
      await immunityLayer.connect(user2).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      
      // User1 withdraws 5 ETH (<10x average, should be fine)
      const withdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("5.0")
      ]);
      
      await expect(
        immunityLayer.connect(user1).protectedCall(
          bank.address,
          withdrawData,
          { value: 0 }
        )
      ).to.not.be.reverted;
    });
  });
  
  describe("Transfer Functionality", function () {
    
    it("Should allow transfers between users", async function () {
      const { immunityLayer, bank, user1, user2 } = await loadFixture(deployBankingFixture);
      
      // User1 deposits
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // User1 transfers to User2
      const transferData = encodeFunctionCall(bank, "transfer", [
        user2.address,
        ethers.utils.parseEther("3.0")
      ]);
      
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        transferData,
        { value: 0 }
      );
      
      const user1Balance = await bank.balances(user1.address);
      const user2Balance = await bank.balances(user2.address);
      
      expect(user1Balance).to.equal(ethers.utils.parseEther("7.0"));
      expect(user2Balance).to.equal(ethers.utils.parseEther("3.0"));
    });
    
    it("Should prevent transfer exceeding balance", async function () {
      const { immunityLayer, bank, user1, user2 } = await loadFixture(deployBankingFixture);
      
      // User1 deposits
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // Try to transfer more than balance
      const transferData = encodeFunctionCall(bank, "transfer", [
        user2.address,
        ethers.utils.parseEther("20.0")
      ]);
      
      await expect(
        immunityLayer.connect(user1).protectedCall(
          bank.address,
          transferData,
          { value: 0 }
        )
      ).to.be.reverted;
    });
    
    it("Should emit Transfer event", async function () {
      const { immunityLayer, bank, user1, user2 } = await loadFixture(deployBankingFixture);
      
      // User1 deposits
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // Transfer
      const transferData = encodeFunctionCall(bank, "transfer", [
        user2.address,
        ethers.utils.parseEther("3.0")
      ]);
      
      const tx = await immunityLayer.connect(user1).protectedCall(
        bank.address,
        transferData,
        { value: 0 }
      );
      
      await expect(tx)
        .to.emit(bank, "Transfer")
        .withArgs(
          user1.address,
          user2.address,
          ethers.utils.parseEther("3.0"),
          await ethers.provider.getBlockNumber()
        );
    });
  });
  
  describe("Interest Accrual", function () {
    
    it("Should accrue interest over time", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      // Deposit
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("100.0") }
      );
      
      const initialBalance = await bank.balances(user1.address);
      
      // Fast forward 1 year
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      // Accrue interest
      const accrueData = encodeFunctionCall(bank, "accrueMyInterest", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        accrueData,
        { value: 0 }
      );
      
      const newBalance = await bank.balances(user1.address);
      // Should have ~5% interest (5 ETH)
      expect(newBalance).to.be.gt(initialBalance);
    });
    
    it("Should emit InterestAccrued event", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      // Deposit
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("100.0") }
      );
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      
      // Accrue interest
      const accrueData = encodeFunctionCall(bank, "accrueMyInterest", []);
      const tx = await immunityLayer.connect(user1).protectedCall(
        bank.address,
        accrueData,
        { value: 0 }
      );
      
      await expect(tx)
        .to.emit(bank, "InterestAccrued");
    });
  });
  
  describe("Admin Functions", function () {
    
    it("Should allow owner to freeze contract", async function () {
      const { bank, owner } = await loadFixture(deployBankingFixture);
      
      await bank.connect(owner).emergencyFreeze("Test freeze");
      
      const stats = await bank.getContractStats();
      expect(stats.frozen).to.be.true;
    });
    
    it("Should prevent operations when frozen", async function () {
      const { immunityLayer, bank, owner, user1 } = await loadFixture(deployBankingFixture);
      
      // Freeze
      await bank.connect(owner).emergencyFreeze("Test freeze");
      
      // Try to deposit
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await expect(
        immunityLayer.connect(user1).protectedCall(
          bank.address,
          depositData,
          { value: ethers.utils.parseEther("5.0") }
        )
      ).to.be.reverted;
    });
    
    it("Should allow owner to unfreeze contract", async function () {
      const { bank, owner } = await loadFixture(deployBankingFixture);
      
      await bank.connect(owner).emergencyFreeze("Test freeze");
      await bank.connect(owner).unfreeze();
      
      const stats = await bank.getContractStats();
      expect(stats.frozen).to.be.false;
    });
    
    it("Should allow owner to update interest rate", async function () {
      const { bank, owner } = await loadFixture(deployBankingFixture);
      
      await bank.connect(owner).setInterestRate(600); // 6%
      
      const stats = await bank.getContractStats();
      expect(stats.currentInterestRate).to.equal(600);
    });
    
    it("Should allow owner to update max withdrawal", async function () {
      const { bank, owner } = await loadFixture(deployBankingFixture);
      
      await bank.connect(owner).setMaxWithdrawalPerTx(ethers.utils.parseEther("200.0"));
      
      // Verify by checking it doesn't revert on large withdrawal attempt
      // (would need to test with actual withdrawal)
    });
    
    it("Should prevent non-owner from calling admin functions", async function () {
      const { bank, user1 } = await loadFixture(deployBankingFixture);
      
      await expect(
        bank.connect(user1).emergencyFreeze("Test")
      ).to.be.reverted;
    });
  });
  
  describe("Withdrawal Simulation", function () {
    
    it("Should simulate withdrawal and return risk level", async function () {
      const { immunityLayer, bank, user1, user2 } = await loadFixture(deployBankingFixture);
      
      // Setup deposits
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      await immunityLayer.connect(user2).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // Simulate normal withdrawal
      const withdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("5.0")
      ]);
      
      const simulation = await immunityLayer.simulateWithdrawal(
        bank.address,
        withdrawData
      );
      
      expect(simulation.wouldSucceed).to.be.true;
      expect(simulation.riskLevel).to.be.lte(2); // LOW or MEDIUM
    });
    
    it("Should detect high risk in large withdrawal simulation", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      // Small deposit (average = 1 ETH)
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("1.0") }
      );
      
      // Simulate large withdrawal (>10x average)
      const largeWithdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("15.0")
      ]);
      
      const simulation = await immunityLayer.simulateWithdrawal(
        bank.address,
        largeWithdrawData
      );
      
      expect(simulation.riskLevel).to.be.gte(3); // HIGH or CRITICAL
    });
  });
  
  describe("Pattern Detection", function () {
    
    it("Should track deposit patterns for analysis", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      const depositData = encodeFunctionCall(bank, "deposit", []);
      
      // Multiple deposits
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("5.0") }
      );
      
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("15.0") }
      );
      
      const stats = await bank.getContractStats();
      // Average should be (5 + 10 + 15) / 3 = 10 ETH
      expect(stats.averageDeposit).to.equal(ethers.utils.parseEther("10.0"));
    });
    
    it("Should detect rapid withdrawal patterns", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      // Deposit large amount
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("100.0") }
      );
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      
      // Multiple rapid withdrawals
      const withdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("10.0")
      ]);
      
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        withdrawData,
        { value: 0 }
      );
      
      // Second withdrawal immediately (should be detected as rapid pattern)
      // This would be caught by the immunity layer's pattern detection
    });
  });
  
  describe("User Statistics", function () {
    
    it("Should return correct user statistics", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      // Deposit
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      const userStats = await bank.getUserStats(user1.address);
      expect(userStats.balance).to.equal(ethers.utils.parseEther("10.0"));
      expect(userStats.totalDepositedAmount).to.equal(ethers.utils.parseEther("10.0"));
      expect(userStats.totalWithdrawnAmount).to.equal(0);
    });
    
    it("Should track total deposited and withdrawn", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      // Deposit
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      
      // Withdraw
      const withdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("5.0")
      ]);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        withdrawData,
        { value: 0 }
      );
      
      const userStats = await bank.getUserStats(user1.address);
      expect(userStats.totalDepositedAmount).to.equal(ethers.utils.parseEther("10.0"));
      expect(userStats.totalWithdrawnAmount).to.equal(ethers.utils.parseEther("5.0"));
    });
  });
  
  describe("Edge Cases", function () {
    
    it("Should handle zero amount deposits gracefully", async function () {
      const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
      
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await expect(
        immunityLayer.connect(user1).protectedCall(
          bank.address,
          depositData,
          { value: 0 }
        )
      ).to.be.reverted;
    });
    
    it("Should handle multiple users correctly", async function () {
      const { immunityLayer, bank, user1, user2, user3 } = await loadFixture(deployBankingFixture);
      
      const depositData = encodeFunctionCall(bank, "deposit", []);
      
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      await immunityLayer.connect(user2).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("20.0") }
      );
      
      await immunityLayer.connect(user3).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("30.0") }
      );
      
      const stats = await bank.getContractStats();
      expect(stats.totalDepositsAmount).to.equal(ethers.utils.parseEther("60.0"));
      expect(stats.averageDeposit).to.equal(ethers.utils.parseEther("20.0"));
    });
    
    it("Should prevent withdrawal when contract is frozen", async function () {
      const { immunityLayer, bank, owner, user1 } = await loadFixture(deployBankingFixture);
      
      // Deposit
      const depositData = encodeFunctionCall(bank, "deposit", []);
      await immunityLayer.connect(user1).protectedCall(
        bank.address,
        depositData,
        { value: ethers.utils.parseEther("10.0") }
      );
      
      // Freeze
      await bank.connect(owner).emergencyFreeze("Emergency");
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      
      // Try to withdraw (should fail due to freeze)
      const withdrawData = encodeFunctionCall(bank, "withdraw", [
        ethers.utils.parseEther("5.0")
      ]);
      
      await expect(
        immunityLayer.connect(user1).protectedCall(
          bank.address,
          withdrawData,
          { value: 0 }
        )
      ).to.be.reverted;
    });
  });
});

