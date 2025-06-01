// Simple debug script for the browser console
// Copy and paste this into your browser console when on the charity frontend

async function debugFundRequests() {
  console.log("=== FUND REQUEST AND BALANCE DEBUG ===\n");

  try {
    // Access contracts from the global window
    const donationPlatform =
      window.platformWithSigner || window.donationPlatform;
    const charityRegistry = window.charityRegistry;

    if (!donationPlatform) {
      console.error(
        "DonationPlatform not found. Make sure you're on the charity frontend."
      );
      return;
    }

    // Get all fund requests
    const requestCount = await donationPlatform.getFundRequestsCount();
    console.log(`Total fund requests: ${requestCount.toString()}\n`);

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
      if (charityRegistry) {
        const isCharityApproved = await charityRegistry.isCharityApproved(
          charity
        );
        console.log(`Charity Approved: ${isCharityApproved}`);
      }

      // Check if withdrawal would work
      const canWithdraw =
        status == 1 && parseFloat(balanceETH) >= parseFloat(amount);
      console.log(`Can Withdraw: ${canWithdraw}`);

      if (status == 1 && !canWithdraw) {
        console.log(
          `❌ ISSUE: Request is approved but charity doesn't have enough balance!`
        );
        console.log(`   Need: ${amount} ETH, Have: ${balanceETH} ETH`);
      }

      console.log("");
    }

    console.log(
      "Debug complete. Check the output above for any balance mismatches."
    );
  } catch (error) {
    console.error("Error during debug:", error);
  }
}

function getStatusName(status) {
  switch (parseInt(status)) {
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

// Run the debug
debugFundRequests();
