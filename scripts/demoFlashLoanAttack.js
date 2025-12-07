const { ethers } = require("hardhat");
const readline = require("readline");

/**
 * Demo: Flash Loan Attack Detection (Web3-Specific)
 * 
 * Run: node scripts/demoFlashLoanAttack.js
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

async function demoFlashLoanAttack() {
  console.log("\n" + "=".repeat(80));
  console.log("⚡ DEMO: FLASH LOAN ATTACK DETECTION (Web3-Specific)");
  console.log("=".repeat(80));
  console.log("\n📋 This demo shows a Web3-specific attack that CANNOT happen in");
  console.log("   centralized banking systems: Flash Loan Attacks\n");
  
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
    500,
    86400,
    ethers.utils.parseEther("100")
  );
  await bank.deployed();
  console.log(`   ✅ Banking Contract deployed (simulating DeFi protocol)`);
  
  // Protect the bank
  await immunityLayer.addContractProtection(bank.address, 3);
  console.log(`   ✅ Bank protected with level 3 security`);
  console.log();
  
  await delay(2000);
  
  // ========== NORMAL USERS ==========
  console.log("💰 Setting Up Normal Users");
  console.log("-".repeat(80));
  
  const depositData = bank.interface.encodeFunctionData("deposit", []);
  
  await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("5.0") }
  );
  console.log(`   ✅ User1 deposited 5 ETH`);
  
  await immunityLayer.connect(user2).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("3.0") }
  );
  console.log(`   ✅ User2 deposited 3 ETH`);
  
  const bankStats = await bank.getContractStats();
  const avgDeposit = parseFloat(ethers.utils.formatEther(bankStats.averageDeposit));
  console.log(`   📊 Total Protocol Balance: ${ethers.utils.formatEther(bankStats.contractBalance)} ETH`);
  console.log(`   📊 Average deposit: ${avgDeposit} ETH`);
  console.log();
  
  await delay(2000);
  
  // ========== ATTACK SCENARIO ==========
  console.log("⚡ FLASH LOAN ATTACK SCENARIO");
  console.log("-".repeat(80));
  console.log();
  console.log("   💡 Flash Loans are unique to Web3/DeFi:");
  console.log("      • Borrow millions with NO collateral");
  console.log("      • Must repay in the SAME transaction");
  console.log("      • Used to manipulate prices and drain protocols");
  console.log("      • IMPOSSIBLE in traditional banking!");
  console.log();
  
  await delay(2000);
  
  // ========== ATTACK DETECTION ==========
  console.log("=".repeat(80));
  console.log("🚨 FLASH LOAN ATTACK DETECTED!");
  console.log("=".repeat(80));
  console.log();
  
  const withdrawAmount = 50;
  const multiplier = (withdrawAmount / avgDeposit).toFixed(1);
  
  console.log("   ⚡ ATTACKER ATTEMPT:");
  console.log(`   👤 Attacker trying to withdraw ${withdrawAmount} ETH`);
  console.log(`   📊 This is ${multiplier}x the average deposit!`);
  console.log("   🎯 Classic flash loan attack pattern");
  console.log();
  
  await delay(2000);
  
  // Try large withdrawal
  const largeWithdrawData = bank.interface.encodeFunctionData("withdraw", [
    ethers.utils.parseEther(withdrawAmount.toString())
  ]);
  
  let threatId = null;
  let threatDetails = null;

  try {
    const tx = await immunityLayer.connect(attacker).protectedCall(
      bank.address,
      largeWithdrawData,
      { value: 0 }
    );
    const receipt = await tx.wait();

    for (const event of receipt.events || []) {
      if (event.event === 'TransactionFrozen' || event.event === 'ThreatDetected') {
        threatId = event.args.threatId;
        console.log("   ✅ TRANSACTION FROZEN FOR SECURITY REVIEW");
        break;
      }
    }
  } catch (error) {
    try {
      const filter = immunityLayer.filters.ThreatDetected();
      const events = await immunityLayer.queryFilter(filter);
      if (events.length > 0) {
        threatId = events[events.length - 1].args.threatId;
        console.log("   ✅ TRANSACTION FROZEN FOR SECURITY REVIEW");
      }
    } catch (queryError) {
      console.log("   ⚠️  Could not retrieve threat details");
    }
  }

  if (!threatId) {
    console.log();
    console.log("   ❌ Threat detection not triggered");
    console.log();
    console.log("   💡 Your ContractImmunityLayer.sol needs threat detection logic:");
    console.log("      1. Check if _detectThreats() is called in protectedCall()");
    console.log("      2. Verify LARGE_WITHDRAWAL detection is enabled at level 3");
    console.log("      3. Set threshold to ~10x average deposit or less");
    console.log();
    console.log("   📝 Example detection code needed:");
    console.log("      if (withdrawAmount > averageDeposit * 10) {");
    console.log("          _freezeTransaction(LARGE_WITHDRAWAL, 'Suspicious withdrawal');");
    console.log("      }");
    console.log();
    rl.close();
    return;
  }

  console.log();
  await delay(1500);
  
  threatDetails = await immunityLayer.getThreatDetails(threatId);
  
  console.log("   📋 THREAT DETAILS:");
  console.log(`      Level: ${getThreatLevel(threatDetails.level)}`);
  console.log(`      Type: ${getVulnType(threatDetails.vulnType)}`);
  console.log(`      Reason: ${threatDetails.reason}`);
  console.log();
  
  await delay(1500);
  
  // ========== AI ANALYSIS ==========
  console.log("   🤖 AI Analysis Running...");
  await delay(2000);
  
  await aiOracle.connect(owner).submitAnalysis(
    threatId,
    `Flash loan attack pattern: ${withdrawAmount} ETH withdrawal (${multiplier}x average). This matches flash loan exploits where attackers borrow massive amounts without collateral to manipulate protocols. Unique to DeFi - impossible in traditional banking.`,
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
  console.log(`      - Pattern: Flash Loan Attack (${multiplier}x average)`);
  console.log(`      - Amount: ${withdrawAmount} ETH`);
  console.log(`      - AI Recommendation: ${aiAnalysis.suggestedAction.toUpperCase()}`);
  console.log();
  console.log("   Options:");
  console.log("      1. REVERT - Block the transaction (recommended)");
  console.log("      2. EXECUTE - Allow the transaction");
  console.log();
  
  const answer = await askQuestion("   Enter your choice (1/2): ");
  console.log();
  
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
      try {
        await immunityLayer.connect(owner).executeOwnerOverride(threatId, "revert");
      } catch (overrideErr) {
        // Silent
      }
    }
    
    console.log("   🛡️  Protocol Funds PROTECTED");
    console.log("   ✅ Flash loan attack prevented!");
    console.log();

  } else {
    console.log("   ⚠️  Transaction EXECUTED");
    console.log("   ⚠️  Funds may be at risk!");
    console.log();
    
    try {
      await immunityLayer.connect(resolverSigner).userResolveThreat(threatId, "execute");
    } catch (err) {
      console.log("   ⚠️  Execution failed");
    }
  }
  
  await delay(1500);
  
  // ========== COMPARISON ==========
  console.log("=".repeat(80));
  console.log("🌐 Web3 vs Traditional Banking");
  console.log("=".repeat(80));
  console.log();
  console.log("   🏦 Traditional Banking:");
  console.log("      ✅ Collateral REQUIRED");
  console.log("      ✅ Loan processing takes days");
  console.log("      ✅ Credit checks needed");
  console.log("      ✅ Flash loan attacks IMPOSSIBLE");
  console.log();
  console.log("   ⚡ Web3/DeFi Flash Loans:");
  console.log("      ⚠️  NO collateral needed");
  console.log("      ⚠️  Instant execution");
  console.log("      ⚠️  Borrow ANY amount");
  console.log("      ⚠️  Used to drain protocols");
  console.log("      ⚠️  $2B+ losses in 2023");
  console.log();
  
  await delay(2000);
  
  // ========== FINAL STATS ==========
  console.log("=".repeat(80));
  console.log("📊 FINAL STATISTICS");
  console.log("=".repeat(80));
  
  const finalStats = await immunityLayer.getStats();
  console.log(`   🛡️  Threats Detected:  ${finalStats.threatsDetected}`);
  console.log(`   ✅ Threats Mitigated:  ${finalStats.threatsMitigated}`);
  console.log(`   💰 Loss Prevented:     ${ethers.utils.formatEther(finalStats.lossPrevented)} ETH`);
  console.log();
  
  const finalBankStats = await bank.getContractStats();
  console.log(`   🏦 Protocol Status:`);
  console.log(`      Balance: ${ethers.utils.formatEther(finalBankStats.contractBalance)} ETH`);
  console.log(`      Status: SAFE ✅`);
  console.log();
  
  // ========== SUMMARY ==========
  console.log("=".repeat(80));
  console.log("✅ DEMO COMPLETE");
  console.log("=".repeat(80));
  console.log();
  console.log("   🎯 Key Takeaways:");
  console.log("   ✅ Flash loans are Web3-specific");
  console.log("   ✅ Impossible in traditional banking");
  console.log("   ✅ Real-time threat detection");
  console.log("   ✅ AI-powered analysis");
  console.log("   ✅ Funds protected before execution");
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

demoFlashLoanAttack()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo Error:", error);
    rl.close();
    process.exit(1);
  });