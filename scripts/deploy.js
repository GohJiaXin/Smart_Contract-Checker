async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with account:", deployer.address);
    
    // Deploy Immunity Layer
    const ImmunityLayer = await ethers.getContractFactory("ContractImmunityLayer");
    const immunityLayer = await ImmunityLayer.deploy();
    await immunityLayer.deployed();
    console.log("Immunity Layer deployed to:", immunityLayer.address);
    
    // Deploy AI Oracle
    const AIOracle = await ethers.getContractFactory("AIAnalysisOracle");
    const aiOracle = await AIOracle.deploy(immunityLayer.address);
    await aiOracle.deployed();
    console.log("AI Oracle deployed to:", aiOracle.address);
    
    // Deploy Vulnerable Bank
    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    const bank = await VulnerableBank.deploy(immunityLayer.address);
    await bank.deployed();
    console.log("Vulnerable Bank deployed to:", bank.address);
    
    // Setup protection
    await immunityLayer.addContractProtection(bank.address, 3);
    console.log("Bank protected with level 3 security");
    
    // Transfer ownership
    await immunityLayer.transferOwnership(deployer.address);
    console.log("Ownership transferred to:", deployer.address);
    
    console.log("\nDeployment complete!");
    console.log("==========================");
    console.log("Immunity Layer:", immunityLayer.address);
    console.log("AI Oracle:", aiOracle.address);
    console.log("Protected Bank:", bank.address);
    console.log("==========================");
  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });