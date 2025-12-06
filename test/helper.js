const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

async function deployContractsFixture() {
  const [owner, attacker, user1, user2, aiOperator] = await ethers.getSigners();
  
  // Deploy Immunity Layer
  const ImmunityLayer = await ethers.getContractFactory("ContractImmunityLayer");
  const immunityLayer = await ImmunityLayer.deploy();
  await immunityLayer.deployed();
  await immunityLayer.transferOwnership(owner.address);
  
  // Deploy AI Oracle
  const AIOracle = await ethers.getContractFactory("AIAnalysisOracle");
  const aiOracle = await AIOracle.deploy(immunityLayer.address);
  await aiOracle.deployed();
  
  // Deploy Vulnerable Bank
  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
  const bank = await VulnerableBank.deploy(immunityLayer.address);
  await bank.deployed();
  
  // Enable protection
  await immunityLayer.connect(owner).addContractProtection(bank.address, 3);
  
  // Deploy Mock Malicious
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
    malicious
  };
}

function encodeFunctionCall(contract, functionName, params) {
  const iface = new ethers.utils.Interface(contract.interface.fragments);
  return iface.encodeFunctionData(functionName, params);
}

async function mineBlocks(count) {
  for (let i = 0; i < count; i++) {
    await ethers.provider.send("evm_mine", []);
  }
}

module.exports = {
  deployContractsFixture,
  encodeFunctionCall,
  mineBlocks
};