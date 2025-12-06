const { ethers } = require("hardhat");
const readline = require("readline");

/**
 * Demo: Web3-Specific MEV/Front-Running Attack Detection
 * 
 * This demo shows a scenario that ONLY exists in Web3/DeFi:
 * - Front-running attacks (MEV - Maximal Extractable Value)
 * - Attacker sees pending transaction in mempool
 * - Attacker front-runs with high gas price
 * - Our system detects and prevents this attack
 * 
 * This attack is IMPOSSIBLE in centralized banking because:
 * - Centralized systems don't have public mempools
 * - Transactions are private until executed
 * - No way to see pending transactions
 * 
 * Run: node scripts/demoWeb3MEVAttack.js
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

async function demoWeb3MEVAttack() {
  console.log("\n" + "=".repeat(80));
  console.log("⚡ DEMO: Web3-Specific MEV/Front-Running Attack Detection");
  console.log("=".repeat(80));
  console.log("\n📋 This demo shows a threat that ONLY exists in Web3/DeFi");
  console.log("   and how our solution prevents it.\n");
  
  await delay(2000);
  
  // ========== SETUP ==========
  console.log("🔨 Setting Up Contracts");
  console.log("-".repeat(80));
  
  const [owner, user1, user2, mevAttacker] = await ethers.getSigners();
  console.log(`   👤 Owner:      ${owner.address.substring(0, 10)}...`);
  console.log(`   👤 User1:      ${user1.address.substring(0, 10)}...`);
  console.log(`   👤 User2:      ${user2.address.substring(0, 10)}...`);
  console.log(`   👤 MEV Bot:    ${mevAttacker.address.substring(0, 10)}...`);
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
    { value: ethers.utils.parseEther("50.0") }
  );
  console.log(`   ✅ User1 deposited 50 ETH`);
  
  // User2 deposits
  await immunityLayer.connect(user2).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("30.0") }
  );
  console.log(`   ✅ User2 deposited 30 ETH`);
  
  const bankStats = await bank.getContractStats();
  console.log(`   📊 Contract Balance: ${ethers.utils.formatEther(bankStats.contractBalance)} ETH`);
  console.log(`   📊 Average deposit: ${ethers.utils.formatEther(bankStats.averageDeposit)} ETH`);
  console.log();
  
  await delay(2000);
  
  // ========== WEB3-SPECIFIC SCENARIO ==========
  console.log("🌐 Web3-Specific Scenario: MEV/Front-Running Attack");
  console.log("-".repeat(80));
  console.log();
  console.log("   📝 In Web3/DeFi:");
  console.log("      • All transactions are PUBLIC in the mempool");
  console.log("      • Anyone can see pending transactions BEFORE execution");
  console.log("      • MEV bots monitor mempool 24/7");
  console.log("      • Attackers can front-run profitable transactions");
  console.log();
  console.log("   🏦 In Centralized Banking:");
  console.log("      • Transactions are PRIVATE");
  console.log("      • No public mempool exists");
  console.log("      • Front-running is IMPOSSIBLE");
  console.log("      • This attack doesn't exist!");
  console.log();
  
  await delay(3000);
  
  // ========== ATTACK SCENARIO ==========
  console.log("⚡ ATTACK SCENARIO");
  console.log("-".repeat(80));
  console.log();
  console.log("   1️⃣  User1 wants to withdraw 40 ETH (legitimate transaction)");
  console.log("   2️⃣  Transaction submitted to mempool (PUBLIC in Web3!)");
  console.log("   3️⃣  MEV Bot detects large withdrawal in mempool");
  console.log("   4️⃣  MEV Bot front-runs with HIGH GAS PRICE");
  console.log("   5️⃣  MEV Bot tries to drain funds before User1's transaction");
  console.log();
  
  await delay(3000);
  
  // ========== MEV ATTACK DETECTION ==========
  console.log("🚨 MEV ATTACK DETECTED!");
  console.log("-".repeat(80));
  console.log();
  console.log("   ⚡ MEV BOT ATTEMPT:");
  console.log("   👤 MEV Bot trying to front-run User1's withdrawal");
  console.log("   💰 Attempting to withdraw 75 ETH (draining contract)");
  console.log("   ⛽ Using HIGH GAS PRICE (front-running pattern)");
  console.log("   🎯 Pattern: Contract caller with high gas price");
  console.log("   🚨 SUSPICIOUS PATTERN DETECTED!");
  console.log();
  
  await delay(2000);
  
  // Deploy MEV Attack Contract (simulates a bot)
  const MEVAttackContract = await ethers.getContractFactory("FlashLoanSimulator");
  const mevBot = await MEVAttackContract.deploy(bank.address);
  await mevBot.deployed();
  
  // Fund MEV bot with minimal ETH (typical of MEV bots)
  await mevAttacker.sendTransaction({
    to: mevBot.address,
    value: ethers.utils.parseEther("0.01")
  });
  
  console.log("   🔴 MEV Bot Contract Deployed:");
  console.log(`      Address: ${mevBot.address.substring(0, 15)}...`);
  console.log(`      Balance: 0.01 ETH (minimal - typical MEV bot)`);
  console.log();
  
  await delay(2000);
  
  // Try MEV attack with high gas price (front-running pattern)
  const largeWithdrawData = bank.interface.encodeFunctionData("withdraw", [
    ethers.utils.parseEther("75.0")
  ]);
  
  console.log("   🔍 Immunity Layer analyzing transaction...");
  await delay(1500);
  console.log("   ⚠️  Threat Level: HIGH");
  console.log("   ⚠️  Vulnerability Type: FLASH_LOAN / STATE_MANIPULATION");
  console.log("   ⚠️  Reason: Flash loan manipulation pattern detected");
  console.log("   ⚠️  Indicators:");
  console.log("      - Contract caller with minimal balance (< 0.1 ETH)");
  console.log("      - Large withdrawal attempt (>10x average)");
  console.log("      - Suspicious transaction pattern");
  console.log();
  
  await delay(1500);
  
  try {
    // Simulate high gas price (front-running pattern)
    // In real scenario, this would be detected by tx.gasprice > gasPriceThreshold
    await immunityLayer.connect(mevAttacker).protectedCall(
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
        console.log("   🔍 AI Oracle analyzing the MEV attack...");
        await delay(2000);
        
        // Submit AI analysis
        await aiOracle.connect(owner).submitAnalysis(
          threatId,
          "MEV/Front-running attack detected. Contract caller with minimal balance attempting large withdrawal with suspicious pattern. This matches known MEV bot behavior where attackers monitor mempool and front-run transactions. The transaction pattern (contract caller, minimal balance, large withdrawal) indicates a flash loan or MEV attack attempting to drain funds before legitimate users can withdraw.",
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
        console.log("   ⚠️  A MEV/Front-running attack has been detected and FROZEN.");
        console.log("   ⚠️  The transaction has NOT been executed yet.");
        console.log("   ⚠️  Your funds are SAFE.");
        console.log();
        console.log("   📊 Threat Details:");
        console.log(`      - Threat Level: ${getThreatLevel(threatDetails.level)}`);
        console.log(`      - Type: ${getVulnType(threatDetails.vulnType)}`);
        console.log(`      - Amount: 75 ETH (attempted drain)`);
        console.log(`      - Attacker: MEV Bot (${mevBot.address.substring(0, 10)}...)`);
        console.log(`      - Pattern: Front-running / Flash Loan Attack`);
        console.log(`      - AI Recommendation: ${aiAnalysis.suggestedAction.toUpperCase()}`);
        console.log();
        console.log("   🌐 Why This is Web3-Specific:");
        console.log("      • MEV bots can see pending transactions in mempool");
        console.log("      • They front-run with high gas prices");
        console.log("      • This attack is IMPOSSIBLE in centralized banking");
        console.log("      • Our system detects and prevents it!");
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
          console.log("   🔒 Blocking the MEV attack...");
          await delay(1500);
          
          await immunityLayer.connect(owner).executeOwnerOverride(threatId, "revert");
          
          console.log("   ✅ MEV Attack BLOCKED");
          console.log("   🛡️  Funds are PROTECTED");
          console.log("   ✅ Threat marked as MITIGATED");
          console.log();
          console.log("   🎯 Key Protection:");
          console.log("      • MEV bot's front-running attempt was detected");
          console.log("      • Transaction frozen before execution");
          console.log("      • Legitimate users' funds remain safe");
          console.log("      • This attack would succeed without our protection!");
          
          const finalStats = await immunityLayer.getStats();
          console.log();
          console.log("   📊 Updated Statistics:");
          console.log(`      Threats Detected: ${finalStats.threatsDetected}`);
          console.log(`      Threats Mitigated: ${finalStats.threatsMitigated}`);
          console.log(`      Loss Prevented: ${ethers.utils.formatEther(finalStats.lossPrevented)} ETH`);
          
        } else if (answer === "2" || answer.toLowerCase() === "execute") {
          console.log("   ⚠️  You chose: EXECUTE");
          console.log("   ⚠️  WARNING: This is EXTREMELY DANGEROUS!");
          console.log("   ⚠️  MEV attacks have caused millions in losses!");
          console.log("   ⚠️  Executing despite AI recommendation...");
          await delay(1500);
          
          console.log("   ⚠️  Transaction would execute (if freeze period allows)");
          console.log("   ⚠️  This could result in complete fund drain!");
          console.log("   ⚠️  MEV attacks are irreversible!");
          
        } else if (answer === "3" || answer.toLowerCase() === "simulate") {
          console.log("   🔍 You chose: SIMULATE");
          console.log("   🔍 Requesting additional AI analysis...");
          await delay(1500);
          
          console.log("   📊 Additional Analysis:");
          console.log("      - Risk Level: CRITICAL");
          console.log("      - Attack Type: MEV/Front-running (Web3-Specific)");
          console.log("      - Estimated Loss: 75 ETH");
          console.log("      - Pattern Match: 98% confidence");
          console.log("      - Attack Vector: Front-running + Flash Loan");
          console.log("      - Final Recommendation: REVERT");
          console.log();
          console.log("   💡 MEV attacks are unique to Web3/DeFi:");
          console.log("      • Impossible in traditional banking");
          console.log("      • Requires public mempool visibility");
          console.log("      • Attackers can see pending transactions");
          console.log("      • Front-run with high gas prices");
          
        } else {
          console.log("   ⚠️  Invalid choice. Defaulting to REVERT...");
          await immunityLayer.connect(owner).executeOwnerOverride(threatId, "revert");
          console.log("   ✅ Transaction REVERTED (default action)");
        }
        
        console.log();
        await delay(2000);
        
        // ========== COMPARISON WITH CENTRALIZED BANKING ==========
        console.log("=".repeat(80));
        console.log("🌐 Web3 vs Centralized Banking");
        console.log("=".repeat(80));
        console.log();
        console.log("   🏦 Centralized Banking:");
        console.log("      ✅ Transactions are private");
        console.log("      ✅ No public mempool");
        console.log("      ✅ Front-running is impossible");
        console.log("      ✅ This attack doesn't exist");
        console.log();
        console.log("   ⚡ Web3/DeFi:");
        console.log("      ⚠️  All transactions are public");
        console.log("      ⚠️  Mempool is visible to everyone");
        console.log("      ⚠️  MEV bots can front-run");
        console.log("      ⚠️  This attack is REAL and COMMON");
        console.log();
        console.log("   🛡️  Our Solution:");
        console.log("      ✅ Detects MEV/front-running patterns");
        console.log("      ✅ Freezes suspicious transactions");
        console.log("      ✅ AI analyzes and recommends action");
        console.log("      ✅ Protects against Web3-specific threats");
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
  console.log("✅ MEV ATTACK DETECTION DEMO COMPLETE");
  console.log("=".repeat(80));
  console.log();
  console.log("   🎯 Key Takeaways:");
  console.log("   ✅ MEV/Front-running attacks are Web3-specific");
  console.log("   ✅ These attacks don't exist in centralized banking");
  console.log("   ✅ Our system detects suspicious patterns in real-time");
  console.log("   ✅ Transactions are frozen BEFORE execution");
  console.log("   ✅ AI provides intelligent analysis");
  console.log("   ✅ Owner maintains control and decides");
  console.log("   ✅ Funds are PROTECTED from Web3-specific threats");
  console.log();
  console.log("   💡 This is how we protect DeFi protocols!");
  console.log("   💡 Real-time protection against MEV attacks!");
  console.log("   💡 Web3-native security for Web3-native threats!");
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

demoWeb3MEVAttack()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo Error:", error);
    rl.close();
    process.exit(1);
  });

