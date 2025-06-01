// Debug script to check charity balances and fund request details
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Load contract addresses
  const addresses = JSON.parse(
    fs.readFileSync("./charity-frontend/src/contracts/addresses.json", "utf8")
  );

  // Get contract instances
  const donationPlatform = await ethers.getContractAt(
    "DonationPlatform",
    addresses.DonationPlatform
  );

  const charityRegistry = await ethers.getContractAt(
    "CharityRegistry",
    addresses.CharityRegistry
  );

  console.log("=== FUND REQUEST AND BALANCE DEBUG ===\n");

  // Get all fund requests
  const requestCount = await donationPlatform.getFundRequestsCount();
  console.log(`Total fund requests: ${requestCount}\n`);

  for (let i = 0; i < requestCount; i++) {
    console.log(`--- Fund Request ${i} ---`);

    const details = await donationPlatform.getFundRequestDetails(i);
    const charity = details.charityAddress;
    const amount = ethers.utils.formatEther(details.amount);
    const status = details.status; // 0=Pending, 1=Approved, 2=Rejected, 3=Completed

    console.log(`Charity: ${charity}`);
    console.log(`Requested Amount: ${amount} ETH`);
    console.log(`Status: ${status} (${getStatusName(status)})`);
    console.log(`Purpose: ${details.purpose}`);

    // Check charity's actual balance
    const charityBalance = await donationPlatform.charityBalances(
      charity,
      ethers.constants.AddressZero
    );
    const balanceETH = ethers.utils.formatEther(charityBalance);
    console.log(`Charity's Available Balance: ${balanceETH} ETH`);

    // Check if charity is approved
    const isCharityApproved = await charityRegistry.isCharityApproved(charity);
    console.log(`Charity Approved: ${isCharityApproved}`);

    // Check if withdrawal would work
    const canWithdraw =
      status === 1 && parseFloat(balanceETH) >= parseFloat(amount);
    console.log(`Can Withdraw: ${canWithdraw}`);

    if (status === 1 && !canWithdraw) {
      console.log(
        `❌ ISSUE: Request is approved but charity doesn't have enough balance!`
      );
      console.log(`   Need: ${amount} ETH, Have: ${balanceETH} ETH`);
    }

    console.log("");
  }

  // Show total donations received by all charities
  console.log("--- CHARITY BALANCES ---");
  const charityAddresses = await charityRegistry.getAllCharities();

  for (const charityAddr of charityAddresses) {
    const balance = await donationPlatform.charityBalances(
      charityAddr,
      ethers.constants.AddressZero
    );
    const balanceETH = ethers.utils.formatEther(balance);

    if (parseFloat(balanceETH) > 0) {
      console.log(`${charityAddr}: ${balanceETH} ETH`);
    }
  }
}

function getStatusName(status) {
  switch (status) {
    case 0:
      return "Pending";
    case 1:
      return "Approved";
    case 2:
      return "Rejected";
    case 3:
      return "Completed";
    default:
      return "Unknown";
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
