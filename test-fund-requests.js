const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== TESTING FUND REQUEST STATUS ISSUE ===\n");

  // Load contract addresses
  const addresses = JSON.parse(
    fs.readFileSync("./charity-frontend/src/contracts/addresses.json", "utf8")
  );

  // Get signers - these are the test accounts from Hardhat
  const [owner, charity1, donor1] = await ethers.getSigners();

  console.log("Owner:", owner.address);
  console.log("Charity1:", charity1.address);
  console.log("Donor1:", donor1.address);
  console.log("");

  // Get contract instances
  const donationPlatform = await ethers.getContractAt(
    "DonationPlatform",
    addresses.DonationPlatform
  );

  const charityRegistry = await ethers.getContractAt(
    "CharityRegistry",
    addresses.CharityRegistry
  );

  const charityToken = await ethers.getContractAt(
    "CharityToken",
    addresses.CharityToken
  );

  try {
    console.log("Step 1: Register and approve charity...");
    // Register charity1
    await charityRegistry
      .connect(charity1)
      .registerCharity(
        "Test Charity",
        "A test charity",
        charity1.address,
        "https://test.com",
        "test@test.com"
      );

    // Approve the charity (owner only)
    await charityRegistry
      .connect(owner)
      .updateCharityStatus(charity1.address, 1); // 1 = Approved
    console.log("✅ Charity registered and approved");
    console.log("\nStep 2: Make a donation to build up charity balance...");
    // Send some ETH to the donation platform for the charity
    const donationAmount = ethers.parseEther("5.0");
    await donationPlatform
      .connect(donor1)
      .donateETH(charity1.address, "Test donation", {
        value: donationAmount,
      });
    console.log("✅ Donated 5 ETH to charity");

    // Check charity balance
    const charityBalance = await donationPlatform.charityBalances(
      charity1.address,
      ethers.ZeroAddress
    );
    console.log(`Charity balance: ${ethers.formatEther(charityBalance)} ETH`);

    console.log("\nStep 3: Create a fund request...");
    const requestAmount = ethers.utils.parseEther("2.0");
    const tx = await donationPlatform
      .connect(charity1)
      .createFundRequest(
        requestAmount,
        "Emergency Relief",
        "Funds needed for emergency relief operations"
      );
    await tx.wait();
    console.log("✅ Fund request created");

    console.log("\nStep 4: Check fund request details...");
    const requestCount = await donationPlatform.getFundRequestsCount();
    console.log(`Total fund requests: ${requestCount}`);

    if (requestCount > 0) {
      const details = await donationPlatform.getFundRequestDetails(0);
      const status = details.status;

      console.log(`\n--- Fund Request 0 Details ---`);
      console.log(`Charity: ${details.charityAddress}`);
      console.log(`Amount: ${ethers.utils.formatEther(details.amount)} ETH`);
      console.log(`Purpose: ${details.purpose}`);
      console.log(`Status Code: ${status}`);
      console.log(`Status Name: ${getStatusName(status)}`);
      console.log(
        `Request Date: ${new Date(details.requestDate * 1000).toLocaleString()}`
      );

      // This is the key test - new requests should be Pending (0), not Approved (1)
      if (status === 0) {
        console.log("✅ CORRECT: Fund request is Pending (status = 0)");
      } else if (status === 1) {
        console.log(
          "❌ ISSUE FOUND: Fund request shows as Approved (status = 1) instead of Pending!"
        );
      } else {
        console.log(`❓ UNEXPECTED: Fund request has status ${status}`);
      }

      console.log("\nStep 5: Testing status update...");
      // Approve the request
      await donationPlatform.connect(owner).updateFundRequestStatus(0, 1); // 1 = Approved
      console.log("✅ Request approved by owner");

      // Check status after approval
      const updatedDetails = await donationPlatform.getFundRequestDetails(0);
      console.log(
        `Status after approval: ${updatedDetails.status} (${getStatusName(
          updatedDetails.status
        )})`
      );

      console.log("\nStep 6: Test withdrawal...");
      try {
        await donationPlatform
          .connect(charity1)
          .withdrawFunds(0, ethers.constants.AddressZero);
        console.log("✅ Withdrawal successful");

        const finalDetails = await donationPlatform.getFundRequestDetails(0);
        console.log(
          `Status after withdrawal: ${finalDetails.status} (${getStatusName(
            finalDetails.status
          )})`
        );
      } catch (error) {
        console.log(`❌ Withdrawal failed: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("Error during test:", error.message);
  }
}

function getStatusName(status) {
  switch (Number(status)) {
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

// Execute the test
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
