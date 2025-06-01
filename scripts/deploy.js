const hre = require("hardhat");
const fs = require("fs");
const path = "charity-frontend/src/contracts/addresses.json";

async function main() {
  console.log("Deploying contracts…");
  // Get deployer and set admin address
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const adminAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
  console.log("Setting admin address to:", adminAddress);
  const CharityRegistry = await hre.ethers.getContractFactory(
    "CharityRegistry"
  );
  const charityRegistry = await CharityRegistry.deploy();
  await charityRegistry.waitForDeployment();
  console.log("CharityReg deployed to:", charityRegistry.target);

  if (deployer.address.toLowerCase() !== adminAddress.toLowerCase()) {
    console.log("Transferring CharityRegistry ownership to admin...");
    await charityRegistry.transferOwnership(adminAddress);
    console.log("CharityReg ownership transferred to:", adminAddress);
  }

  const initialSupply = 1_000_000;
  const CharityToken = await hre.ethers.getContractFactory("CharityToken");
  const charityToken = await CharityToken.deploy(initialSupply);
  await charityToken.waitForDeployment();
  console.log("CharityToken deployed to:", charityToken.target);
  const DonationPlatform = await hre.ethers.getContractFactory(
    "DonationPlatform"
  );
  const donationPlatform = await DonationPlatform.deploy(
    charityRegistry.target
  );
  await donationPlatform.waitForDeployment();
  console.log("DonationPlatform deployed to:", donationPlatform.target);

  const addresses = {
    CharityRegistry: charityRegistry.target,
    CharityToken: charityToken.target,
    DonationPlatform: donationPlatform.target,
  };

  console.log("Contract addresses:", addresses);

  fs.writeFileSync(path, JSON.stringify(addresses, null, 2));
  console.log(`Addresses written to ${path}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
