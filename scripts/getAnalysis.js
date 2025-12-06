const { ethers } = require("hardhat");

/**
 * Script to demonstrate how to get analysis output from the Smart Contract Immunity Layer
 * This script:
 * 1. Deploys all contracts
 * 2. Triggers a threat detection
 * 3. Retrieves and displays threat analysis
 * 4. Shows AI analysis results
 */

const THREAT_LEVELS = {
  0: "NONE",
  1: "LOW",
  2: "MEDIUM",
  3: "HIGH",
  4: "CRITICAL"
};

const VULNERABILITY_TYPES = {
  0: "REENTRANCY",
  1: "FLASH_LOAN",
  2: "STATE_MANIPULATION",
  3: "UNEXPECTED_ETH_FLOW",
  4: "UNSAFE_CALL",
  5: "ACCESS_CONTROL",
  6: "INTEGER_OVERFLOW",
  7: "LOGIC_ERROR",
  8: "UNKNOWN"
};

function formatAddress(addr) {
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}

function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}

async function getThreatAnalysis() {
  console.log("=".repeat(80));
  console.log("SMART CONTRACT IMMUNITY LAYER - ANALYSIS OUTPUT");
  console.log("=".repeat(80));
  console.log();

  const [owner, attacker, user1] = await ethers.getSigners();
  console.log("📋 Accounts:");
  console.log(`   Owner: ${owner.address}`);
  console.log(`   Attacker: ${attacker.address}`);
  console.log(`   User1: ${user1.address}`);
  console.log();

  // Step 1: Deploy Contracts
  console.log("🔨 Step 1: Deploying Contracts...");
  console.log("-".repeat(80));

  const ImmunityLayer = await ethers.getContractFactory("ContractImmunityLayer");
  const immunityLayer = await ImmunityLayer.deploy();
  await immunityLayer.deployed();
  console.log(`   ✓ Immunity Layer: ${immunityLayer.address}`);

  const AIOracle = await ethers.getContractFactory("AIAnalysisOracle");
  const aiOracle = await AIOracle.deploy(immunityLayer.address);
  await aiOracle.deployed();
  console.log(`   ✓ AI Oracle: ${aiOracle.address}`);

  await immunityLayer.setAIOracle(aiOracle.address);
  console.log(`   ✓ AI Oracle linked to Immunity Layer`);

  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
  const bank = await VulnerableBank.deploy(immunityLayer.address);
  await bank.deployed();
  console.log(`   ✓ Vulnerable Bank: ${bank.address}`);

  await immunityLayer.addContractProtection(bank.address, 3);
  console.log(`   ✓ Bank protected with level 3 security`);
  console.log();

  // Step 2: Setup - Deposit funds
  console.log("💰 Step 2: Setting up test scenario...");
  console.log("-".repeat(80));

  const depositData = bank.interface.encodeFunctionData("deposit", []);
  const depositTx = await immunityLayer.connect(owner).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("5.0") }
  );
  await depositTx.wait();
  console.log(`   ✓ Deposited 5.0 ETH to bank`);
  console.log(`   ✓ Bank balance: ${ethers.utils.formatEther(await bank.getBalance())} ETH`);
  console.log();

  // Step 3: Deploy malicious contract
  console.log("⚠️  Step 3: Deploying malicious contract...");
  console.log("-".repeat(80));

  const MockMalicious = await ethers.getContractFactory("MockMalicious");
  const malicious = await MockMalicious.deploy(bank.address);
  await malicious.deployed();
  console.log(`   ✓ Malicious Contract: ${malicious.address}`);

  await owner.sendTransaction({
    to: malicious.address,
    value: ethers.utils.parseEther("0.1")
  });
  console.log(`   ✓ Funded malicious contract with 0.1 ETH`);
  console.log();

  // Step 4: Trigger threat detection
  console.log("🚨 Step 4: Triggering threat detection...");
  console.log("-".repeat(80));

  const withdrawData = bank.interface.encodeFunctionData("withdraw", [
    ethers.utils.parseEther("0.1")
  ]);

  let threatId = null;
  try {
    await immunityLayer.connect(owner).protectedCall(
      bank.address,
      withdrawData,
      { value: 0 }
    );
  } catch (error) {
    if (error.message.includes("Transaction frozen")) {
      console.log(`   ✓ Threat detected! Transaction frozen for security review`);
      
      // Get threat ID from events
      const filter = immunityLayer.filters.ThreatDetected();
      const events = await immunityLayer.queryFilter(filter);
      if (events.length > 0) {
        threatId = events[events.length - 1].args.threatId;
        console.log(`   ✓ Threat ID: ${threatId}`);
      }
    } else {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }
  console.log();

  if (!threatId) {
    console.log("❌ No threat detected. Trying alternative method...");
    
    // Try to get threat ID from transaction hash
    const withdrawData2 = bank.interface.encodeFunctionData("withdraw", [
      ethers.utils.parseEther("0.5")
    ]);
    
    try {
      const tx = await immunityLayer.connect(owner).protectedCall(
        bank.address,
        withdrawData2,
        { value: 0 }
      );
      await tx.wait();
      
      // Query recent events
      const filter = immunityLayer.filters.ThreatDetected();
      const events = await immunityLayer.queryFilter(filter, -10);
      if (events.length > 0) {
        threatId = events[events.length - 1].args.threatId;
        console.log(`   ✓ Threat ID found: ${threatId}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not trigger threat: ${error.message}`);
      return;
    }
  }

  if (!threatId) {
    console.log("❌ Could not retrieve threat ID. Exiting...");
    return;
  }

  // Step 5: Get Threat Details
  console.log("📊 Step 5: Retrieving Threat Details...");
  console.log("-".repeat(80));

  const threatDetails = await immunityLayer.getThreatDetails(threatId);
  
  console.log("\n   🔍 THREAT ANALYSIS REPORT");
  console.log("   " + "=".repeat(70));
  console.log(`   Threat ID:        ${threatId}`);
  console.log(`   Caller:           ${formatAddress(threatDetails.caller)}`);
  console.log(`   Target Contract:  ${formatAddress(threatDetails.target)}`);
  console.log(`   Timestamp:        ${formatTimestamp(threatDetails.timestamp)}`);
  console.log(`   Threat Level:     ${THREAT_LEVELS[threatDetails.level]} (${threatDetails.level})`);
  console.log(`   Vulnerability:    ${VULNERABILITY_TYPES[threatDetails.vulnType]}`);
  console.log(`   Reason:           ${threatDetails.reason}`);
  console.log(`   Is Frozen:        ${threatDetails.isFrozen ? "✅ YES" : "❌ NO"}`);
  console.log(`   Is Mitigated:     ${threatDetails.isMitigated ? "✅ YES" : "❌ NO"}`);
  if (threatDetails.freezeUntil > 0) {
    console.log(`   Freeze Until:     Block ${threatDetails.freezeUntil}`);
  }
  console.log();

  // Step 6: Submit AI Analysis
  console.log("🤖 Step 6: Submitting AI Analysis...");
  console.log("-".repeat(80));

  const analysis = "Reentrancy vulnerability detected. The withdraw function updates balance after external call, allowing attacker to drain funds through recursive calls.";
  const suggestedAction = "revert";
  const isCritical = true;

  const submitTx = await aiOracle.connect(owner).submitAnalysis(
    threatId,
    analysis,
    suggestedAction,
    isCritical
  );
  await submitTx.wait();
  console.log(`   ✓ AI Analysis submitted`);
  console.log();

  // Step 7: Get AI Analysis Results
  console.log("📈 Step 7: Retrieving AI Analysis Results...");
  console.log("-".repeat(80));

  const aiAnalysis = await aiOracle.getAnalysis(threatId);
  
  console.log("\n   🤖 AI ANALYSIS REPORT");
  console.log("   " + "=".repeat(70));
  console.log(`   Analysis Status:  ${aiAnalysis.completed ? "✅ COMPLETED" : "⏳ PENDING"}`);
  console.log(`   Analysis:`);
  console.log(`   ${aiAnalysis.analysis.split('\n').map(line => `   ${line}`).join('\n')}`);
  console.log(`   Suggested Action: ${aiAnalysis.suggestedAction.toUpperCase()}`);
  console.log();

  // Step 8: Get System Statistics
  console.log("📊 Step 8: System Statistics...");
  console.log("-".repeat(80));

  const stats = await immunityLayer.getStats();
  console.log(`   Total Threats Detected:  ${stats.threatsDetected}`);
  console.log(`   Total Threats Mitigated: ${stats.threatsMitigated}`);
  console.log(`   Total Loss Prevented:     ${ethers.utils.formatEther(stats.lossPrevented)} ETH`);
  console.log();

  // Step 9: Owner Override (if needed)
  console.log("🔧 Step 9: Owner Actions Available...");
  console.log("-".repeat(80));
  console.log(`   You can execute owner override with:`);
  console.log(`   - executeOwnerOverride(threatId, "execute") - Execute the transaction`);
  console.log(`   - executeOwnerOverride(threatId, "revert") - Permanently revert`);
  console.log(`   - executeOwnerOverride(threatId, "simulate") - Request more analysis`);
  console.log();

  // Final Summary
  console.log("=".repeat(80));
  console.log("✅ ANALYSIS COMPLETE");
  console.log("=".repeat(80));
  console.log();
  console.log("Summary:");
  console.log(`  • Threat detected and frozen`);
  console.log(`  • AI analysis completed`);
  console.log(`  • Suggested action: ${aiAnalysis.suggestedAction}`);
  console.log(`  • System protected ${stats.threatsDetected} threat(s)`);
  console.log();
  console.log("To view this analysis again, use:");
  console.log(`  const threatDetails = await immunityLayer.getThreatDetails("${threatId}");`);
  console.log(`  const aiAnalysis = await aiOracle.getAnalysis("${threatId}");`);
  console.log();
}

// Execute the script
getThreatAnalysis()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

