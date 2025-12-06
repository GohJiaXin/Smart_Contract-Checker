# How to Get Analysis Output from Smart Contract Immunity Layer

This guide explains how to run the project and retrieve threat analysis results.

## Quick Start

### Option 1: Run Complete Analysis Demo (Recommended)

This script deploys contracts, triggers a threat, and displays the complete analysis:

```bash
npm run analyze
```

Or for local network:
```bash
npm run analyze:local
```

This will:
1. ✅ Deploy all contracts (Immunity Layer, AI Oracle, Vulnerable Bank)
2. ✅ Set up a test scenario with funds
3. ✅ Trigger a threat detection
4. ✅ Display threat details
5. ✅ Submit and retrieve AI analysis
6. ✅ Show system statistics

### Option 2: View Existing Analysis

To view analysis for threats that were already detected:

```bash
npm run view
```

Or for local network:
```bash
npm run view:local
```

To view a specific threat ID:
```bash
THREAT_ID=0x... npm run view:local
```

## Step-by-Step Manual Process

### 1. Start Local Hardhat Network (Optional)

If you want to use a local network:

```bash
npm run node
```

Keep this terminal open. In another terminal, run the scripts.

### 2. Deploy Contracts

```bash
npm run deploy:local
```

This will output contract addresses. Save these for later use.

### 3. Run Analysis Script

```bash
npm run analyze:local
```

This script will:
- Deploy all contracts automatically
- Trigger a reentrancy attack simulation
- Display formatted analysis output

## Understanding the Output

### Threat Details

The analysis output includes:

- **Threat ID**: Unique identifier for the threat
- **Caller**: Address that triggered the threat
- **Target Contract**: Contract being attacked
- **Threat Level**: NONE, LOW, MEDIUM, HIGH, or CRITICAL
- **Vulnerability Type**: REENTRANCY, FLASH_LOAN, etc.
- **Reason**: Explanation of why it was flagged
- **Is Frozen**: Whether transaction is frozen
- **Is Mitigated**: Whether threat was handled

### AI Analysis

The AI Oracle provides:

- **Analysis**: Detailed explanation of the threat
- **Suggested Action**: Recommended mitigation (execute/revert/simulate)
- **Status**: Whether analysis is completed

### System Statistics

- **Total Threats Detected**: Count of all threats
- **Total Threats Mitigated**: Count of resolved threats
- **Total Loss Prevented**: Estimated ETH saved

## Programmatic Access

### Get Threat Details

```javascript
const threatDetails = await immunityLayer.getThreatDetails(threatId);
console.log("Threat Level:", threatDetails.level);
console.log("Reason:", threatDetails.reason);
```

### Get AI Analysis

```javascript
const aiAnalysis = await aiOracle.getAnalysis(threatId);
console.log("Analysis:", aiAnalysis.analysis);
console.log("Suggested Action:", aiAnalysis.suggestedAction);
```

### Get System Stats

```javascript
const stats = await immunityLayer.getStats();
console.log("Threats Detected:", stats.threatsDetected);
console.log("Loss Prevented:", ethers.utils.formatEther(stats.lossPrevented));
```

## Example Output

```
================================================================================
SMART CONTRACT IMMUNITY LAYER - ANALYSIS OUTPUT
================================================================================

📋 Accounts:
   Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   Attacker: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   User1: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

🔨 Step 1: Deploying Contracts...
--------------------------------------------------------------------------------
   ✓ Immunity Layer: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   ✓ AI Oracle: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
   ✓ AI Oracle linked to Immunity Layer
   ✓ Vulnerable Bank: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
   ✓ Bank protected with level 3 security

💰 Step 2: Setting up test scenario...
--------------------------------------------------------------------------------
   ✓ Deposited 5.0 ETH to bank
   ✓ Bank balance: 5.0 ETH

⚠️  Step 3: Deploying malicious contract...
--------------------------------------------------------------------------------
   ✓ Malicious Contract: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
   ✓ Funded malicious contract with 0.1 ETH

🚨 Step 4: Triggering threat detection...
--------------------------------------------------------------------------------
   ✓ Threat detected! Transaction frozen for security review
   ✓ Threat ID: 0x1234...abcd

📊 Step 5: Retrieving Threat Details...
--------------------------------------------------------------------------------

   🔍 THREAT ANALYSIS REPORT
   ======================================================================
   Threat ID:        0x1234...abcd
   Caller:           0xf39F...2266
   Target Contract:  0x9fE4...a6e0
   Timestamp:        12/15/2024, 10:30:45 AM
   Threat Level:     HIGH (3)
   Vulnerability:    REENTRANCY
   Reason:           Possible reentrancy attack pattern detected
   Is Frozen:        ✅ YES
   Is Mitigated:     ❌ NO
   Freeze Until:     Block 12345

🤖 Step 6: Submitting AI Analysis...
--------------------------------------------------------------------------------
   ✓ AI Analysis submitted

📈 Step 7: Retrieving AI Analysis Results...
--------------------------------------------------------------------------------

   🤖 AI ANALYSIS REPORT
   ======================================================================
   Analysis Status:  ✅ COMPLETED
   Analysis:
   Reentrancy vulnerability detected. The withdraw function updates balance
   after external call, allowing attacker to drain funds through recursive calls.
   Suggested Action: REVERT

📊 Step 8: System Statistics...
--------------------------------------------------------------------------------
   Total Threats Detected:  1
   Total Threats Mitigated: 0
   Total Loss Prevented:     0.0 ETH

================================================================================
✅ ANALYSIS COMPLETE
================================================================================
```

## Troubleshooting

### No threats detected?

- Make sure contracts are deployed and protection is enabled
- Try triggering a withdraw from a contract address (not EOA)
- Check that the function signature matches vulnerable patterns

### Can't retrieve threat ID?

- Check event logs: `immunityLayer.queryFilter(immunityLayer.filters.ThreatDetected())`
- Ensure transaction was actually reverted with "Transaction frozen"

### AI Analysis not showing?

- Make sure AI Oracle is set: `await immunityLayer.setAIOracle(aiOracle.address)`
- Submit analysis first: `await aiOracle.submitAnalysis(...)`

## Next Steps

After getting analysis:

1. **Review the threat details** - Understand what was detected
2. **Check AI recommendations** - See suggested actions
3. **Take action** - Use `executeOwnerOverride()` to execute, revert, or request more analysis
4. **Monitor statistics** - Track threats over time

## Running Tests

To see analysis in test scenarios:

```bash
npm test                    # All tests
npm run test:integration    # Integration tests with full flow
npm run test:flashloan      # Flash loan detection tests
```

Tests will show how threats are detected and analyzed in various scenarios.

