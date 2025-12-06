// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IVulnerableBank {
    function withdraw(uint256 _amount) external;
    function balances(address) external view returns (uint256);
}

contract MockMalicious {
    IVulnerableBank public target;
    uint256 public attackCount;
    uint256 public maxAttacks = 5;
    
    constructor(address _target) {
        target = IVulnerableBank(_target);
    }
    
    function executeReentrancy(uint256 _amount) external {
        attackCount = 0;
        target.withdraw(_amount);
    }
    
    function startReentrancyAttack(uint256 _amount) external {
        attackCount = 0;
        target.withdraw(_amount);
    }
    
    function simulateAttack() external {
        attackCount++;
    }
    
    receive() external payable {
        if (attackCount < maxAttacks && address(target).balance >= msg.value) {
            attackCount++;
            target.withdraw(msg.value);
        }
    }
    
    function setMaxAttacks(uint256 _max) external {
        maxAttacks = _max;
    }
}

contract ReentrancyTester {
    address public immunityLayer;
    
    constructor(address _immunityLayer) {
        immunityLayer = _immunityLayer;
    }
    
    function testReentrancy() external {
        (bool success, ) = immunityLayer.call(
            abi.encodeWithSignature("protectedCall(address,bytes)", address(this), "")
        );
        require(success, "First call failed");
        
        // Try to call again (reentrancy)
        (success, ) = immunityLayer.call(
            abi.encodeWithSignature("protectedCall(address,bytes)", address(this), "")
        );
        require(success, "Reentrancy call failed");
    }
}

contract RandomContract {
    uint256 public value;
    
    function setValue(uint256 _value) external {
        value = _value;
    }
    
    function getValue() external view returns (uint256) {
        return value;
    }
}

contract FlashLoanSimulator {
    address public target;
    
    constructor(address _target) {
        target = _target;
    }
    
    function executeFlashLoanAttack() external {
        // Simulate flash loan attack pattern:
        // Multiple rapid calls with low balance
        for (uint i = 0; i < 5; i++) {
            (bool success, ) = target.call(
                abi.encodeWithSignature("getBalance()")
            );
            require(success, "Call failed");
        }
    }
    
    receive() external payable {}
}