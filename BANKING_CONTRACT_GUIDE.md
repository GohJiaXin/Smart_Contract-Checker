# Enhanced Banking Contract Guide

This guide explains the enhanced banking contract features and how they integrate with the Real-Time Contract Immunity Layer.

## Overview

The `BankingContract` is a comprehensive banking smart contract with:
- ✅ Deposit/Withdrawal functionality
- ✅ Interest accrual
- ✅ Admin controls and emergency freeze
- ✅ Withdrawal delays for security
- ✅ Transfer between users
- ✅ Comprehensive event logging
- ✅ Real-time threat detection integration

## Key Features

### 1. Deposit Functions

**`deposit()`** - Deposit ETH to the bank
- Accepts any amount via `msg.value`
- Updates user balance
- Sets withdrawal lock time
- Tracks average deposits for pattern analysis
- Emits `Deposit` event

**`depositAmount(uint256 _amount)`** - Deposit with specific amount
- Same as `deposit()` but with explicit amount parameter
- Useful for programmatic deposits

### 2. Withdrawal Functions

**`withdraw(uint256 _amount)`** - Standard withdrawal
- Protected by withdrawal delay
- Checks balance and max withdrawal limits
- Automatically flagged if >10x average deposit
- Emits `Withdraw` event

**`safeWithdraw(uint256 _amount)`** - Safe withdrawal (checks-effects-interactions pattern)
- Same functionality as `withdraw()` but with better security pattern
- Updates state before external call

### 3. Transfer Functions

**`transfer(address _to, uint256 _amount)`** - Transfer between users
- Internal transfer within the bank
- No withdrawal delay required
- Useful for peer-to-peer transfers
- Emits `Transfer` event

### 4. Interest Functions

**`accrueInterest(address _user)`** - Accrue interest for a user
- Calculates interest based on balance and time
- Formula: `balance * rate * time / (365 days * 10000)`
- Can be called by anyone
- Emits `InterestAccrued` event

**`accrueMyInterest()`** - Accrue interest for caller
- Convenience function to accrue own interest

### 5. Admin Functions

**`emergencyFreeze(string _reason)`** - Freeze all operations
- Only owner can call
- Stops all deposits and withdrawals
- Emits `EmergencyFreeze` event

**`unfreeze()`** - Unfreeze the contract
- Only owner can call
- Resumes normal operations

**`setPendingAdmin(address _newAdmin)`** - Set new admin (with delay)
- Requires delay for security
- New admin must call `acceptAdmin()` to complete

**`setInterestRate(uint256 _newRate)`** - Update interest rate
- Rate in basis points (100 = 1%)
- Maximum 10000 (100%)

**`setMaxWithdrawalPerTx(uint256 _newMax)`** - Set max withdrawal limit
- Prevents extremely large withdrawals
- Owner configurable

**`setWithdrawalDelay(uint256 _newDelay)`** - Update withdrawal delay
- Time in seconds before withdrawal allowed after deposit

**`setInterestEnabled(bool _enabled)`** - Enable/disable interest
- Toggle interest accrual on/off

### 6. View Functions

**`balanceOf(address _user)`** - Get user balance
**`getBalance()`** - Get contract total balance
**`getWithdrawalUnlockTime(address _user)`** - Get when user can withdraw
**`canWithdraw(address _user)`** - Check if withdrawal is allowed
**`getUserStats(address _user)`** - Get comprehensive user statistics
**`getContractStats()`** - Get contract-wide statistics

## Enhanced Immunity Layer Features

### Banking-Specific Threat Detection

The `ContractImmunityLayer` now includes:

#### 1. Large Withdrawal Detection
- Detects withdrawals >10x average deposit
- Configurable multiplier via `setLargeWithdrawalMultiplier()`
- Absolute maximum check via `setMaxWithdrawalAmount()`
- Automatically freezes suspicious large withdrawals

#### 2. Rapid Withdrawal Pattern Detection
- Tracks withdrawal frequency
- Detects multiple withdrawals in short time windows
- Configurable via `setPatternAnalysisWindow()`

#### 3. Admin Function Abuse Detection
- Monitors admin function calls
- Flags if called from contracts (suspicious)
- Flags if called with unusually high gas prices
- Critical threat level

#### 4. Withdrawal Simulation
- `simulateWithdrawal()` function to preview withdrawal impact
- Returns:
  - `wouldSucceed`: Whether withdrawal would succeed
  - `estimatedBalance`: Balance after withdrawal
  - `riskLevel`: Risk assessment (1-4)

#### 5. Banking Statistics Tracking
- Tracks average deposits per contract
- Tracks average deposits per user
- Monitors withdrawal patterns
- Updates automatically on each transaction

## Usage Examples

### Basic Deposit and Withdrawal

```javascript
// Deploy contracts
const bank = await BankingContract.deploy(
  immunityLayer.address,
  500,        // 5% annual interest
  86400,      // 1 day withdrawal delay
  parseEther("100") // Max 100 ETH per withdrawal
);

// Deposit
const depositData = bank.interface.encodeFunctionData("deposit", []);
await immunityLayer.protectedCall(
  bank.address,
  depositData,
  { value: parseEther("10.0") }
);

// Wait for withdrawal delay, then withdraw
const withdrawData = bank.interface.encodeFunctionData("withdraw", [
  parseEther("5.0")
]);
await immunityLayer.protectedCall(
  bank.address,
  withdrawData,
  { value: 0 }
);
```

### Simulate Withdrawal Before Execution

```javascript
const withdrawData = bank.interface.encodeFunctionData("withdraw", [
  parseEther("50.0")
]);

const simulation = await immunityLayer.simulateWithdrawal(
  bank.address,
  withdrawData
);

console.log("Would succeed:", simulation.wouldSucceed);
console.log("Risk level:", simulation.riskLevel);
console.log("Estimated balance:", formatEther(simulation.estimatedBalance));
```

### Admin Functions

```javascript
// Freeze contract in emergency
await bank.emergencyFreeze("Suspicious activity detected");

// Update interest rate
await bank.setInterestRate(600); // 6% annual

// Set max withdrawal
await bank.setMaxWithdrawalPerTx(parseEther("50"));

// Unfreeze
await bank.unfreeze();
```

### Transfer Between Users

```javascript
const transferData = bank.interface.encodeFunctionData("transfer", [
  recipientAddress,
  parseEther("2.0")
]);

await immunityLayer.protectedCall(
  bank.address,
  transferData,
  { value: 0 }
);
```

## Event Monitoring

All functions emit events for monitoring:

- **Deposit**: `Deposit(address user, uint256 amount, uint256 newBalance, uint256 timestamp)`
- **Withdraw**: `Withdraw(address user, uint256 amount, uint256 newBalance, uint256 timestamp)`
- **Transfer**: `Transfer(address from, address to, uint256 amount, uint256 timestamp)`
- **InterestAccrued**: `InterestAccrued(address user, uint256 amount, uint256 newBalance, uint256 timestamp)`
- **EmergencyFreeze**: `EmergencyFreeze(address admin, bool isFrozen, string reason, uint256 timestamp)`
- **AdminChanged**: `AdminChanged(address oldAdmin, address newAdmin, uint256 timestamp)`

## Security Features

### 1. Withdrawal Delay
- Prevents immediate withdrawal after deposit
- Reduces flash loan attack risk
- Configurable delay period

### 2. Maximum Withdrawal Limits
- Per-transaction maximum
- Prevents draining in single transaction
- Owner configurable

### 3. Pattern Analysis
- Tracks average deposits
- Flags unusual patterns
- Real-time threat detection

### 4. Emergency Controls
- Owner can freeze all operations
- Multi-sig support for admin changes
- Comprehensive event logging

### 5. Reentrancy Protection
- Uses OpenZeppelin's `ReentrancyGuard`
- Checks-effects-interactions pattern
- Protected by immunity layer

## Configuration

### Immunity Layer Settings

```javascript
// Set large withdrawal threshold (default: 10x)
await immunityLayer.setLargeWithdrawalMultiplier(15); // 15x

// Set absolute max withdrawal (default: 1000 ETH)
await immunityLayer.setMaxWithdrawalAmount(parseEther("500"));

// Set pattern analysis window (default: 100 blocks)
await immunityLayer.setPatternAnalysisWindow(200);

// Set rapid withdrawal threshold (default: 3)
await immunityLayer.setRapidWithdrawalThreshold(5);
```

### Banking Contract Settings

```javascript
// Set interest rate (basis points)
await bank.setInterestRate(500); // 5%

// Set withdrawal delay (seconds)
await bank.setWithdrawalDelay(172800); // 2 days

// Set max withdrawal per transaction
await bank.setMaxWithdrawalPerTx(parseEther("50"));

// Enable/disable interest
await bank.setInterestEnabled(true);
```

## Testing

Run the banking contract test script:

```bash
npm run test:banking
```

Or for local network:

```bash
npm run test:banking:local
```

This will:
1. Deploy all contracts
2. Test deposits
3. Test withdrawal delays
4. Test large withdrawal detection
5. Test transfers
6. Test admin functions
7. Test withdrawal simulation

## Integration with Immunity Layer

The banking contract is fully integrated with the immunity layer:

1. **All calls go through `protectedCall()`** - Every deposit, withdrawal, and transfer is monitored
2. **Automatic threat detection** - Large withdrawals, rapid patterns, and suspicious activity are detected
3. **Transaction freezing** - High-risk transactions are frozen for review
4. **AI analysis** - Suspicious transactions trigger AI analysis
5. **Pattern tracking** - Deposit and withdrawal patterns are tracked automatically

## Best Practices

1. **Set appropriate withdrawal delays** - Balance security with usability
2. **Monitor average deposits** - Adjust large withdrawal thresholds accordingly
3. **Use emergency freeze** - Have a plan for emergency situations
4. **Monitor events** - Set up event listeners for all operations
5. **Regular audits** - Review contract stats regularly
6. **Test simulations** - Use `simulateWithdrawal()` before large withdrawals
7. **Multi-sig for admin** - Use multi-sig wallets for admin functions

## Summary

The enhanced banking contract provides:
- ✅ Full banking functionality (deposit, withdraw, transfer, interest)
- ✅ Advanced security features (delays, limits, pattern analysis)
- ✅ Admin controls (freeze, rate updates, limits)
- ✅ Comprehensive event logging
- ✅ Real-time threat detection integration
- ✅ Withdrawal simulation and risk assessment
- ✅ Pattern-based anomaly detection

All features work together to provide a secure, monitored, and protected banking contract on Ethereum.

