# Demo Instructions - Split Demo Scripts

## 🎯 Two Separate Demo Scripts

We've split the demo into two separate scripts for better presentation flow:

### Demo 1: Normal Operation
**Command:** `npm run demo:normal`

**What it shows:**
- ✅ Normal users depositing funds
- ✅ Normal transfers between users
- ✅ System working seamlessly
- ✅ No threats detected
- ✅ Statistics showing zero threats

**Perfect for:**
- Showing the system doesn't interfere with normal operations
- Demonstrating transparency and performance
- Building confidence that legitimate users aren't affected

---

### Demo 2: Threat Detection with User Action
**Command:** `npm run demo:threat`

**What it shows:**
- 🚨 Large withdrawal attempt detected
- ⏸️ Transaction frozen BEFORE execution
- 🤖 AI analysis of the threat
- 👤 **Interactive prompt** asking owner what to do
- ✅ Owner decides: REVERT, EXECUTE, or SIMULATE
- 📊 Final statistics showing protection

**Perfect for:**
- Showing real-time threat detection
- Demonstrating AI-powered analysis
- Highlighting owner control
- Proving funds are protected BEFORE execution

---

## 🎬 Recommended Demo Flow

### For Hackathon Presentation

**Step 1: Show Normal Operation (2 minutes)**
```bash
npm run demo:normal
```
- "First, let's see normal operations work seamlessly"
- Show deposits and transfers
- Emphasize: "No interference, no delays"

**Step 2: Show Threat Detection (3-4 minutes)**
```bash
npm run demo:threat
```
- "Now, let's see what happens when an attacker tries something"
- Show threat detection
- **Interactive part**: Ask audience what they would do
- Show the decision and result

---

## 📋 Demo Script Details

### Demo 1: Normal Operation (`demoNormalOperation.js`)

**Steps:**
1. Deploy contracts
2. User1 deposits 10 ETH ✅
3. User2 deposits 5 ETH ✅
4. User1 transfers 2 ETH to User2 ✅
5. Show statistics (0 threats)

**Key Messages:**
- Normal operations work perfectly
- No performance impact
- Transparent to users

---

### Demo 2: Threat Detection (`demoThreatDetection.js`)

**Steps:**
1. Deploy contracts
2. Setup normal deposits (10 ETH + 1 ETH)
3. Attacker tries to withdraw 60 ETH 🚨
4. **System detects and FREEZES** ⏸️
5. AI analyzes the threat 🤖
6. **Interactive prompt appears** 👤
7. Owner chooses action (1/2/3)
8. Show final statistics

**Key Messages:**
- Threats detected BEFORE execution
- AI provides intelligent analysis
- Owner stays in control
- Funds are protected

---

## 🎤 Presentation Tips

### When Running Demo 1

**Say:**
> "First, let's see how normal users interact with the system. Notice how everything works smoothly - no delays, no interference. The protection layer is completely transparent to legitimate users."

**Highlight:**
- Speed of transactions
- No errors or warnings
- Seamless experience

---

### When Running Demo 2

**Say:**
> "Now, let's see what happens when an attacker tries to exploit the system. Watch how the transaction is intercepted BEFORE it executes. The system freezes it, analyzes it with AI, and asks the owner what to do."

**Interactive Moment:**
> "What would you do? The AI recommends reverting. Would you trust the AI, or would you investigate further? Let's see what happens when we choose to revert..."

**Highlight:**
- Transaction frozen (not executed)
- AI analysis
- Owner control
- Funds protected

---

## 🚀 Quick Commands

```bash
# Demo 1: Normal operation
npm run demo:normal

# Demo 2: Threat detection (interactive)
npm run demo:threat

# Original combined demo (still available)
npm run demo
```

---

## 💡 Why Split the Demo?

### Benefits:

1. **Clearer narrative** - Show normal first, then threats
2. **Better pacing** - Each demo has a clear focus
3. **Interactive element** - Demo 2 lets audience participate
4. **Flexible** - Can run separately or together
5. **More impactful** - Contrast between normal and threat scenarios

---

## 🎯 Demo Checklist

### Before Demo 1
- [ ] Contracts compiled
- [ ] Test that it runs: `npm run demo:normal`
- [ ] Prepare talking points

### Before Demo 2
- [ ] Demo 1 completed
- [ ] Explain what's about to happen
- [ ] Prepare for interactive prompt
- [ ] Have backup answer ready (in case no input)

---

## 🔧 Troubleshooting

### Demo 1 Issues
```bash
# If contracts not deploying
npm run compile
npm run demo:normal
```

### Demo 2 Issues
```bash
# If interactive prompt doesn't work
# The script will wait for input
# Type 1, 2, or 3 and press Enter
```

### If Demo Fails
- Show test results: `npm run test:banking`
- Explain the architecture
- Walk through code

---

## 📊 Expected Output

### Demo 1 Output
```
💰 DEMO 1: NORMAL OPERATION
✅ User1 deposit successful!
✅ User2 deposit successful!
✅ Transfer successful!
📊 Total Threats Detected: 0
```

### Demo 2 Output
```
🚨 DEMO 2: THREAT DETECTION
⚠️  ATTACKER ATTEMPT: 60 ETH withdrawal
✅ TRANSACTION FROZEN FOR SECURITY REVIEW
🤖 AI Analysis Complete!
👤 OWNER ACTION REQUIRED
Enter your choice (1/2/3): 1
✅ Transaction REVERTED
🛡️  Funds are PROTECTED
```

---

## 🎬 Perfect Hackathon Flow

1. **Introduction** (30 sec) - Problem statement
2. **Demo 1** (2 min) - Normal operation
3. **Demo 2** (3 min) - Threat detection with interaction
4. **Summary** (30 sec) - Key takeaways

**Total: ~6 minutes** - Perfect for hackathon pitch!

---

## ✅ Success Criteria

A successful demo should:
- ✅ Show normal operations work seamlessly
- ✅ Demonstrate threat detection in action
- ✅ Engage audience with interactive element
- ✅ Clearly show funds are protected
- ✅ Highlight AI-powered analysis

**Good luck with your presentation! 🚀**

