const { ethers } = require("hardhat");

/**
 * Script to test the enhanced BankingContract with all features
 */

async function testBankingContract() {
  console.log("=".repeat(80));
  console.log("TESTING ENHANCED BANKING CONTRACT");
  console.log("=".repeat(80));
  console.log();

  const [owner, user1, user2, attacker] = await ethers.getSigners();

  // Deploy Immunity Layer
  console.log("🔨 Deploying Immunity Layer...");
  const ImmunityLayer = await ethers.getContractFactory("ContractImmunityLayer");
  const immunityLayer = await ImmunityLayer.deploy();
  await immunityLayer.deployed();
  console.log(`   ✓ Immunity Layer: ${immunityLayer.address}`);

  // Deploy AI Oracle
  const AIOracle = await ethers.getContractFactory("AIAnalysisOracle");
  const aiOracle = await AIOracle.deploy(immunityLayer.address);
  await aiOracle.deployed();
  await immunityLayer.setAIOracle(aiOracle.address);
  console.log(`   ✓ AI Oracle: ${aiOracle.address}`);

  // Deploy Banking Contract
  console.log("\n🏦 Deploying Banking Contract...");
  const BankingContract = await ethers.getContractFactory("BankingContract");
  const bank = await BankingContract.deploy(
    immunityLayer.address,
    500, // 5% annual interest
    86400, // 1 day withdrawal delay
    ethers.utils.parseEther("100") // Max 100 ETH per withdrawal
  );
  await bank.deployed();
  console.log(`   ✓ Banking Contract: ${bank.address}`);

  // Protect the bank
  await immunityLayer.addContractProtection(bank.address, 3);
  console.log(`   ✓ Bank protected with level 3 security`);

  // Test 1: Deposit
  console.log("\n💰 Test 1: User deposits...");
  const depositData = bank.interface.encodeFunctionData("deposit", []);
  const depositTx = await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("10.0") }
  );
  await depositTx.wait();
  console.log(`   ✓ User1 deposited 10 ETH`);
  
  const balance = await bank.balanceOf(user1.address);
  console.log(`   ✓ User1 balance: ${ethers.utils.formatEther(balance)} ETH`);

  // Test 2: Try to withdraw before delay (should fail)
  console.log("\n⏳ Test 2: Try withdrawal before delay...");
  const withdrawData = bank.interface.encodeFunctionData("withdraw", [
    ethers.utils.parseEther("1.0")
  ]);
  
  try {
    await immunityLayer.connect(user1).protectedCall(
      bank.address,
      withdrawData,
      { value: 0 }
    );
    console.log(`   ⚠️  Withdrawal succeeded (delay may have passed)`);
  } catch (error) {
    if (error.message.includes("Withdrawal is still locked")) {
      console.log(`   ✓ Withdrawal correctly blocked (delay not passed)`);
    } else {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }

  // Test 3: Large withdrawal detection
  console.log("\n🚨 Test 3: Large withdrawal detection...");
  
  // Make another deposit to establish average
  await immunityLayer.connect(user2).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("1.0") }
  );
  console.log(`   ✓ User2 deposited 1 ETH (average now ~5.5 ETH)`);
  
  // Try large withdrawal (>10x average)
  const largeWithdrawData = bank.interface.encodeFunctionData("withdraw", [
    ethers.utils.parseEther("60.0") // >10x average
  ]);
  
  try {
    await immunityLayer.connect(user1).protectedCall(
      bank.address,
      largeWithdrawData,
      { value: 0 }
    );
    console.log(`   ⚠️  Large withdrawal succeeded`);
  } catch (error) {
    if (error.message.includes("Transaction frozen")) {
      console.log(`   ✓ Large withdrawal detected and frozen!`);
      
      // Get threat ID
      const filter = immunityLayer.filters.ThreatDetected();
      const events = await immunityLayer.queryFilter(filter);
      if (events.length > 0) {
        const threatId = events[events.length - 1].args.threatId;
        const threatDetails = await immunityLayer.getThreatDetails(threatId);
        console.log(`   ✓ Threat Level: ${threatDetails.level}`);
        console.log(`   ✓ Reason: ${threatDetails.reason}`);
      }
    } else {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }

  // Test 4: Transfer between users
  console.log("\n💸 Test 4: Transfer between users...");
  const transferData = bank.interface.encodeFunctionData("transfer", [
    user2.address,
    ethers.utils.parseEther("2.0")
  ]);
  
  const transferTx = await immunityLayer.connect(user1).protectedCall(
    bank.address,
    transferData,
    { value: 0 }
  );
  await transferTx.wait();
  console.log(`   ✓ User1 transferred 2 ETH to User2`);
  
  const user2Balance = await bank.balanceOf(user2.address);
  console.log(`   ✓ User2 balance: ${ethers.utils.formatEther(user2Balance)} ETH`);

  // Test 5: Admin functions
  console.log("\n👑 Test 5: Admin functions...");
  const stats = await bank.getContractStats();
  console.log(`   ✓ Total Deposits: ${ethers.utils.formatEther(stats.totalDepositsAmount)} ETH`);
  console.log(`   ✓ Contract Balance: ${ethers.utils.formatEther(stats.contractBalance)} ETH`);
  console.log(`   ✓ Interest Rate: ${stats.currentInterestRate} basis points (${stats.currentInterestRate / 100}%)`);
  console.log(`   ✓ Frozen: ${stats.frozen}`);

  // Test 6: Simulate withdrawal
  console.log("\n🔍 Test 6: Simulate withdrawal...");
  const simulateData = bank.interface.encodeFunctionData("withdraw", [
    ethers.utils.parseEther("5.0")
  ]);
  
  try {
    const simulation = await immunityLayer.simulateWithdrawal(
      bank.address,
      simulateData
    );
    console.log(`   ✓ Would Succeed: ${simulation.wouldSucceed}`);
    console.log(`   ✓ Estimated Balance: ${ethers.utils.formatEther(simulation.estimatedBalance)} ETH`);
    console.log(`   ✓ Risk Level: ${simulation.riskLevel} (1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL)`);
  } catch (error) {
    console.log(`   ⚠️  Simulation error: ${error.message}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ TESTING COMPLETE");
  console.log("=".repeat(80));
}

testBankingContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

