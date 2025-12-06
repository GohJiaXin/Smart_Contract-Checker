# Testing Guide - How to Run Tests in Cursor

This guide explains how to insert and run test cases in Cursor IDE, and which files are used to make the Smart Contract Immunity Layer work.

## Table of Contents
1. [How to Insert Test Cases in Cursor](#how-to-insert-test-cases-in-cursor)
2. [File Structure and Dependencies](#file-structure-and-dependencies)
3. [Running Tests](#running-tests)
4. [Understanding Test Files](#understanding-test-files)
5. [Adding New Test Cases](#adding-new-test-cases)

---

## How to Insert Test Cases in Cursor

### Method 1: Using Cursor's AI Assistant

1. **Open the test file** you want to modify:
   - `test/BankingContract.test.js` (comprehensive banking tests)
   - `test/Integration.test.js` (integration tests)
   - `test/ImmunityLayer.test.js` (core immunity layer tests)

2. **Place your cursor** where you want to add a test case

3. **Type a comment** describing what you want to test:
   ```javascript
   // Test case: Should prevent withdrawal when balance is zero
   ```

4. **Press `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)** to open Cursor's AI assistant

5. **Ask Cursor to generate the test**:
   ```
   Generate a test case that checks if withdrawal fails when user has zero balance
   ```

6. **Cursor will generate** the test code following the existing pattern

7. **Review and accept** the generated code

### Method 2: Manual Insertion

1. **Open the test file** in Cursor

2. **Find a similar test case** to use as a template

3. **Copy the structure** and modify:
   ```javascript
   it("Should prevent withdrawal when balance is zero", async function () {
     const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
     
     // Your test code here
   });
   ```

4. **Insert it** in the appropriate `describe` block

### Method 3: Using Cursor's Composer

1. **Open Cursor Composer** (`Ctrl+L` or `Cmd+L`)

2. **Describe what you want to test**:
   ```
   Add a test case to BankingContract.test.js that verifies:
   - Users cannot withdraw more than their balance
   - The transaction is properly reverted
   - An appropriate error message is shown
   ```

3. **Cursor will generate** the complete test case

---

## File Structure and Dependencies

### Core Contract Files

```
contracts/
├── BankingContract.sol          # Main banking contract with all features
├── ContractImmunityLayer.sol     # Threat detection and protection layer
├── AIAnalysisOracle.sol          # AI analysis integration
├── ProtectedContract.sol         # Base contract for protected contracts
├── VulnerableBank.sol           # Simple vulnerable bank for testing
└── TestVulnerable.sol            # Test contract with vulnerabilities
```

### Test Files

```
test/
├── BankingContract.test.js       # Comprehensive banking contract tests (NEW)
├── Integration.test.js           # Full system integration tests
├── ImmunityLayer.test.js         # Core immunity layer functionality
├── FlashLoan.test.js            # Flash loan attack detection
├── EdgeCases.test.js            # Edge cases and error handling
├── Gas.test.js                  # Gas usage analysis
├── helpers.js                   # Test helper functions
└── mocks/
    └── MockVulnerable.sol        # Mock contracts for testing
```

### Script Files

```
scripts/
├── deploy.js                    # Deployment script
├── getAnalysis.js              # Get threat analysis output
├── viewAnalysis.js             # View existing threats
└── testBankingContract.js      # Banking contract demo script
```

### Configuration Files

```
├── hardhat.config.js           # Hardhat configuration
├── package.json                # Dependencies and scripts
└── .env                        # Environment variables (if used)
```

---

## How Files Work Together

### 1. Test Execution Flow

```
User runs: npm test
    ↓
Hardhat reads: hardhat.config.js
    ↓
Compiles contracts from: contracts/
    ↓
Runs tests from: test/
    ↓
Uses helpers from: test/helpers.js
    ↓
Deploys contracts using: scripts/deploy.js (if needed)
    ↓
Executes test cases
    ↓
Reports results
```

### 2. Test File Dependencies

**BankingContract.test.js** depends on:
- `contracts/BankingContract.sol` - The contract being tested
- `contracts/ContractImmunityLayer.sol` - Protection layer
- `test/helpers.js` - Helper functions (`encodeFunctionCall`, `deployBankingFixture`)
- `@nomicfoundation/hardhat-network-helpers` - Network manipulation
- `ethers` - Ethereum interaction
- `chai` - Assertions

### 3. Helper Functions (test/helpers.js)

```javascript
// deployBankingFixture() - Sets up all contracts for testing
// encodeFunctionCall() - Encodes function calls for protectedCall()
// mineBlocks() - Fast forwards blocks
// getThreatId() - Calculates threat ID from transaction
```

### 4. Contract Interaction Pattern

```javascript
// 1. Deploy contracts using fixture
const { bank, immunityLayer, user1 } = await loadFixture(deployBankingFixture);

// 2. Encode function call
const depositData = encodeFunctionCall(bank, "deposit", []);

// 3. Call through immunity layer
await immunityLayer.connect(user1).protectedCall(
  bank.address,
  depositData,
  { value: ethers.utils.parseEther("10.0") }
);

// 4. Assert results
const balance = await bank.balanceOf(user1.address);
expect(balance).to.equal(ethers.utils.parseEther("10.0"));
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
# Banking contract tests
npx hardhat test test/BankingContract.test.js

# Integration tests
npx hardhat test test/Integration.test.js

# Immunity layer tests
npx hardhat test test/ImmunityLayer.test.js
```

### Run Specific Test Suite

```bash
# Run only "Deposit Functionality" tests
npx hardhat test test/BankingContract.test.js --grep "Deposit Functionality"
```

### Run with Verbose Output

```bash
npx hardhat test --verbose
```

### Run with Gas Reporting

```bash
npm run test:gas
```

### Run with Coverage

```bash
npm run test:coverage
```

---

## Understanding Test Files

### Test Structure

```javascript
describe("Feature Name", function () {
  // Setup function (runs before each test)
  async function deployBankingFixture() {
    // Deploy contracts
    // Return contract instances and signers
  }
  
  describe("Sub-feature", function () {
    it("Should do something specific", async function () {
      // 1. Setup
      const { contracts, users } = await loadFixture(deployBankingFixture);
      
      // 2. Execute
      await someFunction();
      
      // 3. Assert
      expect(result).to.equal(expected);
    });
  });
});
```

### Common Test Patterns

#### 1. Testing Successful Operations

```javascript
it("Should allow deposit", async function () {
  const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
  
  const depositData = encodeFunctionCall(bank, "deposit", []);
  await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("10.0") }
  );
  
  const balance = await bank.balanceOf(user1.address);
  expect(balance).to.equal(ethers.utils.parseEther("10.0"));
});
```

#### 2. Testing Reverted Operations

```javascript
it("Should prevent invalid operation", async function () {
  const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
  
  const withdrawData = encodeFunctionCall(bank, "withdraw", [
    ethers.utils.parseEther("10.0")
  ]);
  
  await expect(
    immunityLayer.connect(user1).protectedCall(
      bank.address,
      withdrawData,
      { value: 0 }
    )
  ).to.be.reverted;
});
```

#### 3. Testing Events

```javascript
it("Should emit event", async function () {
  const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
  
  const depositData = encodeFunctionCall(bank, "deposit", []);
  const tx = await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("10.0") }
  );
  
  await expect(tx)
    .to.emit(bank, "Deposit")
    .withArgs(user1.address, ethers.utils.parseEther("10.0"), ...);
});
```

#### 4. Testing Time-Dependent Operations

```javascript
it("Should allow withdrawal after delay", async function () {
  const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
  
  // Deposit
  const depositData = encodeFunctionCall(bank, "deposit", []);
  await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("10.0") }
  );
  
  // Fast forward time
  await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
  await ethers.provider.send("evm_mine", []);
  
  // Withdraw
  const withdrawData = encodeFunctionCall(bank, "withdraw", [
    ethers.utils.parseEther("5.0")
  ]);
  
  await expect(
    immunityLayer.connect(user1).protectedCall(
      bank.address,
      withdrawData,
      { value: 0 }
    )
  ).to.not.be.reverted;
});
```

#### 5. Testing Threat Detection

```javascript
it("Should detect and freeze large withdrawals", async function () {
  const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
  
  // Setup deposits to establish average
  const depositData = encodeFunctionCall(bank, "deposit", []);
  await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("1.0") }
  );
  
  // Try large withdrawal
  const largeWithdrawData = encodeFunctionCall(bank, "withdraw", [
    ethers.utils.parseEther("15.0") // >10x average
  ]);
  
  await expect(
    immunityLayer.connect(user1).protectedCall(
      bank.address,
      largeWithdrawData,
      { value: 0 }
    )
  ).to.be.revertedWith("Transaction frozen for security review");
  
  // Check threat was detected
  const filter = immunityLayer.filters.ThreatDetected();
  const events = await immunityLayer.queryFilter(filter);
  expect(events.length).to.be.gt(0);
});
```

---

## Adding New Test Cases

### Step-by-Step Guide

1. **Open the test file** (`test/BankingContract.test.js`)

2. **Find the appropriate `describe` block** for your test

3. **Add a new `it()` block**:

```javascript
it("Should [describe what it tests]", async function () {
  // Arrange: Setup test data
  const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
  
  // Act: Execute the operation
  const depositData = encodeFunctionCall(bank, "deposit", []);
  await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("10.0") }
  );
  
  // Assert: Verify the result
  const balance = await bank.balanceOf(user1.address);
  expect(balance).to.equal(ethers.utils.parseEther("10.0"));
});
```

4. **Run the test**:
   ```bash
   npx hardhat test test/BankingContract.test.js --grep "Should [your test name]"
   ```

### Test Case Checklist

- [ ] Test has a clear, descriptive name
- [ ] Test follows Arrange-Act-Assert pattern
- [ ] Test uses `loadFixture()` for setup
- [ ] Test uses `encodeFunctionCall()` for function encoding
- [ ] Test calls through `immunityLayer.protectedCall()`
- [ ] Test has appropriate assertions
- [ ] Test handles async operations correctly
- [ ] Test is in the correct `describe` block

---

## Common Issues and Solutions

### Issue: "Contract not protected"

**Solution**: Make sure you call `addContractProtection()` in the fixture:
```javascript
await immunityLayer.addContractProtection(bank.address, 3);
```

### Issue: "Withdrawal is still locked"

**Solution**: Fast forward time before withdrawing:
```javascript
await ethers.provider.send("evm_increaseTime", [86401]);
await ethers.provider.send("evm_mine", []);
```

### Issue: "Transaction frozen for security review"

**Solution**: This is expected for suspicious transactions. Check threat events:
```javascript
const filter = immunityLayer.filters.ThreatDetected();
const events = await immunityLayer.queryFilter(filter);
```

### Issue: Test times out

**Solution**: Increase timeout in `hardhat.config.js`:
```javascript
mocha: {
  timeout: 40000
}
```

---

## Best Practices

1. **Use fixtures** - Always use `loadFixture()` for consistent setup
2. **Isolate tests** - Each test should be independent
3. **Clear names** - Test names should describe what they test
4. **One assertion per concept** - Group related assertions
5. **Test edge cases** - Include boundary conditions
6. **Test failures** - Verify that invalid operations fail correctly
7. **Test events** - Verify events are emitted correctly
8. **Use constants** - Define test values as constants for clarity

---

## Quick Reference

### Available Test Commands

```bash
npm test                    # Run all tests
npm run test:banking        # Run banking tests
npm run test:integration    # Run integration tests
npm run test:gas            # Run with gas reporting
npm run test:coverage       # Run with coverage
```

### Key Helper Functions

```javascript
encodeFunctionCall(contract, functionName, params)
loadFixture(fixtureFunction)
mineBlocks(count)
getThreatId(targetContract, caller, data)
```

### Common Ethers Utilities

```javascript
ethers.utils.parseEther("10.0")    // Convert to wei
ethers.utils.formatEther(balance)   // Convert from wei
ethers.utils.keccak256(data)        // Hash data
```

---

## Summary

- **Insert tests** using Cursor's AI (`Ctrl+K`) or manually
- **Test files** are in `test/` directory
- **Contracts** are in `contracts/` directory
- **Helpers** are in `test/helpers.js`
- **Run tests** with `npm test` or `npx hardhat test`
- **Follow patterns** from existing test cases
- **Use fixtures** for consistent setup

For more details, see the individual test files and contract documentation.

