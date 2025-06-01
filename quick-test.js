const { ethers } = require("hardhat");

async function quickTest() {
  console.log("🔍 Quick Contract Verification Test");

  // Get the first signer
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", signer.address);

  // Contract addresses
  const addresses = {
    CharityRegistry: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
    CharityToken: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
    DonationPlatform: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
  };

  try {
    // Test CharityRegistry
    const CharityRegistry = await ethers.getContractFactory("CharityRegistry");
    const charityRegistry = CharityRegistry.attach(addresses.CharityRegistry);

    const totalCharities = await charityRegistry.totalCharities();
    console.log(
      "✅ CharityRegistry working - Total charities:",
      totalCharities.toString()
    );

    // Test CharityToken
    const CharityToken = await ethers.getContractFactory("CharityToken");
    const charityToken = CharityToken.attach(addresses.CharityToken);

    const tokenName = await charityToken.name();
    const tokenSymbol = await charityToken.symbol();
    console.log(`✅ CharityToken working - ${tokenName} (${tokenSymbol})`);

    // Test DonationPlatform
    const DonationPlatform = await ethers.getContractFactory(
      "DonationPlatform"
    );
    const donationPlatform = DonationPlatform.attach(
      addresses.DonationPlatform
    );

    const totalDonations = await donationPlatform.totalDonationsCount();
    console.log(
      "✅ DonationPlatform working - Total donations:",
      totalDonations.toString()
    );

    console.log("\n🎉 All contracts are accessible and functional!");
    console.log("\n📋 Your platform is ready for viva examination!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

quickTest();
