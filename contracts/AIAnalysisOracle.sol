// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AIAnalysisOracle {
    
    address public immunityLayer;
    address public owner;
    
    struct AnalysisRequest {
        bytes32 threatId;
        address targetContract;
        address caller;
        bytes data;  // Changed from: bytes calldata;
        uint256 timestamp;
        bool completed;
        string aiAnalysis;
        string suggestedAction;
    }
    
    mapping(bytes32 => AnalysisRequest) public analysisRequests;
    
    event AnalysisRequested(
        bytes32 indexed threatId,
        address indexed targetContract,
        address indexed caller
    );
    
    event AnalysisCompleted(
        bytes32 indexed threatId,
        string aiAnalysis,
        string suggestedAction,
        bool isCritical
    );
    
    modifier onlyImmunityLayer() {
        require(msg.sender == immunityLayer, "Only Immunity Layer can call");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(address _immunityLayer) {
        immunityLayer = _immunityLayer;
        owner = msg.sender;
    }
    
    function requestAnalysis(
        bytes32 _threatId,
        address _targetContract,
        address _caller,
        bytes calldata _data  // Changed from: bytes calldata _data
    ) external onlyImmunityLayer {
        
        analysisRequests[_threatId] = AnalysisRequest({
            threatId: _threatId,
            targetContract: _targetContract,
            caller: _caller,
            data: _data,  // Changed from: calldata: _data
            timestamp: block.timestamp,
            completed: false,
            aiAnalysis: "",
            suggestedAction: ""
        });
        
        emit AnalysisRequested(_threatId, _targetContract, _caller);
    }
    
    function submitAnalysis(
        bytes32 _threatId,
        string calldata _analysis,
        string calldata _suggestedAction,
        bool _isCritical
    ) external onlyOwner {
        require(!analysisRequests[_threatId].completed, "Analysis already completed");
        
        analysisRequests[_threatId].completed = true;
        analysisRequests[_threatId].aiAnalysis = _analysis;
        analysisRequests[_threatId].suggestedAction = _suggestedAction;
        
        emit AnalysisCompleted(_threatId, _analysis, _suggestedAction, _isCritical);
    }
    
    function getAnalysis(bytes32 _threatId) 
        external 
        view 
        returns (
            string memory analysis,
            string memory suggestedAction,
            bool completed
        ) 
    {
        AnalysisRequest memory request = analysisRequests[_threatId];
        return (request.aiAnalysis, request.suggestedAction, request.completed);
    }
}