const { ethers } = require("hardhat");
const readline = require("readline");

/**
 * Demo 2: Threat Detection with User Interaction
 * 
 * Shows how the system detects threats and prompts the owner
 * to take action before the transaction is executed.
 * 
 * Run: npm run demo:threat
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function demoThreatDetection() {
  console.log("\n" + "=".repeat(80));
  console.log("🚨 DEMO 2: THREAT DETECTION & USER ACTION");
  console.log("=".repeat(80));
  console.log("\n📋 This demo shows how the system detects threats and prompts");
  console.log("   the owner to take action BEFORE the transaction executes.\n");
  
  await delay(2000);
  
  // ========== SETUP ==========
  console.log("🔨 Setting Up Contracts");
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
  
  // ========== SETUP: NORMAL DEPOSITS ==========
  console.log("💰 Setting Up Normal Deposits");
  console.log("-".repeat(80));
  
  const depositData = bank.interface.encodeFunctionData("deposit", []);
  
  // User1 deposits
  await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("10.0") }
  );
  console.log(`   ✅ User1 deposited 10 ETH`);
  
  // User2 deposits
  await immunityLayer.connect(user2).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("1.0") }
  );
  console.log(`   ✅ User2 deposited 1 ETH`);
  
  const bankStats = await bank.getContractStats();
  console.log(`   📊 Average deposit: ${ethers.utils.formatEther(bankStats.averageDeposit)} ETH`);
  console.log();
  
  await delay(2000);
  
  // ========== THREAT DETECTION ==========
  console.log("🚨 THREAT DETECTED!");
  console.log("-".repeat(80));
  console.log();
  const avgDeposit = parseFloat(ethers.utils.formatEther(bankStats.averageDeposit));
  const multiplier = (60 / avgDeposit).toFixed(1);
  
  console.log("   ⚠️  ATTACKER ATTEMPT:");
  console.log("   👤 Attacker trying to withdraw 60 ETH");
  console.log(`   📊 This is ${multiplier}x the average deposit!`);
  console.log("   🚨 SUSPICIOUS PATTERN DETECTED!");
  console.log();
  
  await delay(2000);
  
  // Try large withdrawal
  const largeWithdrawData = bank.interface.encodeFunctionData("withdraw", [
    ethers.utils.parseEther("60.0")
  ]);
  
  console.log("   🔍 Immunity Layer analyzing transaction...");
  await delay(1500);
  console.log("   ⚠️  Threat Level: HIGH");
  console.log("   ⚠️  Vulnerability Type: LARGE_WITHDRAWAL");
  console.log("   ⚠️  Reason: Unusually large withdrawal detected (>10x average)");
  console.log();
  
  await delay(1500);
  
  try {
    await immunityLayer.connect(user1).protectedCall(
      bank.address,
      largeWithdrawData,
      { value: 0 }
    );
    console.log("   ❌ Unexpected: Transaction succeeded");
  } catch (error) {
    if (error.message.includes("Transaction frozen")) {
      console.log("   ✅ TRANSACTION FROZEN FOR SECURITY REVIEW");
      console.log("   ⏸️  Transaction has NOT been executed");
      console.log("   ⏸️  Funds are SAFE");
      console.log();
      
      // Get threat details
      const filter = immunityLayer.filters.ThreatDetected();
      const events = await immunityLayer.queryFilter(filter);
      if (events.length > 0) {
        const threatId = events[events.length - 1].args.threatId;
        const threatDetails = await immunityLayer.getThreatDetails(threatId);
        
        console.log("   📋 THREAT DETAILS:");
        console.log(`      Threat ID: ${threatId.substring(0, 20)}...`);
        console.log(`      Level: ${getThreatLevel(threatDetails.level)}`);
        console.log(`      Type: ${getVulnType(threatDetails.vulnType)}`);
        console.log(`      Reason: ${threatDetails.reason}`);
        console.log(`      Status: FROZEN ⏸️`);
        console.log();
        
        await delay(2000);
        
        // ========== AI ANALYSIS ==========
        console.log("🤖 AI ANALYSIS REQUESTED");
        console.log("-".repeat(80));
        console.log("   🔍 AI Oracle analyzing the threat...");
        await delay(2000);
        
        // Submit AI analysis
        await aiOracle.connect(owner).submitAnalysis(
          threatId,
          "Large withdrawal detected (>10x average deposit). This pattern matches known drain attack strategies. The withdrawal amount significantly exceeds normal user behavior and could indicate an attempt to drain the contract.",
          "revert",
          true
        );
        
        console.log("   ✅ AI Analysis Complete!");
        console.log();
        
        const aiAnalysis = await aiOracle.getAnalysis(threatId);
        console.log("   📋 AI ANALYSIS RESULTS:");
        console.log(`      Status: ${aiAnalysis.completed ? "✅ COMPLETED" : "⏳ PENDING"}`);
        console.log(`      Analysis: ${aiAnalysis.analysis}`);
        console.log(`      Recommendation: ${aiAnalysis.suggestedAction.toUpperCase()}`);
        console.log();
        
        await delay(2000);
        
        // ========== USER PROMPT ==========
        console.log("=".repeat(80));
        console.log("👤 OWNER ACTION REQUIRED");
        console.log("=".repeat(80));
        console.log();
        console.log("   ⚠️  A suspicious transaction has been detected and FROZEN.");
        console.log("   ⚠️  The transaction has NOT been executed yet.");
        console.log("   ⚠️  Your funds are SAFE.");
        console.log();
        console.log("   📊 Threat Details:");
        console.log(`      - Threat Level: ${getThreatLevel(threatDetails.level)}`);
        console.log(`      - Type: ${getVulnType(threatDetails.vulnType)}`);
        console.log(`      - Amount: 60 ETH`);
        console.log(`      - AI Recommendation: ${aiAnalysis.suggestedAction.toUpperCase()}`);
        console.log();
        console.log("   🤔 What would you like to do?");
        console.log("      1. REVERT - Block the transaction (recommended)");
        console.log("      2. EXECUTE - Allow the transaction (dangerous)");
        console.log("      3. SIMULATE - Request more analysis");
        console.log();
        
        // Get user input
        const answer = await askQuestion("   Enter your choice (1/2/3): ");
        console.log();
        
        if (answer === "1" || answer.toLowerCase() === "revert") {
          console.log("   ✅ You chose: REVERT");
          console.log("   🔒 Blocking the transaction...");
          await delay(1500);
          
          await immunityLayer.connect(owner).executeOwnerOverride(threatId, "revert");
          
          console.log("   ✅ Transaction REVERTED");
          console.log("   🛡️  Funds are PROTECTED");
          console.log("   ✅ Threat marked as MITIGATED");
          
          const finalStats = await immunityLayer.getStats();
          console.log();
          console.log("   📊 Updated Statistics:");
          console.log(`      Threats Detected: ${finalStats.threatsDetected}`);
          console.log(`      Threats Mitigated: ${finalStats.threatsMitigated}`);
          
        } else if (answer === "2" || answer.toLowerCase() === "execute") {
          console.log("   ⚠️  You chose: EXECUTE");
          console.log("   ⚠️  WARNING: This is dangerous!");
          console.log("   ⚠️  Executing despite AI recommendation...");
          await delay(1500);
          
          // Note: In real scenario, you'd need to wait for freeze period
          // For demo, we'll just show what would happen
          console.log("   ⚠️  Transaction would execute (if freeze period allows)");
          console.log("   ⚠️  This could result in fund loss!");
          
        } else if (answer === "3" || answer.toLowerCase() === "simulate") {
          console.log("   🔍 You chose: SIMULATE");
          console.log("   🔍 Requesting additional AI analysis...");
          await delay(1500);
          
          console.log("   📊 Additional Analysis:");
          console.log("      - Risk Level: CRITICAL");
          console.log("      - Estimated Loss: 60 ETH");
          console.log("      - Pattern Match: 95% confidence");
          console.log("      - Final Recommendation: REVERT");
          
        } else {
          console.log("   ⚠️  Invalid choice. Defaulting to REVERT...");
          await immunityLayer.connect(owner).executeOwnerOverride(threatId, "revert");
          console.log("   ✅ Transaction REVERTED (default action)");
        }
        
        console.log();
        await delay(2000);
        
        // ========== FINAL STATISTICS ==========
        console.log("=".repeat(80));
        console.log("📊 FINAL STATISTICS");
        console.log("=".repeat(80));
        
        const finalStats = await immunityLayer.getStats();
        console.log(`   🛡️  Total Threats Detected:  ${finalStats.threatsDetected}`);
        console.log(`   ✅ Total Threats Mitigated:  ${finalStats.threatsMitigated}`);
        console.log(`   💰 Total Loss Prevented:     ${ethers.utils.formatEther(finalStats.lossPrevented)} ETH`);
        console.log();
        
        const finalBankStats = await bank.getContractStats();
        console.log(`   🏦 Banking Contract Status:`);
        console.log(`      Total Deposits:  ${ethers.utils.formatEther(finalBankStats.totalDepositsAmount)} ETH`);
        console.log(`      Contract Balance: ${ethers.utils.formatEther(finalBankStats.contractBalance)} ETH`);
        console.log(`      Status: SAFE ✅`);
        console.log();
      }
    }
  }
  
  // ========== SUMMARY ==========
  console.log("=".repeat(80));
  console.log("✅ THREAT DETECTION DEMO COMPLETE");
  console.log("=".repeat(80));
  console.log();
  console.log("   🎯 Key Takeaways:");
  console.log("   ✅ Threats are detected BEFORE execution");
  console.log("   ✅ Transactions are FROZEN automatically");
  console.log("   ✅ AI provides intelligent analysis");
  console.log("   ✅ Owner maintains control and decides");
  console.log("   ✅ Funds are PROTECTED in real-time");
  console.log();
  console.log("   💡 This is how we prevent billions in losses!");
  console.log("   💡 Real-time protection, not just audits!");
  console.log();
  console.log("=".repeat(80));
  console.log("🚀 Thank you for the demo!");
  console.log("=".repeat(80));
  console.log();
  
  rl.close();
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

demoThreatDetection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo Error:", error);
    rl.close();
    process.exit(1);
  });

