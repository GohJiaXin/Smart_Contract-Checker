# Quick Guide: Inserting Test Cases in Cursor

## 🚀 Quick Start - 3 Methods to Add Tests

### Method 1: AI Assistant (Recommended) ⚡

1. **Open** `test/BankingContract.test.js`
2. **Place cursor** inside a `describe()` block where you want the test
3. **Press `Ctrl+K`** (Windows) or `Cmd+K` (Mac)
4. **Type your request**:
   ```
   Add a test case that verifies users cannot withdraw more than their balance
   ```
5. **Press Enter** - Cursor generates the test
6. **Review and accept** the code

### Method 2: Copy-Paste Template 📋

1. **Open** `test/BankingContract.test.js`
2. **Find** a similar test case
3. **Copy** the structure:
   ```javascript
   it("Should [your test description]", async function () {
     const { immunityLayer, bank, user1 } = await loadFixture(deployBankingFixture);
     
     // Your test code here
   });
   ```
4. **Paste** and modify for your needs

### Method 3: Cursor Composer 🎨

1. **Press `Ctrl+L`** (Windows) or `Cmd+L` (Mac) to open Composer
2. **Describe what you want**:
   ```
   Add comprehensive test cases to BankingContract.test.js for:
   - Testing interest accrual over different time periods
   - Verifying emergency freeze affects all operations
   - Testing admin function access control
   ```
3. **Cursor generates** multiple test cases
4. **Review and accept**

---

## 📝 Test Case Template

```javascript
it("Should [describe what it tests]", async function () {
  // ARRANGE: Setup test data
  const { immunityLayer, bank, user1, user2 } = await loadFixture(deployBankingFixture);
  
  // ACT: Execute the operation
  const depositData = encodeFunctionCall(bank, "deposit", []);
  await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("10.0") }
  );
  
  // ASSERT: Verify the result
  const balance = await bank.balanceOf(user1.address);
  expect(balance).to.equal(ethers.utils.parseEther("10.0"));
});
```

---

## 🎯 Common Test Patterns

### Pattern 1: Testing Success

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

### Pattern 2: Testing Failure

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

### Pattern 3: Testing Events

```javascript
it("Should emit Deposit event", async function () {
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

### Pattern 4: Testing Time-Dependent Operations

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
  
  // Fast forward 1 day
  await ethers.provider.send("evm_increaseTime", [86401]);
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

---

## 📂 File Locations

### Where to Add Tests

- **Banking Contract Tests**: `test/BankingContract.test.js`
- **Integration Tests**: `test/Integration.test.js`
- **Core Functionality**: `test/ImmunityLayer.test.js`
- **Attack Scenarios**: `test/FlashLoan.test.js`
- **Edge Cases**: `test/EdgeCases.test.js`

### Helper Functions

Located in: `test/helpers.js`
- `deployBankingFixture()` - Setup banking contracts
- `encodeFunctionCall()` - Encode function calls
- `mineBlocks()` - Fast forward blocks
- `getThreatId()` - Calculate threat ID

---

## ✅ Checklist Before Running Tests

- [ ] Test is inside a `describe()` block
- [ ] Uses `loadFixture(deployBankingFixture)`
- [ ] Uses `encodeFunctionCall()` for function encoding
- [ ] Calls through `immunityLayer.protectedCall()`
- [ ] Has appropriate `expect()` assertions
- [ ] Handles async/await correctly
- [ ] Test name clearly describes what it tests

---

## 🏃 Running Your Tests

### Run All Banking Tests
```bash
npm run test:banking
```

### Run Specific Test
```bash
npx hardhat test test/BankingContract.test.js --grep "Should allow deposit"
```

### Run with Verbose Output
```bash
npx hardhat test --verbose
```

---

## 💡 Pro Tips

1. **Use Cursor's AI** - It understands the codebase and generates correct tests
2. **Follow existing patterns** - Look at similar tests for structure
3. **Test one thing** - Each test should verify one specific behavior
4. **Use descriptive names** - Test names should explain what they verify
5. **Test edge cases** - Include boundary conditions and error cases

---

## 🔧 Troubleshooting

### "Contract not protected" error
**Fix**: Make sure fixture includes:
```javascript
await immunityLayer.addContractProtection(bank.address, 3);
```

### "Withdrawal is still locked" error
**Fix**: Fast forward time:
```javascript
await ethers.provider.send("evm_increaseTime", [86401]);
await ethers.provider.send("evm_mine", []);
```

### Test times out
**Fix**: Increase timeout in `hardhat.config.js`:
```javascript
mocha: { timeout: 40000 }
```

---

## 📚 Example: Adding a New Test

**Step 1**: Open `test/BankingContract.test.js`

**Step 2**: Find the `describe("Withdrawal Functionality")` block

**Step 3**: Press `Ctrl+K` and type:
```
Add a test that verifies users cannot withdraw when contract is frozen
```

**Step 4**: Cursor generates:
```javascript
it("Should prevent withdrawal when contract is frozen", async function () {
  const { immunityLayer, bank, owner, user1 } = await loadFixture(deployBankingFixture);
  
  // Deposit
  const depositData = encodeFunctionCall(bank, "deposit", []);
  await immunityLayer.connect(user1).protectedCall(
    bank.address,
    depositData,
    { value: ethers.utils.parseEther("10.0") }
  );
  
  // Freeze
  await bank.connect(owner).emergencyFreeze("Emergency");
  
  // Fast forward time
  await ethers.provider.send("evm_increaseTime", [86401]);
  await ethers.provider.send("evm_mine", []);
  
  // Try to withdraw
  const withdrawData = encodeFunctionCall(bank, "withdraw", [
    ethers.utils.parseEther("5.0")
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

**Step 5**: Run the test:
```bash
npm run test:banking
```

Done! ✅

