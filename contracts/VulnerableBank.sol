// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ProtectedContract.sol";

contract VulnerableBank is ProtectedContract {
    
    mapping(address => uint256) public balances;
    
    constructor(address _immunityLayer) ProtectedContract(_immunityLayer) {}
    
    function deposit() external payable protected {
        balances[msg.sender] += msg.value;
    }
    
    // Vulnerable function
    function withdraw(uint256 _amount) external protected {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= _amount;
    }
    
    // Safe version
    function safeWithdraw(uint256 _amount) external protected {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        balances[msg.sender] -= _amount;
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
    }
    
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}