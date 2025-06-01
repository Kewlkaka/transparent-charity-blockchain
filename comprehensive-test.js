const { ethers } = require("hardhat");

async function main() {
  console.log("=== COMPREHENSIVE FUND REQUEST STATUS TEST ===\n");

  // Get signers
  const [owner, charity1, donor1] = await ethers.getSigners();

  console.log("Test accounts:");
  console.log("Owner:", owner.address);
  console.log("Charity1:", charity1.address);
  console.log("Donor1:", donor1.address);
  console.log("");

  // Contract addresses from deployment
  const addresses = {
    CharityRegistry: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    CharityToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    DonationPlatform: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  };

  // Get contract instances
  const donationPlatform = await ethers.getContractAt(
    "DonationPlatform",
    addresses.DonationPlatform
  );
  const charityRegistry = await ethers.getContractAt(
    "CharityRegistry",
    addresses.CharityRegistry
  );

  try {
    console.log("Step 1: Setup charity...");

    // Register charity1
    await charityRegistry
      .connect(charity1)
      .registerCharity(
        "Test Charity",
        "A test charity for debugging",
        charity1.address,
        "https://test.com",
        "test@test.com"
      );
    console.log("✅ Charity registered");

    // Approve the charity (only owner can do this)
    await charityRegistry
      .connect(owner)
      .updateCharityStatus(charity1.address, 1);
    console.log("✅ Charity approved");

    // Verify charity is approved
    const isApproved = await charityRegistry.isCharityApproved(
      charity1.address
    );
    console.log(`Charity approval status: ${isApproved}`);

    console.log("\nStep 2: Make donation to build charity balance...");

    // Make a donation to give the charity funds to work with
    const donationAmount = ethers.utils.parseEther("10.0");
    await donationPlatform
      .connect(donor1)
      .donateETH(charity1.address, "Test donation", {
        value: donationAmount,
      });
    console.log("✅ Donated 10 ETH to charity");

    // Check charity balance
    const charityBalance = await donationPlatform.charityBalances(
      charity1.address,
      ethers.constants.AddressZero
    );
    console.log(
      `Charity balance: ${ethers.utils.formatEther(charityBalance)} ETH`
    );

    console.log("\nStep 3: Create fund request...");

    const requestAmount = ethers.utils.parseEther("5.0");
    const createTx = await donationPlatform
      .connect(charity1)
      .createFundRequest(
        requestAmount,
        "Emergency Relief",
        "Funds needed for emergency relief operations"
      );
    const createReceipt = await createTx.wait();
    console.log("✅ Fund request created");
    console.log(`Transaction hash: ${createReceipt.transactionHash}`);

    console.log("\nStep 4: Immediately check fund request status...");

    const requestCount = await donationPlatform.getFundRequestsCount();
    console.log(`Total fund requests: ${requestCount}`);

    if (requestCount > 0) {
      const requestId = requestCount - 1; // Get the latest request
      const details = await donationPlatform.getFundRequestDetails(requestId);

      console.log(`\n--- Fund Request ${requestId} Details ---`);
      console.log(`Charity: ${details.charityAddress}`);
      console.log(`Amount: ${ethers.utils.formatEther(details.amount)} ETH`);
      console.log(`Purpose: ${details.purpose}`);
      console.log(`Description: ${details.description}`);
      console.log(`Status (raw): ${details.status}`);
      console.log(`Status (number): ${Number(details.status)}`);
      console.log(`Status (name): ${getStatusName(Number(details.status))}`);
      console.log(
        `Request Date: ${new Date(
          Number(details.requestDate) * 1000
        ).toLocaleString()}`
      );
      console.log(
        `Completion Date: ${
          Number(details.completionDate) === 0
            ? "N/A"
            : new Date(Number(details.completionDate) * 1000).toLocaleString()
        }`
      );

      // Critical test: newly created requests should be Pending (0)
      const statusNumber = Number(details.status);
      if (statusNumber === 0) {
        console.log(
          "\n✅ SUCCESS: Fund request correctly created with Pending status (0)"
        );
      } else {
        console.log(
          `\n❌ PROBLEM FOUND: Fund request created with status ${statusNumber} instead of 0 (Pending)!`
        );
      }

      console.log("\nStep 5: Test status update to Approved...");

      // Owner approves the request
      const approveTx = await donationPlatform
        .connect(owner)
        .updateFundRequestStatus(requestId, 1);
      await approveTx.wait();
      console.log("✅ Request approved by owner");

      // Check status after approval
      const updatedDetails = await donationPlatform.getFundRequestDetails(
        requestId
      );
      const updatedStatus = Number(updatedDetails.status);
      console.log(
        `Status after approval: ${updatedStatus} (${getStatusName(
          updatedStatus
        )})`
      );

      if (updatedStatus === 1) {
        console.log("✅ Status correctly updated to Approved (1)");
      } else {
        console.log(
          `❌ Status update failed: expected 1, got ${updatedStatus}`
        );
      }

      console.log("\nStep 6: Test withdrawal...");

      try {
        const withdrawTx = await donationPlatform
          .connect(charity1)
          .withdrawFunds(requestId, ethers.constants.AddressZero);
        await withdrawTx.wait();
        console.log("✅ Withdrawal successful");

        const finalDetails = await donationPlatform.getFundRequestDetails(
          requestId
        );
        const finalStatus = Number(finalDetails.status);
        console.log(
          `Final status after withdrawal: ${finalStatus} (${getStatusName(
            finalStatus
          )})`
        );

        if (finalStatus === 3) {
          console.log("✅ Status correctly updated to Completed (3)");
        } else {
          console.log(
            `❌ Final status unexpected: expected 3, got ${finalStatus}`
          );
        }
      } catch (error) {
        console.log(`❌ Withdrawal failed: ${error.message}`);
      }

      console.log("\n=== SUMMARY ===");
      console.log(
        "If you see all ✅ SUCCESS messages above, then the smart contract is working correctly."
      );
      console.log(
        "If fund requests appear as 'Approved' in the UI when they should be 'Pending',"
      );
      console.log(
        "the issue is likely in the frontend display logic or caching, not the smart contract."
      );
    } else {
      console.log("❌ No fund requests found after creation!");
    }
  } catch (error) {
    console.error(`\n❌ Test failed with error: ${error.message}`);
    console.error(error);
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
      return `Unknown (${status})`;
  }
}

main()
  .then(() => {
    console.log("\n=== TEST COMPLETED ===");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
