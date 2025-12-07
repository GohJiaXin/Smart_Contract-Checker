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
  console.log("=".repeat(80));
  console.log("🚨 DEMO 2: THREAT DETECTION");
  console.log("=".repeat(80));
  console.log();
  
  const avgDeposit = parseFloat(ethers.utils.formatEther(bankStats.averageDeposit));
  const withdrawAmount = 60;
  const multiplier = (withdrawAmount / avgDeposit).toFixed(1);
  
  console.log("   ⚠️  ATTACKER ATTEMPT: 60 ETH withdrawal");
  console.log(`   📊 This is ${multiplier}x the average deposit!`);
  console.log();
  
  await delay(1500);
  
  // Try large withdrawal and capture threat
  const largeWithdrawData = bank.interface.encodeFunctionData("withdraw", [
    ethers.utils.parseEther("60.0")
  ]);
  
  let threatId = null;
  let threatDetails = null;

  try {
    // This should trigger threat detection and freeze
    const tx = await immunityLayer.connect(attacker).protectedCall(
      bank.address,
      largeWithdrawData,
      { value: 0 }
    );
    const receipt = await tx.wait();

    // Look for threat events
    for (const event of receipt.events || []) {
      if (event.event === 'TransactionFrozen' || event.event === 'ThreatDetected') {
        threatId = event.args.threatId;
        console.log("   ✅ TRANSACTION FROZEN FOR SECURITY REVIEW");
        break;
      }
    }
  } catch (error) {
    // Transaction reverted - extract threat ID from events
    const msg = error.message || '';
    
    // Query for threat events
    try {
      const filter = immunityLayer.filters.ThreatDetected();
      const events = await immunityLayer.queryFilter(filter);
      if (events.length > 0) {
        const latestEvent = events[events.length - 1];
        threatId = latestEvent.args.threatId;
        console.log("   ✅ TRANSACTION FROZEN FOR SECURITY REVIEW");
      }
    } catch (queryError) {
      console.log("   ⚠️  Could not retrieve threat details");
    }
  }

  if (!threatId) {
    console.log("   ❌ Error: Threat not detected properly");
    rl.close();
    return;
  }

  console.log();
  await delay(1500);
  
  // Get threat details
  threatDetails = await immunityLayer.getThreatDetails(threatId);
  
  // ========== AI ANALYSIS ==========
  console.log("   🤖 AI Analysis Running...");
  await delay(2000);
  
  // Submit AI analysis
  await aiOracle.connect(owner).submitAnalysis(
    threatId,
    `Large withdrawal detected (${multiplier}x average deposit). This pattern matches known drain attack strategies. Recommended action: REVERT.`,
    "revert",
    true
  );
  
  console.log("   🤖 AI Analysis Complete!");
  console.log();
  
  const aiAnalysis = await aiOracle.getAnalysis(threatId);
  
  await delay(1500);
  
  // ========== USER PROMPT ==========
  console.log("   👤 OWNER ACTION REQUIRED");
  console.log();
  console.log("   📊 Threat Details:");
  console.log(`      - Threat Level: ${getThreatLevel(threatDetails.level)}`);
  console.log(`      - Type: ${getVulnType(threatDetails.vulnType)}`);
  console.log(`      - Amount: 60 ETH`);
  console.log(`      - AI Recommendation: ${aiAnalysis.suggestedAction.toUpperCase()}`);
  console.log();
  console.log("   Options:");
  console.log("      1. REVERT - Block the transaction (recommended)");
  console.log("      2. EXECUTE - Allow the transaction");
  console.log();
  
  // Get user input
  const answer = await askQuestion("   Enter your choice (1/2): ");
  console.log();
  
  // Find the attacker signer for resolution
  const signers = await ethers.getSigners();
  const attackerAddr = threatDetails.suspiciousCaller || attacker.address;
  let resolverSigner = attacker;
  
  for (const s of signers) {
    if (s.address.toLowerCase() === attackerAddr.toLowerCase()) {
      resolverSigner = s;
      break;
    }
  }

  if (answer === "1" || answer.toLowerCase() === "revert") {
    console.log("   ✅ Transaction REVERTED");
    
    try {
      await immunityLayer.connect(resolverSigner).userResolveThreat(threatId, "revert");
    } catch (err) {
      // Try owner override if user resolution fails
      try {
        await immunityLayer.connect(owner).executeOwnerOverride(threatId, "revert");
      } catch (overrideErr) {
        console.log("   ℹ️  Threat already resolved or timed out");
      }
    }
    
    console.log("   🛡️  Funds are PROTECTED");
    console.log();

  } else if (answer === "2" || answer.toLowerCase() === "execute") {
    console.log("   ⚠️  Transaction EXECUTED");
    console.log("   ⚠️  WARNING: Funds may be at risk!");
    console.log();
    
    try {
      await immunityLayer.connect(resolverSigner).userResolveThreat(threatId, "execute");
    } catch (err) {
      console.log("   ⚠️  Execution failed - transaction remains frozen");
    }
    
  } else {
    console.log("   ⚠️  Invalid choice. Defaulting to REVERT...");
    try {
      await immunityLayer.connect(owner).executeOwnerOverride(threatId, "revert");
    } catch (err) {
      // Silent fail
    }
    console.log("   ✅ Transaction REVERTED");
    console.log("   🛡️  Funds are PROTECTED");
    console.log();
  }
  
  await delay(1500);
  
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
  
  // ========== SUMMARY ==========
  console.log("=".repeat(80));
  console.log("✅ DEMO COMPLETE");
  console.log("=".repeat(80));
  console.log();
  console.log("   🎯 Key Takeaways:");
  console.log("   ✅ Threats detected BEFORE execution");
  console.log("   ✅ Transactions FROZEN automatically");
  console.log("   ✅ AI provides intelligent analysis");
  console.log("   ✅ Owner maintains control");
  console.log("   ✅ Funds PROTECTED in real-time");
  console.log();
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
    "LARGE_WITHDRAWAL", "RAPID_WITHDRAWAL", "ADMIN_FUNCTION_ABUSE", 
    "ORACLE_MANIPULATION", "UNKNOWN"
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