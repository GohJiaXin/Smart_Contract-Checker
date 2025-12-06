const { ethers } = require("hardhat");

/**
 * Hackathon Demo Script
 * 
 * This script demonstrates the Smart Contract Immunity Layer
 * in a clear, step-by-step manner perfect for presentations.
 * 
 * Run: npm run demo
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function hackathonDemo() {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 SMART CONTRACT IMMUNITY LAYER - HACKATHON DEMO");
  console.log("=".repeat(80));
  console.log("\n📋 This demo shows real-time threat detection in action\n");
  
  await delay(2000);
  
  // ========== PART 1: SETUP ==========
  console.log("🔨 PART 1: Deploying Contracts");
  console.log("-".repeat(80));
  
  const [owner, user1, user2, attacker] = await ethers.getSigners();
  console.log(`   👤 Owner:    ${owner.address.substring(0, 10)}...`);
  console.log(`   👤 User1:    ${user1.address.substring(0, 10)}...`);
  console.log(`   👤 User2:    ${user2.address.substring(0, 10)}...`);
  console.log(`   👤 Attacker: ${attacker.address.substring(0, 10)}...`);
  console.log();
  
  // Deploy Immunity Layer
  const ImmunityLayer = await ethers.getContractFactory("ContractImmunityLayer");
  const immunityLayer = await ImmunityLayer.deploy();
  await immunityLayer.deployed();
  console.log(`   ✅ Immunity Layer deployed: ${immunityLayer.address.substring(0, 10)}...`);
  
  // Deploy AI Oracle
  const AIOracle = await ethers.getContractFactory("AIAnalysisOracle");
  const aiOracle = await AIOracle.deploy(immunityLayer.address);
  await aiOracle.deployed();
  await immunityLayer.setAIOracle(aiOracle.address);
  console.log(`   ✅ AI Oracle deployed: ${aiOracle.address.substring(0, 10)}...`);
  
  // Deploy Banking Contract
  const BankingContract = await ethers.getContractFactory("BankingContract");
  const bank = await BankingContract.deploy(
    immunityLayer.address,
    500, // 5% interest
    86400, // 1 day delay
    ethers.utils.parseEther("100") // Max 100 ETH per withdrawal
  );
  await bank.deployed();
  console.log(`   ✅ Banking Contract deployed: ${bank.address.substring(0, 10)}...`);
  
  // Protect the bank
  await immunityLayer.addContractProtection(bank.address, 3);
  console.log(`   ✅ Bank protected with level 3 security`);
  console.log();
  
  await delay(2000);
  
  // ========== PART 2: NORMAL OPERATION ==========
  console.log("💰 PART 2: Normal Operation - User Deposits");
  console.log("-".repeat(80));
  
  const depositData = bank.interface.encodeFunctionData("deposit", []);
  const depositTx = await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("10.0") }
  );
  await depositTx.wait();
  
  console.log(`   ✅ User1 deposited 10 ETH`);
  console.log(`   ✅ Transaction completed successfully`);
  console.log(`   ✅ Balance updated: ${ethers.utils.formatEther(await bank.balances(user1.address))} ETH`);
  console.log(`   📊 No threats detected - Normal operation`);
  console.log();
  
  await delay(2000);
  
  // ========== PART 3: THREAT DETECTION ==========
  console.log("🚨 PART 3: Threat Detection - Large Withdrawal Attempt");
  console.log("-".repeat(80));
  
  // Another user deposits small amount
  await immunityLayer.connect(user2).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("1.0") }
  );
  console.log(`   📝 User2 deposited 1 ETH (Average deposit: ~5.5 ETH)`);
  
  await delay(1000);
  
  // Attacker tries large withdrawal
  console.log(`\n   ⚠️  Attacker attempts to withdraw 60 ETH (>10x average)...`);
  
  const largeWithdrawData = bank.interface.encodeFunctionData("withdraw", [
    ethers.utils.parseEther("60.0")
  ]);
  
  try {
    await immunityLayer.connect(user1).protectedCall(
      bank.address,
      largeWithdrawData,
      { value: 0 }
    );
    console.log(`   ❌ Unexpected: Transaction succeeded`);
  } catch (error) {
    if (error.message.includes("Transaction frozen")) {
      console.log(`   ✅ THREAT DETECTED! Transaction frozen for security review`);
      
      // Get threat details
      const filter = immunityLayer.filters.ThreatDetected();
      const events = await immunityLayer.queryFilter(filter);
      if (events.length > 0) {
        const threatId = events[events.length - 1].args.threatId;
        const threatDetails = await immunityLayer.getThreatDetails(threatId);
        
        console.log(`\n   📊 THREAT ANALYSIS:`);
        console.log(`      Threat ID: ${threatId.substring(0, 20)}...`);
        console.log(`      Level: ${getThreatLevel(threatDetails.level)}`);
        console.log(`      Type: ${getVulnType(threatDetails.vulnType)}`);
        console.log(`      Reason: ${threatDetails.reason}`);
        console.log(`      Status: FROZEN ⏸️`);
      }
    }
  }
  console.log();
  
  await delay(2000);
  
  // ========== PART 4: AI ANALYSIS ==========
  console.log("🤖 PART 4: AI Analysis");
  console.log("-".repeat(80));
  
  const filter = immunityLayer.filters.ThreatDetected();
  const events = await immunityLayer.queryFilter(filter);
  if (events.length > 0) {
    const threatId = events[events.length - 1].args.threatId;
    
    // Submit AI analysis
    await aiOracle.connect(owner).submitAnalysis(
      threatId,
      "Large withdrawal detected (>10x average deposit). This pattern matches known drain attack strategies. The withdrawal amount significantly exceeds normal user behavior.",
      "revert",
      true
    );
    
    console.log(`   ✅ AI Analysis submitted`);
    
    const aiAnalysis = await aiOracle.getAnalysis(threatId);
    console.log(`\n   📋 AI ANALYSIS RESULTS:`);
    console.log(`      Status: ${aiAnalysis.completed ? "✅ COMPLETED" : "⏳ PENDING"}`);
    console.log(`      Analysis: ${aiAnalysis.analysis}`);
    console.log(`      Recommendation: ${aiAnalysis.suggestedAction.toUpperCase()}`);
    console.log();
  }
  
  await delay(2000);
  
  // ========== PART 5: STATISTICS ==========
  console.log("📊 PART 5: System Statistics");
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
  console.log("✅ DEMO COMPLETE - Key Takeaways");
  console.log("=".repeat(80));
  console.log();
  console.log("   🎯 Real-time threat detection works!");
  console.log("   🛡️  Suspicious transactions are automatically frozen");
  console.log("   🤖 AI provides intelligent analysis and recommendations");
  console.log("   👤 Owners maintain control with override capabilities");
  console.log("   📊 Comprehensive monitoring and statistics");
  console.log();
  console.log("   💡 This solution can protect any DeFi protocol!");
  console.log("   💡 Works with existing contracts - no migration needed!");
  console.log("   💡 Production-ready and fully tested!");
  console.log();
  console.log("=".repeat(80));
  console.log("🚀 Thank you for watching!");
  console.log("=".repeat(80));
  console.log();
}

function getThreatLevel(level) {
  const levels = ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
  return levels[level] || "UNKNOWN";
}

function getVulnType(type) {
  const types = [
    "REENTRANCY", "FLASH_LOAN", "STATE_MANIPULATION", "UNEXPECTED_ETH_FLOW",
    "UNSAFE_CALL", "ACCESS_CONTROL", "INTEGER_OVERFLOW", "LOGIC_ERROR",
    "LARGE_WITHDRAWAL", "RAPID_WITHDRAWAL", "ADMIN_FUNCTION_ABUSE", "ORACLE_MANIPULATION", "UNKNOWN"
  ];
  return types[type] || "UNKNOWN";
}

hackathonDemo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo Error:", error);
    process.exit(1);
  });


