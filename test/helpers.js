const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const THREAT_LEVELS = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

const VULNERABILITY_TYPES = {
  REENTRANCY: 0,
  FLASH_LOAN: 1,
  STATE_MANIPULATION: 2,
  UNEXPECTED_ETH_FLOW: 3,
  UNSAFE_CALL: 4,
  ACCESS_CONTROL: 5,
  INTEGER_OVERFLOW: 6,
  LOGIC_ERROR: 7,
  UNKNOWN: 8
};

async function deployContractsFixture() {
  const [owner, attacker, user1, user2, aiOperator] = await ethers.getSigners();
  
  // Deploy Immunity Layer
  const ImmunityLayer = await ethers.getContractFactory("ContractImmunityLayer");
  const immunityLayer = await ImmunityLayer.deploy();
  await immunityLayer.deployed();
  
  // Deploy AI Oracle
  const AIOracle = await ethers.getContractFactory("AIAnalysisOracle");
  const aiOracle = await AIOracle.deploy(immunityLayer.address);
  await aiOracle.deployed();
  
  // Set AI Oracle in Immunity Layer
  await immunityLayer.setAIOracle(aiOracle.address);
  
  // Deploy Vulnerable Bank
  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
  const bank = await VulnerableBank.deploy(immunityLayer.address);
  await bank.deployed();
  
  // Enable protection
  await immunityLayer.connect(owner).addContractProtection(bank.address, 3);
  
  // Deploy Mock Malicious Contract
  const MockMalicious = await ethers.getContractFactory("MockMalicious");
  const malicious = await MockMalicious.deploy(bank.address);
  await malicious.deployed();
  
  return {
    owner,
    attacker,
    user1,
    user2,
    aiOperator,
    immunityLayer,
    aiOracle,
    bank,
    malicious,
    THREAT_LEVELS,
    VULNERABILITY_TYPES
  };
}

function encodeFunctionCall(contract, functionName, params) {
  const iface = contract.interface;
  return iface.encodeFunctionData(functionName, params);
}

async function mineBlocks(count) {
  for (let i = 0; i < count; i++) {
    await ethers.provider.send("evm_mine", []);
  }
}

async function getThreatId(targetContract, caller, data) {
  const block = await ethers.provider.getBlock("latest");
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "bytes", "uint256", "uint256", "uint256"],
      [targetContract, caller, data, 0, block.number, block.timestamp]
    )
  );
}

module.exports = {
  deployContractsFixture,
  encodeFunctionCall,
  mineBlocks,
  getThreatId,
  THREAT_LEVELS,
  VULNERABILITY_TYPES,
  loadFixture
};