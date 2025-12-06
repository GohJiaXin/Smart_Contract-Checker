// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Contract Immunity Layer
 * @dev AI-powered smart contract protection with real-time threat detection
 */
contract ContractImmunityLayer is Ownable, ReentrancyGuard {
    
    // ========== ENUMS ==========
    enum ThreatLevel { 
        NONE,       // 0 - No threat detected
        LOW,        // 1 - Low risk, informational
        MEDIUM,     // 2 - Medium risk, monitor closely
        HIGH,       // 3 - High risk, freeze recommended
        CRITICAL    // 4 - Critical risk, immediate action required
    }
    
    enum VulnerabilityType { 
        REENTRANCY,
        FLASH_LOAN,
        STATE_MANIPULATION,
        UNEXPECTED_ETH_FLOW,
        UNSAFE_CALL,
        ACCESS_CONTROL,
        INTEGER_OVERFLOW,
        LOGIC_ERROR,
        UNKNOWN
    }
    
    // ========== STRUCTS ==========
    struct ThreatDetection {
        address suspiciousCaller;
        address targetContract;
        bytes originalCalldata;
        uint256 timestamp;
        ThreatLevel level;
        VulnerabilityType vulnType;
        string reason;
        uint256 blockNumber;
        bool isMitigated;
        bytes mitigationResult;
        uint256 freezeUntilBlock;
    }
    
    struct ContractProfile {
        address contractAddress;
        bool isProtected;
        uint256 protectionLevel;
        uint256 lastAuditTimestamp;
    }
    
    struct AISimulationResult {
        bool isDangerous;
        uint256 estimatedLoss;
        address[] affectedAddresses;
        string rootCause;
        string suggestedMitigation;
        bytes32 simulationId;
    }
    
    struct FrozenTransaction {
        bytes32 threatId;
        address initiator;
        uint256 frozenAt;
        uint256 freezeUntil;
        bool executed;
        bool cancelled;
    }
    
    // ========== STATE VARIABLES ==========
    mapping(address => ContractProfile) public protectedContracts;
    mapping(bytes32 => ThreatDetection) public threatDetections;
    mapping(bytes32 => FrozenTransaction) public frozenTransactions;
    mapping(address => uint256) public suspiciousAddressCount;
    mapping(address => uint256) public lastInteractionBlock;
    mapping(bytes32 => AISimulationResult) public simulationResults;
    
    uint256 public totalThreatsDetected;
    uint256 public totalThreatsMitigated;
    uint256 public totalLossPrevented;
    
    uint256 public freezeDuration = 30;
    uint256 public minBalanceThreshold = 0.1 ether;
    uint256 public maxCallDepth = 3;
    uint256 public suspiciousCallThreshold = 5;
    uint256 public gasPriceThreshold = 100 gwei;
    
    address public aiOracle;
    bool public emergencyStop;
    
    // ========== EVENTS ==========
    event ThreatDetected(
        bytes32 indexed threatId,
        address indexed targetContract,
        address indexed caller,
        ThreatLevel level,
        VulnerabilityType vulnType,
        string reason
    );
    
    event TransactionFrozen(
        bytes32 indexed threatId,
        address indexed targetContract,
        address indexed caller,
        uint256 freezeUntilBlock,
        ThreatLevel level
    );
    
    event MitigationExecuted(
        bytes32 indexed threatId,
        address indexed targetContract,
        bool success,
        string action,
        bytes result
    );
    
    event ContractProtected(
        address indexed contractAddress,
        address indexed owner,
        uint256 protectionLevel,
        uint256 timestamp
    );
    
    event ContractUnprotected(
        address indexed contractAddress,
        address indexed owner,
        uint256 timestamp
    );
    
    event EmergencyStopActivated(
        address indexed activatedBy,
        uint256 timestamp,
        string reason
    );
    
    event EmergencyStopDeactivated(
        address indexed deactivatedBy,
        uint256 timestamp
    );
    
    event AISimulationRequested(
        bytes32 indexed threatId,
        bytes32 indexed simulationId,
        address indexed targetContract
    );
    
    // ========== MODIFIERS ==========
    modifier onlyProtectedContract(address _contract) {
        require(protectedContracts[_contract].isProtected, "Contract not protected");
        _;
    }
    
    modifier notFrozen(bytes32 _threatId) {
        require(!_isFrozen(_threatId), "Transaction is frozen");
        _;
    }
    
    modifier notEmergencyStopped() {
        require(!emergencyStop, "Emergency stop is active");
        _;
    }
    
    modifier onlyAIOracle() {
        require(msg.sender == aiOracle, "Only AI Oracle can call");
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    constructor() {
        // Initialize with default owner (deployer)
    }
    
    // ========== EXTERNAL FUNCTIONS ==========
    function protectedCall(
        address _target,
        bytes calldata _data
    ) 
        external 
        payable 
        nonReentrant 
        notEmergencyStopped
        returns (bytes memory) 
    {
        require(protectedContracts[_target].isProtected, "Target not protected");
        
        ThreatDetection memory threat = _detectThreats(_target, msg.sender, _data, msg.value);
        
        bytes32 threatId = keccak256(
            abi.encodePacked(_target, msg.sender, _data, msg.value, block.number, block.timestamp)
        );
        
        if (threat.level > ThreatLevel.NONE) {
            threatDetections[threatId] = threat;
            totalThreatsDetected++;
            
            emit ThreatDetected(
                threatId,
                _target,
                msg.sender,
                threat.level,
                threat.vulnType,
                threat.reason
            );
            
            if (threat.level >= ThreatLevel.HIGH) {
                _freezeTransaction(threatId, threat);
                _requestAISimulation(threatId, threat);
                
                revert(string(abi.encodePacked(
                    "Transaction frozen for security review. Threat ID: ",
                    _bytes32ToString(threatId)
                )));
            } else if (threat.level == ThreatLevel.MEDIUM) {
                _logThreat(threatId, threat);
            } else {
                _logThreat(threatId, threat);
            }
        }
        
        return _executeWithEnhancedMonitoring(_target, _data, msg.value, threatId);
    }
    
    // ========== OWNER FUNCTIONS ==========
    function addContractProtection(
        address _contract,
        uint256 _protectionLevel
    ) external onlyOwner {
        require(_contract != address(0), "Invalid contract address");
        require(_protectionLevel >= 1 && _protectionLevel <= 5, "Invalid protection level");
        
        protectedContracts[_contract] = ContractProfile({
            contractAddress: _contract,
            isProtected: true,
            protectionLevel: _protectionLevel,
            lastAuditTimestamp: block.timestamp
        });
        
        emit ContractProtected(_contract, msg.sender, _protectionLevel, block.timestamp);
    }
    
    function removeContractProtection(address _contract) external onlyOwner {
        require(protectedContracts[_contract].isProtected, "Contract not protected");
        
        protectedContracts[_contract].isProtected = false;
        emit ContractUnprotected(_contract, msg.sender, block.timestamp);
    }
    
    function executeOwnerOverride(
        bytes32 _threatId,
        string calldata _action
    ) external onlyOwner {
        require(threatDetections[_threatId].level != ThreatLevel.NONE, "No threat found");
        require(frozenTransactions[_threatId].frozenAt > 0, "Transaction not frozen");
        
        ThreatDetection storage threat = threatDetections[_threatId];
        FrozenTransaction storage frozenTx = frozenTransactions[_threatId];
        
        require(!frozenTx.executed && !frozenTx.cancelled, "Transaction already processed");
        require(block.number <= frozenTx.freezeUntil, "Freeze period expired");
        
        bytes memory result;
        bool success = false;
        
        if (keccak256(bytes(_action)) == keccak256(bytes("execute"))) {
            (success, result) = threat.targetContract.call{value: 0}(
                threat.originalCalldata
            );
            
            if (success) {
                threat.isMitigated = true;
                threat.mitigationResult = result;
                frozenTx.executed = true;
                totalThreatsMitigated++;
                
                emit MitigationExecuted(
                    _threatId,
                    threat.targetContract,
                    true,
                    "Executed with owner override",
                    result
                );
            }
        } else if (keccak256(bytes(_action)) == keccak256(bytes("revert"))) {
            threat.isMitigated = true;
            threat.mitigationResult = abi.encode("Transaction reverted by owner");
            frozenTx.cancelled = true;
            totalThreatsMitigated++;
            
            emit MitigationExecuted(
                _threatId,
                threat.targetContract,
                true,
                "Reverted by owner",
                abi.encode("Reverted")
            );
        } else if (keccak256(bytes(_action)) == keccak256(bytes("simulate"))) {
            _requestAISimulation(_threatId, threat);
            revert("Simulation requested");
        } else {
            revert("Invalid action");
        }
    }
    
    function activateEmergencyStop(string calldata _reason) external onlyOwner {
        emergencyStop = true;
        emit EmergencyStopActivated(msg.sender, block.timestamp, _reason);
    }
    
    function deactivateEmergencyStop() external onlyOwner {
        emergencyStop = false;
        emit EmergencyStopDeactivated(msg.sender, block.timestamp);
    }
    
    function setAIOracle(address _aiOracle) external onlyOwner {
        require(_aiOracle != address(0), "Invalid AI Oracle address");
        aiOracle = _aiOracle;
    }
    
    function setFreezeDuration(uint256 _duration) external onlyOwner {
        require(_duration > 0 && _duration <= 1000, "Invalid duration");
        freezeDuration = _duration;
    }
    
    function setMinBalanceThreshold(uint256 _threshold) external onlyOwner {
        minBalanceThreshold = _threshold;
    }
    
    function setMaxCallDepth(uint256 _depth) external onlyOwner {
        require(_depth > 0 && _depth <= 10, "Invalid call depth");
        maxCallDepth = _depth;
    }
    
    function setSuspiciousCallThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold > 0, "Invalid threshold");
        suspiciousCallThreshold = _threshold;
    }
    
    function setGasPriceThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold > 0, "Invalid threshold");
        gasPriceThreshold = _threshold;
    }
    
    // ========== AI ORACLE FUNCTIONS ==========
    function receiveAISimulationResult(
        bytes32 _threatId,
        bool _isDangerous,
        uint256 _estimatedLoss,
        string calldata _rootCause,
        string calldata _suggestedMitigation
    ) external onlyAIOracle {
        require(threatDetections[_threatId].level != ThreatLevel.NONE, "No threat found");
        
        bytes32 simulationId = keccak256(
            abi.encodePacked(_threatId, block.timestamp, msg.sender)
        );
        
        simulationResults[simulationId] = AISimulationResult({
            isDangerous: _isDangerous,
            estimatedLoss: _estimatedLoss,
            affectedAddresses: new address[](0),
            rootCause: _rootCause,
            suggestedMitigation: _suggestedMitigation,
            simulationId: simulationId
        });
        
        ThreatDetection storage threat = threatDetections[_threatId];
        threat.reason = string(abi.encodePacked(threat.reason, " | AI Analysis: ", _rootCause));
        
        if (_isDangerous && threat.level == ThreatLevel.CRITICAL) {
            _executeAutoMitigation(_threatId, _suggestedMitigation);
        }
    }
    
    // ========== VIEW FUNCTIONS ==========
    function getThreatDetails(bytes32 _threatId) 
        external 
        view 
        returns (
            address caller,
            address target,
            uint256 timestamp,
            uint256 level,
            uint256 vulnType,
            string memory reason,
            bool isFrozen,
            bool isMitigated,
            uint256 freezeUntil
        ) 
    {
        ThreatDetection memory threat = threatDetections[_threatId];
        return (
            threat.suspiciousCaller,
            threat.targetContract,
            threat.timestamp,
            uint256(threat.level),
            uint256(threat.vulnType),
            threat.reason,
            _isFrozen(_threatId),
            threat.isMitigated,
            threat.freezeUntilBlock
        );
    }
    
    function isContractProtected(address _contract) external view returns (bool) {
        return protectedContracts[_contract].isProtected;
    }
    
    function getProtectionLevel(address _contract) external view returns (uint256) {
        require(protectedContracts[_contract].isProtected, "Contract not protected");
        return protectedContracts[_contract].protectionLevel;
    }
    
    function getStats() external view returns (
        uint256 threatsDetected,
        uint256 threatsMitigated,
        uint256 lossPrevented
    ) {
        return (
            totalThreatsDetected,
            totalThreatsMitigated,
            totalLossPrevented
        );
    }
    
    function isAddressSuspicious(address _addr) external view returns (bool) {
        return suspiciousAddressCount[_addr] >= suspiciousCallThreshold;
    }
    
    // ========== INTERNAL FUNCTIONS ==========
    function _detectThreats(
        address _target,
        address _caller,
        bytes calldata _data,
        uint256 _value
    ) internal view returns (ThreatDetection memory) {
        
        ThreatLevel level = ThreatLevel.NONE;
        VulnerabilityType vulnType = VulnerabilityType.UNKNOWN;
        string memory reason = "";
        
        if (_detectReentrancyPattern(_data, _caller)) {
            level = ThreatLevel.HIGH;
            vulnType = VulnerabilityType.REENTRANCY;
            reason = "Possible reentrancy attack pattern detected";
        } else if (_detectFlashLoanPattern(_caller, _value)) {
            level = ThreatLevel.HIGH;
            vulnType = VulnerabilityType.FLASH_LOAN;
            reason = "Flash loan manipulation pattern detected";
        } else if (_detectStateManipulation(_caller)) {
            level = ThreatLevel.MEDIUM;
            vulnType = VulnerabilityType.STATE_MANIPULATION;
            reason = "Suspicious state manipulation pattern";
        } else if (_detectUnexpectedETHFlow(_data, _value)) {
            level = ThreatLevel.MEDIUM;
            vulnType = VulnerabilityType.UNEXPECTED_ETH_FLOW;
            reason = "Unexpected ETH transfer pattern";
        } else if (_detectUnsafeCall(_data)) {
            level = ThreatLevel.LOW;
            vulnType = VulnerabilityType.UNSAFE_CALL;
            reason = "Unsafe external call detected";
        } else if (_detectAccessControlViolation(_data)) {
            level = ThreatLevel.HIGH;
            vulnType = VulnerabilityType.ACCESS_CONTROL;
            reason = "Possible access control violation";
        } else if (_detectHighFrequencyCalls(_caller)) {
            level = ThreatLevel.LOW;
            reason = "High frequency calls from same address";
        } else if (tx.gasprice > gasPriceThreshold) {
            level = ThreatLevel.LOW;
            reason = "Unusually high gas price";
        }
        
        return ThreatDetection({
            suspiciousCaller: _caller,
            targetContract: _target,
            originalCalldata: _data,
            timestamp: block.timestamp,
            level: level,
            vulnType: vulnType,
            reason: reason,
            blockNumber: block.number,
            isMitigated: false,
            mitigationResult: "",
            freezeUntilBlock: 0
        });
    }
    
    function _detectReentrancyPattern(
        bytes calldata _data,
        address _caller
    ) internal view returns (bool) {
        if (_caller.code.length == 0) {
            return false;
        }
        
        if (_data.length >= 4) {
            bytes4 funcSig = bytes4(_data[:4]);
            
            bytes4[] memory vulnerableSigs = new bytes4[](10);
            vulnerableSigs[0] = 0xa9059cbb; // transfer(address,uint256)
            vulnerableSigs[1] = 0x095ea7b3; // approve(address,uint256)
            vulnerableSigs[2] = 0x23b872dd; // transferFrom(address,address,uint256)
            vulnerableSigs[3] = 0x40c10f19; // mint(address,uint256)
            vulnerableSigs[4] = 0x9dc29fac; // burn(address,uint256)
            vulnerableSigs[5] = 0x42966c68; // burn(uint256)
            vulnerableSigs[6] = 0x79cc6790; // burnFrom(address,uint256)
            vulnerableSigs[7] = 0x40e58ee5; // deposit()
            vulnerableSigs[8] = 0x2e1a7d4d; // withdraw(uint256)
            vulnerableSigs[9] = 0x3ccfd60b; // withdraw()
            
            for (uint i = 0; i < vulnerableSigs.length; i++) {
                if (funcSig == vulnerableSigs[i]) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    function _detectFlashLoanPattern(
        address _caller,
        uint256 _value
    ) internal view returns (bool) {
        if (_caller.code.length > 0 && 
            _caller.balance < minBalanceThreshold &&
            tx.origin != _caller) {
            return true;
        }
        
        if (_value > 10 ether && gasleft() < 100000) {
            return true;
        }
        
        return false;
    }
    
    function _detectStateManipulation(
        address _caller
    ) internal view returns (bool) {
        if (lastInteractionBlock[_caller] == block.number) {
            suspiciousAddressCount[_caller]++;
            return suspiciousAddressCount[_caller] >= suspiciousCallThreshold;
        } else {
            lastInteractionBlock[_caller] = block.number;
            suspiciousAddressCount[_caller] = 1;
        }
        
        return false;
    }
    
    function _detectUnexpectedETHFlow(
        bytes calldata _data,
        uint256 _value
    ) internal pure returns (bool) {
        if (_value > 0 && _data.length > 0) {
            bytes4 funcSig = bytes4(_data[:4]);
            if (funcSig != 0x00000000) {
                return true;
            }
        }
        return false;
    }
    
    function _detectUnsafeCall(bytes calldata _data) internal pure returns (bool) {
        if (_data.length >= 4) {
            bytes4 funcSig = bytes4(_data[:4]);
            
            if (funcSig == 0x5c60da1b || // implementation()
                funcSig == 0x3659cfe6 || // upgradeTo(address)
                funcSig == 0x4f1ef286 || // upgradeToAndCall(address,bytes)
                funcSig == 0x8f283970 || // changeAdmin(address)
                funcSig == 0xf851a440) { // admin()
                return true;
            }
        }
        return false;
    }
    
    function _detectAccessControlViolation(
        bytes calldata _data
    ) internal pure returns (bool) {
        if (_data.length >= 4) {
            bytes4 funcSig = bytes4(_data[:4]);
            
            bytes4[] memory adminSigs = new bytes4[](8);
            adminSigs[0] = 0xf2fde38b; // transferOwnership(address)
            adminSigs[1] = 0x8da5cb5b; // owner()
            adminSigs[2] = 0xa6f9dae1; // changeOwner(address)
            adminSigs[3] = 0x3cebb823; // setOwner(address)
            adminSigs[4] = 0x704b6c02; // mint(address,uint256)
            adminSigs[5] = 0x40c10f19; // mint(address,uint256)
            adminSigs[6] = 0x42966c68; // burn(uint256)
            adminSigs[7] = 0x9dc29fac; // burn(address,uint256)
            
            for (uint i = 0; i < adminSigs.length; i++) {
                if (funcSig == adminSigs[i]) {
                    return true;
                }
            }
        }
        return false;
    }
    
    function _detectHighFrequencyCalls(address _caller) internal view returns (bool) {
        if (lastInteractionBlock[_caller] == block.number) {
            suspiciousAddressCount[_caller]++;
            return suspiciousAddressCount[_caller] > 3;
        }
        return false;
    }
    
    function _freezeTransaction(bytes32 _threatId, ThreatDetection memory _threat) internal {
        uint256 freezeUntil = block.number + freezeDuration;
        
        threatDetections[_threatId].freezeUntilBlock = freezeUntil;
        
        frozenTransactions[_threatId] = FrozenTransaction({
            threatId: _threatId,
            initiator: _threat.suspiciousCaller,
            frozenAt: block.timestamp,
            freezeUntil: freezeUntil,
            executed: false,
            cancelled: false
        });
        
        emit TransactionFrozen(
            _threatId,
            _threat.targetContract,
            _threat.suspiciousCaller,
            freezeUntil,
            _threat.level
        );
    }
    
    function _requestAISimulation(bytes32 _threatId, ThreatDetection memory _threat) internal {
        if (aiOracle == address(0)) return;
        
        bytes32 simulationId = keccak256(
            abi.encodePacked(_threatId, block.timestamp, aiOracle)
        );
        
        emit AISimulationRequested(_threatId, simulationId, _threat.targetContract);
    }
    
    function _executeAutoMitigation(bytes32 _threatId, string memory _action) internal {
        ThreatDetection storage threat = threatDetections[_threatId];
        
        if (keccak256(bytes(_action)) == keccak256(bytes("revert"))) {
            threat.isMitigated = true;
            threat.mitigationResult = abi.encode("Auto-reverted by AI analysis");
            totalThreatsMitigated++;
            
            emit MitigationExecuted(
                _threatId,
                threat.targetContract,
                true,
                "Auto-reverted by AI",
                abi.encode("Reverted")
            );
        }
    }
    
    function _executeWithEnhancedMonitoring(
        address _target,
        bytes memory _data,
        uint256 _value,
        bytes32 _threatId
    ) internal returns (bytes memory) {
        (bool success, bytes memory result) = _target.call{value: _value}(_data);
        require(success, "Execution failed");
        
        if (threatDetections[_threatId].level != ThreatLevel.NONE) {
            threatDetections[_threatId].isMitigated = true;
            threatDetections[_threatId].mitigationResult = result;
        }
        
        return result;
    }
    
    function _logThreat(bytes32 _threatId, ThreatDetection memory _threat) internal {
        threatDetections[_threatId] = _threat;
    }
    
    function _isFrozen(bytes32 _threatId) internal view returns (bool) {
        ThreatDetection memory threat = threatDetections[_threatId];
        return threat.freezeUntilBlock > block.number;
    }
    
    function _bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        uint8 i = 0;
        while(i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }
    
    // ========== FALLBACK & RECEIVE ==========
    receive() external payable {
        // Accept ETH
    }
    
    fallback() external payable {
        revert("Direct calls not allowed");
    }
}