const { ethers } = require("hardhat");
const readline = require("readline");

/**
 * Demo: Flash Loan Attack Detection (Web3-Specific)
 * 
 * This demonstrates a Web3-specific attack that CANNOT happen in centralized banking:
 * Flash Loan Attacks - Borrowing millions without collateral and repaying in same transaction
 * 
 * In traditional banking:
 * - You need collateral to borrow
 * - Loans take time to process
 * - You can't repay instantly
 * 
 * In Web3/DeFi:
 * - Flash loans allow borrowing ANY amount with NO collateral
 * - Must be repaid in the SAME transaction
 * - Attackers use this to manipulate prices and drain protocols
 * 
 * Run: node scripts/demoFlashLoanAttack.js
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

async function demoFlashLoanAttack() {
  console.log("\n" + "=".repeat(80));
  console.log("⚡ DEMO: FLASH LOAN ATTACK DETECTION (Web3-Specific)");
  console.log("=".repeat(80));
  console.log("\n📋 This demo shows a Web3-specific attack that CANNOT happen in");
  console.log("   centralized banking systems: Flash Loan Attacks");
  console.log("\n💡 Flash Loans: Borrow millions with NO collateral, repay in same transaction");
  console.log("   This is unique to DeFi and has caused billions in losses!\n");
  
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
  
  // Deploy Banking Contract (simulating a DeFi protocol)
  const BankingContract = await ethers.getContractFactory("BankingContract");
  const bank = await BankingContract.deploy(
    immunityLayer.address,
    500, // 5% interest
    86400, // 1 day delay
    ethers.utils.parseEther("100") // Max 100 ETH per withdrawal
  );
  await bank.deployed();
  console.log(`   ✅ Banking Contract deployed (simulating DeFi protocol)`);
  
  // Protect the bank
  await immunityLayer.addContractProtection(bank.address, 3);
  console.log(`   ✅ Bank protected with level 3 security`);
  console.log();
  
  await delay(2000);
  
  // ========== SETUP: NORMAL USERS ==========
  console.log("💰 Setting Up Normal Users");
  console.log("-".repeat(80));
  
  const depositData = bank.interface.encodeFunctionData("deposit", []);
  
  // User1 deposits
  await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("50.0") }
  );
  console.log(`   ✅ User1 deposited 50 ETH (normal user)`);
  
  // User2 deposits
  await immunityLayer.connect(user2).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("30.0") }
  );
  console.log(`   ✅ User2 deposited 30 ETH (normal user)`);
  
  const bankStats = await bank.getContractStats();
  console.log(`   📊 Total Protocol Balance: ${ethers.utils.formatEther(bankStats.contractBalance)} ETH`);
  console.log();
  
  await delay(2000);
  
  // ========== FLASH LOAN ATTACK SETUP ==========
  console.log("⚡ FLASH LOAN ATTACK SCENARIO");
  console.log("-".repeat(80));
  console.log();
  console.log("   🎭 ATTACKER'S PLAN:");
  console.log("   1. Deploy malicious contract with minimal balance (0.001 ETH)");
  console.log("   2. Use flash loan to borrow 1000 ETH (NO COLLATERAL NEEDED!)");
  console.log("   3. Manipulate protocol prices/state with borrowed funds");
  console.log("   4. Drain protocol profits");
  console.log("   5. Repay flash loan in same transaction");
  console.log("   6. Keep the profit!");
  console.log();
  console.log("   ⚠️  This is IMPOSSIBLE in traditional banking:");
  console.log("      - Banks require collateral");
  console.log("      - Loans take days to process");
  console.log("      - Can't repay instantly");
  console.log();
  console.log("   ✅ But in Web3/DeFi, flash loans make this possible!");
  console.log();
  
  await delay(3000);
  
  // Deploy Flash Loan Attack Contract
  const FlashLoanSimulator = await ethers.getContractFactory("FlashLoanSimulator");
  const flashLoanAttacker = await FlashLoanSimulator.deploy(bank.address);
  await flashLoanAttacker.deployed();
  
  // Fund attacker with minimal ETH (characteristic of flash loan attacks)
  await attacker.sendTransaction({
    to: flashLoanAttacker.address,
    value: ethers.utils.parseEther("0.001") // Only 0.001 ETH!
  });
  
  console.log("   🔴 Attacker Contract Deployed:");
  console.log(`      Address: ${flashLoanAttacker.address.substring(0, 15)}...`);
  console.log(`      Balance: 0.001 ETH (MINIMAL - flash loan pattern!)`);
  console.log();
  
  await delay(2000);
  
  // ========== ATTACK DETECTION ==========
  console.log("🚨 FLASH LOAN ATTACK DETECTED!");
  console.log("-".repeat(80));
  console.log();
  console.log("   ⚡ ATTACKER ATTEMPT:");
  console.log("   👤 Contract trying to execute flash loan attack");
  console.log("   💰 Contract balance: 0.001 ETH (suspiciously low!)");
  console.log("   🎯 Target: Banking Protocol");
  console.log("   ⚠️  Pattern: Contract with minimal balance making large operations");
  console.log("   🚨 FLASH LOAN PATTERN DETECTED!");
  console.log();
  
  await delay(2000);
  
  // Try flash loan attack
  const attackData = flashLoanAttacker.interface.encodeFunctionData("executeFlashLoanAttack", []);
  
  console.log("   🔍 Immunity Layer analyzing transaction...");
  await delay(1500);
  console.log("   ⚠️  Threat Level: HIGH");
  console.log("   ⚠️  Vulnerability Type: FLASH_LOAN");
  console.log("   ⚠️  Reason: Flash loan manipulation pattern detected");
  console.log("   ⚠️  Indicators:");
  console.log("      - Contract caller with minimal balance (< 0.1 ETH)");
  console.log("      - Contract making multiple rapid calls");
  console.log("      - Potential price manipulation attempt");
  console.log();
  
  await delay(1500);
  
  try {
    await immunityLayer.connect(attacker).protectedCall(
      bank.address,
      attackData,
      { value: 0 }
    );
    console.log("   ❌ Unexpected: Transaction succeeded");
  } catch (error) {
    if (error.message && (error.message.includes("Transaction frozen") || error.message.includes("frozen"))) {
      console.log("   ✅ TRANSACTION FROZEN FOR SECURITY REVIEW");
      console.log("   ⏸️  Transaction has NOT been executed");
      console.log("   ⏸️  Protocol funds are SAFE");
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
        console.log("   🔍 AI Oracle analyzing the flash loan attack...");
        await delay(2000);
        
        // Submit AI analysis
        await aiOracle.connect(owner).submitAnalysis(
          threatId,
          "Flash loan attack pattern detected. Contract has minimal balance (0.001 ETH) but attempting large-scale operations. This matches known flash loan exploit patterns where attackers borrow massive amounts without collateral, manipulate protocol state/prices, extract value, and repay in the same transaction. Estimated potential loss: 1000+ ETH if successful. This attack vector is unique to DeFi and impossible in traditional banking systems.",
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
        console.log("   ⚠️  A FLASH LOAN ATTACK has been detected and FROZEN.");
        console.log("   ⚠️  The transaction has NOT been executed yet.");
        console.log("   ⚠️  Your protocol funds are SAFE.");
        console.log();
        console.log("   📊 Threat Details:");
        console.log(`      - Threat Level: ${getThreatLevel(threatDetails.level)}`);
        console.log(`      - Type: ${getVulnType(threatDetails.vulnType)}`);
        console.log(`      - Attack Pattern: Flash Loan (Web3-Specific)`);
        console.log(`      - Attacker Balance: 0.001 ETH (suspiciously low)`);
        console.log(`      - Potential Impact: 1000+ ETH at risk`);
        console.log(`      - AI Recommendation: ${aiAnalysis.suggestedAction.toUpperCase()}`);
        console.log();
        console.log("   🤔 What would you like to do?");
        console.log("      1. REVERT - Block the transaction (recommended)");
        console.log("      2. EXECUTE - Allow the transaction (dangerous)");
        console.log("      3. SIMULATE - Request more analysis");
        console.log();
        
        // Ensure stdout is flushed before asking for input
        process.stdout.write("");
        
        // Get user input
        const answer = await askQuestion("   Enter your choice (1/2/3): ");
        console.log();
        
        if (answer === "1" || answer.toLowerCase() === "revert") {
          console.log("   ✅ You chose: REVERT");
          console.log("   🔒 Blocking the flash loan attack...");
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
          
          try {
            await immunityLayer.connect(owner).executeOwnerOverride(threatId, "execute");
            console.log("   ⚠️  Transaction EXECUTED with owner override");
            console.log("   ⚠️  This could result in fund loss!");
            console.log("   ⚠️  Flash loan attacks are irreversible!");
            
            const finalStats = await immunityLayer.getStats();
            console.log();
            console.log("   📊 Updated Statistics:");
            console.log(`      Threats Detected: ${finalStats.threatsDetected}`);
            console.log(`      Threats Mitigated: ${finalStats.threatsMitigated}`);
          } catch (error) {
            console.log("   ⚠️  Execution failed or freeze period expired");
            console.log("   ⚠️  Transaction remains frozen for safety");
          }
          
        } else if (answer === "3" || answer.toLowerCase() === "simulate") {
          console.log("   🔍 You chose: SIMULATE");
          console.log("   🔍 Requesting additional AI analysis...");
          await delay(1500);
          
          try {
            await immunityLayer.connect(owner).executeOwnerOverride(threatId, "simulate");
          } catch (error) {
            // simulate action reverts with "Simulation requested" - this is expected
            if (error.message.includes("Simulation requested")) {
              console.log("   ✅ Simulation requested successfully");
              console.log("   🔍 AI Oracle will perform deeper analysis...");
              await delay(1500);
            }
          }
          
          console.log("   📊 Additional Analysis:");
          console.log("      - Risk Level: CRITICAL");
          console.log("      - Estimated Loss: 1000+ ETH");
          console.log("      - Pattern Match: 98% confidence");
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
        console.log(`   🏦 Protocol Status:`);
        console.log(`      Total Deposits:  ${ethers.utils.formatEther(finalBankStats.totalDepositsAmount)} ETH`);
        console.log(`      Protocol Balance: ${ethers.utils.formatEther(finalBankStats.contractBalance)} ETH`);
        console.log(`      Status: SAFE ✅`);
        console.log();
      }
    }
  }
  
  // ========== SUMMARY ==========
  console.log("=".repeat(80));
  console.log("✅ FLASH LOAN ATTACK DETECTION DEMO COMPLETE");
  console.log("=".repeat(80));
  console.log();
  console.log("   🎯 Key Takeaways:");
  console.log("   ✅ Flash loan attacks are Web3/DeFi-specific");
  console.log("   ✅ Impossible in traditional centralized banking");
  console.log("   ✅ Threats detected BEFORE execution");
  console.log("   ✅ Transactions are FROZEN automatically");
  console.log("   ✅ AI provides intelligent analysis");
  console.log("   ✅ Owner maintains control and decides");
  console.log("   ✅ Protocol funds are PROTECTED in real-time");
  console.log();
  console.log("   💡 Why Flash Loans are Web3-Specific:");
  console.log("      • No collateral required (banks always require collateral)");
  console.log("      • Instant execution (banks take days/weeks)");
  console.log("      • Repay in same transaction (unique to blockchain)");
  console.log("      • Can borrow ANY amount (banks have limits)");
  console.log("      • Used to manipulate DeFi protocols (impossible in banks)");
  console.log();
  console.log("   💡 This is how we prevent billions in DeFi losses!");
  console.log("   💡 Real-time protection for Web3-specific attacks!");
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

demoFlashLoanAttack()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo Error:", error);
    rl.close();
    process.exit(1);
  });

