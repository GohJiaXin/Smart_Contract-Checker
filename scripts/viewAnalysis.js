const { ethers } = require("hardhat");

/**
 * Script to view analysis for a specific threat ID
 * Usage: npx hardhat run scripts/viewAnalysis.js --network localhost
 *        (or modify threatId variable below)
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

async function viewAnalysis() {
  // ============================================
  // CONFIGURATION - Modify these values
  // ============================================
  const IMMUNITY_LAYER_ADDRESS = process.env.IMMUNITY_LAYER_ADDRESS || "";
  const AI_ORACLE_ADDRESS = process.env.AI_ORACLE_ADDRESS || "";
  const THREAT_ID = process.env.THREAT_ID || ""; // Set this to view specific threat
  
  if (!IMMUNITY_LAYER_ADDRESS || !AI_ORACLE_ADDRESS) {
    console.log("❌ Error: Please set IMMUNITY_LAYER_ADDRESS and AI_ORACLE_ADDRESS");
    console.log("   Or run getAnalysis.js first to get the addresses");
    return;
  }

  console.log("=".repeat(80));
  console.log("VIEW THREAT ANALYSIS");
  console.log("=".repeat(80));
  console.log();

  const [owner] = await ethers.getSigners();
  
  // Get contract instances
  const ImmunityLayer = await ethers.getContractFactory("ContractImmunityLayer");
  const immunityLayer = ImmunityLayer.attach(IMMUNITY_LAYER_ADDRESS);

  const AIOracle = await ethers.getContractFactory("AIAnalysisOracle");
  const aiOracle = AIOracle.attach(AI_ORACLE_ADDRESS);

  // If threat ID is provided, view that specific threat
  if (THREAT_ID) {
    await viewSpecificThreat(immunityLayer, aiOracle, THREAT_ID);
    return;
  }

  // Otherwise, list all threats
  console.log("📋 Listing all detected threats...");
  console.log("-".repeat(80));
  console.log();

  // Query all ThreatDetected events
  const filter = immunityLayer.filters.ThreatDetected();
  const events = await immunityLayer.queryFilter(filter);

  if (events.length === 0) {
    console.log("   No threats detected yet.");
    console.log("   Run getAnalysis.js to trigger a threat detection.");
    return;
  }

  console.log(`   Found ${events.length} threat(s):\n`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const threatId = event.args.threatId;
    
    console.log(`   [${i + 1}] Threat ID: ${threatId}`);
    console.log(`       Target: ${formatAddress(event.args.targetContract)}`);
    console.log(`       Caller: ${formatAddress(event.args.caller)}`);
    console.log(`       Level: ${THREAT_LEVELS[event.args.level]}`);
    console.log(`       Type: ${VULNERABILITY_TYPES[event.args.vulnType]}`);
    console.log();
  }

  // Show details for the most recent threat
  if (events.length > 0) {
    const latestThreatId = events[events.length - 1].args.threatId;
    console.log("=".repeat(80));
    console.log("Viewing most recent threat:");
    console.log("=".repeat(80));
    await viewSpecificThreat(immunityLayer, aiOracle, latestThreatId);
  }
}

async function viewSpecificThreat(immunityLayer, aiOracle, threatId) {
  try {
    // Get threat details
    const threatDetails = await immunityLayer.getThreatDetails(threatId);
    
    console.log("\n   🔍 THREAT ANALYSIS REPORT");
    console.log("   " + "=".repeat(70));
    console.log(`   Threat ID:        ${threatId}`);
    console.log(`   Caller:           ${threatDetails.caller}`);
    console.log(`   Target Contract:  ${threatDetails.target}`);
    console.log(`   Timestamp:        ${formatTimestamp(threatDetails.timestamp)}`);
    console.log(`   Threat Level:     ${THREAT_LEVELS[threatDetails.level]} (${threatDetails.level})`);
    console.log(`   Vulnerability:    ${VULNERABILITY_TYPES[threatDetails.vulnType]}`);
    console.log(`   Reason:           ${threatDetails.reason}`);
    console.log(`   Is Frozen:        ${threatDetails.isFrozen ? "✅ YES" : "❌ NO"}`);
    console.log(`   Is Mitigated:     ${threatDetails.isMitigated ? "✅ YES" : "❌ NO"}`);
    if (threatDetails.freezeUntil > 0) {
      const currentBlock = await ethers.provider.getBlockNumber();
      console.log(`   Freeze Until:     Block ${threatDetails.freezeUntil} (Current: ${currentBlock})`);
    }
    console.log();

    // Get AI Analysis
    try {
      const aiAnalysis = await aiOracle.getAnalysis(threatId);
      
      if (aiAnalysis.completed) {
        console.log("   🤖 AI ANALYSIS REPORT");
        console.log("   " + "=".repeat(70));
        console.log(`   Analysis Status:  ✅ COMPLETED`);
        console.log(`   Analysis:`);
        const analysisLines = aiAnalysis.analysis.split('\n');
        analysisLines.forEach(line => {
          if (line.trim()) {
            console.log(`   ${line}`);
          }
        });
        console.log(`   Suggested Action: ${aiAnalysis.suggestedAction.toUpperCase()}`);
        console.log();
      } else {
        console.log("   🤖 AI ANALYSIS REPORT");
        console.log("   " + "=".repeat(70));
        console.log(`   Analysis Status:  ⏳ PENDING`);
        console.log(`   Analysis has not been completed yet.`);
        console.log();
      }
    } catch (error) {
      console.log("   ⚠️  Could not retrieve AI analysis:", error.message);
      console.log();
    }

    // Get System Stats
    const stats = await immunityLayer.getStats();
    console.log("   📊 SYSTEM STATISTICS");
    console.log("   " + "=".repeat(70));
    console.log(`   Total Threats Detected:  ${stats.threatsDetected}`);
    console.log(`   Total Threats Mitigated: ${stats.threatsMitigated}`);
    console.log(`   Total Loss Prevented:     ${ethers.utils.formatEther(stats.lossPrevented)} ETH`);
    console.log();

  } catch (error) {
    console.log(`   ❌ Error retrieving threat details: ${error.message}`);
  }
}

viewAnalysis()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

