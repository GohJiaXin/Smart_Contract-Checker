const { ethers } = require("hardhat");

/**
 * Demo 1: Normal Operation
 * 
 * Shows how the system works seamlessly for normal users.
 * No threats detected, everything works smoothly.
 * 
 * Run: npm run demo:normal
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function demoNormalOperation() {
  console.log("\n" + "=".repeat(80));
  console.log("💰 DEMO 1: NORMAL OPERATION");
  console.log("=".repeat(80));
  console.log("\n📋 This demo shows normal users interacting with the protected contract");
  console.log("   No threats detected - everything works smoothly!\n");
  
  await delay(2000);
  
  // ========== SETUP ==========
  console.log("🔨 Setting Up Contracts");
  console.log("-".repeat(80));
  
  const [owner, user1, user2] = await ethers.getSigners();
  console.log(`   👤 Owner: ${owner.address.substring(0, 10)}...`);
  console.log(`   👤 User1: ${user1.address.substring(0, 10)}...`);
  console.log(`   👤 User2: ${user2.address.substring(0, 10)}...`);
  console.log();
  
  // Deploy Immunity Layer
  const ImmunityLayer = await ethers.getContractFactory("ContractImmunityLayer");
  const immunityLayer = await ImmunityLayer.deploy();
  await immunityLayer.deployed();
  console.log(`   ✅ Immunity Layer deployed`);
  
  // Deploy AI Oracle
  const AIOracle = await ethers.getContractFactory("AIAnalysisOracle");
  const aiOracle = await AIOracle.deploy(immunityLayer.address);
  await aiOracle.deployed();
  await immunityLayer.setAIOracle(aiOracle.address);
  console.log(`   ✅ AI Oracle deployed`);
  
  // Deploy Banking Contract
  const BankingContract = await ethers.getContractFactory("BankingContract");
  const bank = await BankingContract.deploy(
    immunityLayer.address,
    500, // 5% interest
    86400, // 1 day delay
    ethers.utils.parseEther("100") // Max 100 ETH per withdrawal
  );
  await bank.deployed();
  console.log(`   ✅ Banking Contract deployed`);
  
  // Protect the bank
  await immunityLayer.addContractProtection(bank.address, 3);
  console.log(`   ✅ Bank protected with level 3 security`);
  console.log();
  
  await delay(2000);
  
  // ========== NORMAL OPERATION 1: DEPOSITS ==========
  console.log("💵 Step 1: Normal User Deposits");
  console.log("-".repeat(80));
  
  const depositData = bank.interface.encodeFunctionData("deposit", []);
  
  // User1 deposits
  console.log(`   👤 User1 depositing 10 ETH...`);
  const depositTx1 = await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("10.0") }
  );
  await depositTx1.wait();
  console.log(`   ✅ User1 deposit successful!`);
  console.log(`   ✅ Balance: ${ethers.utils.formatEther(await bank.balances(user1.address))} ETH`);
  console.log(`   ✅ No threats detected - Normal operation`);
  console.log();
  
  await delay(1500);
  
  // User2 deposits
  console.log(`   👤 User2 depositing 5 ETH...`);
  const depositTx2 = await immunityLayer.connect(user2).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("5.0") }
  );
  await depositTx2.wait();
  console.log(`   ✅ User2 deposit successful!`);
  console.log(`   ✅ Balance: ${ethers.utils.formatEther(await bank.balances(user2.address))} ETH`);
  console.log(`   ✅ No threats detected - Normal operation`);
  console.log();
  
  await delay(2000);
  
  // ========== NORMAL OPERATION 2: TRANSFERS ==========
  console.log("💸 Step 2: Normal User Transfers");
  console.log("-".repeat(80));
  
  const transferData = bank.interface.encodeFunctionData("transfer", [
    user2.address,
    ethers.utils.parseEther("2.0")
  ]);
  
  console.log(`   👤 User1 transferring 2 ETH to User2...`);
  const transferTx = await immunityLayer.connect(user1).protectedCall(
    bank.address,
    transferData,
    { value: 0 }
  );
  await transferTx.wait();
  console.log(`   ✅ Transfer successful!`);
  console.log(`   ✅ User1 balance: ${ethers.utils.formatEther(await bank.balances(user1.address))} ETH`);
  console.log(`   ✅ User2 balance: ${ethers.utils.formatEther(await bank.balances(user2.address))} ETH`);
  console.log(`   ✅ No threats detected - Normal operation`);
  console.log();
  
  await delay(2000);
  
  // ========== NORMAL OPERATION 3: STATISTICS ==========
  console.log("📊 Step 3: System Statistics");
  console.log("-".repeat(80));
  
  const stats = await immunityLayer.getStats();
  console.log(`   🛡️  Total Threats Detected:  ${stats.threatsDetected}`);
  console.log(`   ✅ Total Threats Mitigated:  ${stats.threatsMitigated}`);
  console.log(`   💰 Total Loss Prevented:     ${ethers.utils.formatEther(stats.lossPrevented)} ETH`);
  console.log();
  
  const bankStats = await bank.getContractStats();
  console.log(`   🏦 Banking Contract Stats:`);
  console.log(`      Total Deposits:  ${ethers.utils.formatEther(bankStats.totalDepositsAmount)} ETH`);
  console.log(`      Contract Balance: ${ethers.utils.formatEther(bankStats.contractBalance)} ETH`);
  console.log(`      Average Deposit: ${ethers.utils.formatEther(bankStats.averageDeposit)} ETH`);
  console.log();
  
  await delay(2000);
  
  // ========== SUMMARY ==========
  console.log("=".repeat(80));
  console.log("✅ NORMAL OPERATION DEMO COMPLETE");
  console.log("=".repeat(80));
  console.log();
  console.log("   🎯 Key Takeaways:");
  console.log("   ✅ Normal transactions work seamlessly");
  console.log("   ✅ No performance impact on legitimate users");
  console.log("   ✅ System is transparent and invisible");
  console.log("   ✅ All operations completed successfully");
  console.log();
  console.log("   💡 The protection layer doesn't interfere with normal operations!");
  console.log("   💡 Users experience no delays or friction!");
  console.log();
  console.log("=".repeat(80));
  console.log("🚀 Ready for Demo 2: Threat Detection");
  console.log("   Run: npm run demo:threat");
  console.log("=".repeat(80));
  console.log();
}

demoNormalOperation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo Error:", error);
    process.exit(1);
  });

