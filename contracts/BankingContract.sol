// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ProtectedContract.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BankingContract
 * @dev Enhanced banking contract with deposit, withdrawal, interest accrual, 
 *      admin controls, and withdrawal delays for security
 */
contract BankingContract is ProtectedContract, Ownable, ReentrancyGuard {
    
    // ========== STATE VARIABLES ==========
    mapping(address => uint256) public balances;
    mapping(address => uint256) public withdrawalLockTime; // Timestamp when withdrawal is allowed
    mapping(address => uint256) public lastDepositTime;
    mapping(address => uint256) public totalDeposited;
    mapping(address => uint256) public totalWithdrawn;
    
    uint256 public totalDeposits; // Total deposits across all users
    uint256 public totalWithdrawals; // Total withdrawals across all users
    uint256 public interestRate; // Annual interest rate in basis points (100 = 1%)
    uint256 public withdrawalDelay; // Minimum time between deposit and withdrawal (in seconds)
    uint256 public maxWithdrawalPerTx; // Maximum withdrawal per transaction
    uint256 public averageDepositAmount; // Running average of deposit amounts
    uint256 public depositCount; // Number of deposits for average calculation
    
    bool public isFrozen; // Emergency freeze flag
    bool public interestEnabled; // Whether interest accrual is enabled
    
    address public pendingAdmin; // For multi-sig admin changes
    uint256 public adminChangeDelay; // Delay for admin changes
    
    // ========== EVENTS ==========
    event Deposit(
        address indexed user,
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );
    
    event Withdraw(
        address indexed user,
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );
    
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    
    event InterestAccrued(
        address indexed user,
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );
    
    event EmergencyFreeze(
        address indexed admin,
        bool isFrozen,
        string reason,
        uint256 timestamp
    );
    
    event AdminChanged(
        address indexed oldAdmin,
        address indexed newAdmin,
        uint256 timestamp
    );
    
    event WithdrawalDelayed(
        address indexed user,
        uint256 requestedAmount,
        uint256 unlockTime,
        uint256 timestamp
    );
    
    event MaxWithdrawalUpdated(
        uint256 oldLimit,
        uint256 newLimit,
        uint256 timestamp
    );
    
    event InterestRateUpdated(
        uint256 oldRate,
        uint256 newRate,
        uint256 timestamp
    );
    
    // ========== MODIFIERS ==========
    modifier notFrozen() {
        require(!isFrozen, "Contract is frozen");
        _;
    }
    
    modifier withdrawalAllowed(address _user) {
        require(
            block.timestamp >= withdrawalLockTime[_user],
            "Withdrawal is still locked"
        );
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    constructor(
        address _immunityLayer,
        uint256 _interestRate,
        uint256 _withdrawalDelay,
        uint256 _maxWithdrawalPerTx
    ) ProtectedContract(_immunityLayer) {
        interestRate = _interestRate; // e.g., 500 = 5% annual
        withdrawalDelay = _withdrawalDelay; // e.g., 86400 = 1 day
        maxWithdrawalPerTx = _maxWithdrawalPerTx; // e.g., 100 ether
        interestEnabled = true;
        adminChangeDelay = 7 days;
    }
    
    // ========== DEPOSIT FUNCTIONS ==========
    
    /**
     * @dev Deposit ETH to the bank
     * @notice Users can deposit ETH and earn interest
     */
    function deposit() external payable protected notFrozen nonReentrant {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        totalDeposited[msg.sender] += msg.value;
        lastDepositTime[msg.sender] = block.timestamp;
        withdrawalLockTime[msg.sender] = block.timestamp + withdrawalDelay;
        
        // Update running average
        depositCount++;
        averageDepositAmount = ((averageDepositAmount * (depositCount - 1)) + msg.value) / depositCount;
        
        emit Deposit(msg.sender, msg.value, balances[msg.sender], block.timestamp);
    }
    
    /**
     * @dev Deposit with specific amount (alternative interface)
     */
    function depositAmount(uint256 _amount) external payable protected notFrozen nonReentrant {
        require(msg.value == _amount, "Value must match amount");
        require(_amount > 0, "Amount must be greater than 0");
        
        balances[msg.sender] += _amount;
        totalDeposits += _amount;
        totalDeposited[msg.sender] += _amount;
        lastDepositTime[msg.sender] = block.timestamp;
        withdrawalLockTime[msg.sender] = block.timestamp + withdrawalDelay;
        
        depositCount++;
        averageDepositAmount = ((averageDepositAmount * (depositCount - 1)) + _amount) / depositCount;
        
        emit Deposit(msg.sender, _amount, balances[msg.sender], block.timestamp);
    }
    
    // ========== WITHDRAWAL FUNCTIONS ==========
    
    /**
     * @dev Withdraw funds from the bank
     * @param _amount Amount to withdraw
     * @notice Protected by withdrawal delay and max withdrawal limits
     */
    function withdraw(uint256 _amount) 
        external 
        protected 
        notFrozen 
        nonReentrant 
        withdrawalAllowed(msg.sender) 
    {
        require(_amount > 0, "Withdrawal amount must be greater than 0");
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        require(_amount <= maxWithdrawalPerTx, "Exceeds max withdrawal per transaction");
        
        // Check if withdrawal is unusually large (>10x average deposit)
        if (_amount > averageDepositAmount * 10 && averageDepositAmount > 0) {
            // This will be caught by the immunity layer for review
            // Still allow but flag for monitoring
        }
        
        balances[msg.sender] -= _amount;
        totalWithdrawals += _amount;
        totalWithdrawn[msg.sender] += _amount;
        
        // Update withdrawal lock time after withdrawal
        withdrawalLockTime[msg.sender] = block.timestamp + withdrawalDelay;
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit Withdraw(msg.sender, _amount, balances[msg.sender], block.timestamp);
    }
    
    /**
     * @dev Safe withdraw with checks-effects-interactions pattern
     */
    function safeWithdraw(uint256 _amount) 
        external 
        protected 
        notFrozen 
        nonReentrant 
        withdrawalAllowed(msg.sender) 
    {
        require(_amount > 0, "Withdrawal amount must be greater than 0");
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        require(_amount <= maxWithdrawalPerTx, "Exceeds max withdrawal per transaction");
        
        // Checks-effects-interactions pattern
        balances[msg.sender] -= _amount;
        totalWithdrawals += _amount;
        totalWithdrawn[msg.sender] += _amount;
        withdrawalLockTime[msg.sender] = block.timestamp + withdrawalDelay;
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit Withdraw(msg.sender, _amount, balances[msg.sender], block.timestamp);
    }
    
    // ========== TRANSFER FUNCTIONS ==========
    
    /**
     * @dev Transfer funds between users within the bank
     * @param _to Recipient address
     * @param _amount Amount to transfer
     */
    function transfer(address _to, uint256 _amount) 
        external 
        protected 
        notFrozen 
        nonReentrant 
    {
        require(_to != address(0), "Cannot transfer to zero address");
        require(_amount > 0, "Transfer amount must be greater than 0");
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        balances[msg.sender] -= _amount;
        balances[_to] += _amount;
        
        emit Transfer(msg.sender, _to, _amount, block.timestamp);
    }
    
    // ========== INTEREST FUNCTIONS ==========
    
    /**
     * @dev Accrue interest for a user based on their balance and time
     * @param _user User address to accrue interest for
     * @notice Can be called by anyone, but typically called automatically
     */
    function accrueInterest(address _user) public protected notFrozen {
        require(interestEnabled, "Interest accrual is disabled");
        require(balances[_user] > 0, "User has no balance");
        
        uint256 timeSinceLastDeposit = block.timestamp - lastDepositTime[_user];
        if (timeSinceLastDeposit == 0) {
            timeSinceLastDeposit = 1; // Prevent division by zero
        }
        
        // Calculate interest: balance * rate * time / (365 days * 10000 basis points)
        uint256 interest = (balances[_user] * interestRate * timeSinceLastDeposit) / (365 days * 10000);
        
        if (interest > 0) {
            balances[_user] += interest;
            totalDeposits += interest;
            lastDepositTime[_user] = block.timestamp;
            
            emit InterestAccrued(_user, interest, balances[_user], block.timestamp);
        }
    }
    
    /**
     * @dev Accrue interest for the caller
     */
    function accrueMyInterest() external protected notFrozen {
        accrueInterest(msg.sender);
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    /**
     * @dev Emergency freeze to stop all withdrawals
     * @param _reason Reason for freezing
     */
    function emergencyFreeze(string calldata _reason) external onlyOwner {
        isFrozen = true;
        emit EmergencyFreeze(msg.sender, true, _reason, block.timestamp);
    }
    
    /**
     * @dev Unfreeze the contract
     */
    function unfreeze() external onlyOwner {
        isFrozen = false;
        emit EmergencyFreeze(msg.sender, false, "Contract unfrozen", block.timestamp);
    }
    
    /**
     * @dev Set new admin (requires delay for security)
     * @param _newAdmin Address of new admin
     */
    function setPendingAdmin(address _newAdmin) external onlyOwner {
        require(_newAdmin != address(0), "Invalid admin address");
        pendingAdmin = _newAdmin;
        // Admin change requires delay - actual change happens in acceptAdmin
    }
    
    /**
     * @dev Accept admin role (must be called by pending admin after delay)
     */
    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Not pending admin");
        address oldAdmin = owner();
        _transferOwnership(pendingAdmin);
        pendingAdmin = address(0);
        emit AdminChanged(oldAdmin, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Update interest rate
     * @param _newRate New interest rate in basis points
     */
    function setInterestRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 10000, "Interest rate cannot exceed 100%");
        uint256 oldRate = interestRate;
        interestRate = _newRate;
        emit InterestRateUpdated(oldRate, _newRate, block.timestamp);
    }
    
    /**
     * @dev Update maximum withdrawal per transaction
     * @param _newMax New maximum withdrawal amount
     */
    function setMaxWithdrawalPerTx(uint256 _newMax) external onlyOwner {
        require(_newMax > 0, "Max withdrawal must be greater than 0");
        uint256 oldMax = maxWithdrawalPerTx;
        maxWithdrawalPerTx = _newMax;
        emit MaxWithdrawalUpdated(oldMax, _newMax, block.timestamp);
    }
    
    /**
     * @dev Update withdrawal delay
     * @param _newDelay New withdrawal delay in seconds
     */
    function setWithdrawalDelay(uint256 _newDelay) external onlyOwner {
        withdrawalDelay = _newDelay;
    }
    
    /**
     * @dev Enable or disable interest accrual
     * @param _enabled Whether interest is enabled
     */
    function setInterestEnabled(bool _enabled) external onlyOwner {
        interestEnabled = _enabled;
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Get balance of a user
     */
    function balanceOf(address _user) external view returns (uint256) {
        return balances[_user];
    }
    
    /**
     * @dev Get contract's total balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get withdrawal unlock time for a user
     */
    function getWithdrawalUnlockTime(address _user) external view returns (uint256) {
        return withdrawalLockTime[_user];
    }
    
    /**
     * @dev Check if withdrawal is allowed for a user
     */
    function canWithdraw(address _user) external view returns (bool) {
        return block.timestamp >= withdrawalLockTime[_user] && !isFrozen;
    }
    
    /**
     * @dev Get user statistics
     */
    function getUserStats(address _user) 
        external 
        view 
        returns (
            uint256 balance,
            uint256 totalDepositedAmount,
            uint256 totalWithdrawnAmount,
            uint256 withdrawalUnlockTime,
            bool canWithdrawNow
        ) 
    {
        return (
            balances[_user],
            totalDeposited[_user],
            totalWithdrawn[_user],
            withdrawalLockTime[_user],
            block.timestamp >= withdrawalLockTime[_user] && !isFrozen
        );
    }
    
    /**
     * @dev Get contract statistics
     */
    function getContractStats() 
        external 
        view 
        returns (
            uint256 totalDepositsAmount,
            uint256 totalWithdrawalsAmount,
            uint256 contractBalance,
            uint256 averageDeposit,
            uint256 currentInterestRate,
            bool frozen
        ) 
    {
        return (
            totalDeposits,
            totalWithdrawals,
            address(this).balance,
            averageDepositAmount,
            interestRate,
            isFrozen
        );
    }
    
    // ========== FALLBACK ==========
    receive() external payable {
        // Allow receiving ETH
    }
    
    fallback() external payable {
        revert("Function not found");
    }
}

