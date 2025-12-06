// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

abstract contract ProtectedContract {
    
    address public immunityLayer;
    address public contractOwner;
    
    modifier protected() {
        require(immunityLayer != address(0), "Immunity layer not set");
        _;
    }
    
    constructor(address _immunityLayer) {
        immunityLayer = _immunityLayer;
        contractOwner = msg.sender;
    }
    
    function setImmunityLayer(address _immunityLayer) external {
        require(msg.sender == contractOwner, "Only owner");
        immunityLayer = _immunityLayer;
    }
}