// test/DonationPlatform.test.js
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("DonationPlatform", function () {
  let CharityRegistry, DonationPlatform, CharityToken;
  let charityRegistry, donationPlatform, charityToken;
  let owner, donor1, donor2, charity1, charity2;
  let initialTokenSupply;

  beforeEach(async function () {
    [owner, donor1, donor2, charity1, charity2] = await ethers.getSigners();

    initialTokenSupply = ethers.BigNumber.from(1000000);

    // Deploy contracts
    CharityRegistry = await ethers.getContractFactory("CharityRegistry");
    charityRegistry = await CharityRegistry.deploy();
    await charityRegistry.deployed();

    DonationPlatform = await ethers.getContractFactory("DonationPlatform");
    donationPlatform = await DonationPlatform.deploy(charityRegistry.address);
    await donationPlatform.deployed();

    CharityToken = await ethers.getContractFactory("CharityToken");
    charityToken = await CharityToken.deploy(initialTokenSupply);
    await charityToken.deployed();

    // Register and approve charities
    await charityRegistry
      .connect(charity1)
      .registerCharity(
        "Red Cross",
        "Humanitarian aid",
        charity1.address,
        "www.redcross.org",
        "contact@redcross.org"
      );

    await charityRegistry
      .connect(charity2)
      .registerCharity(
        "Doctors Without Borders",
        "Medical assistance",
        charity2.address,
        "www.msf.org",
        "contact@msf.org"
      );

    // Approve charities
    await charityRegistry
      .connect(owner)
      .updateCharityStatus(charity1.address, 1); // 1 = Approved
    await charityRegistry
      .connect(owner)
      .updateCharityStatus(charity2.address, 1); // 1 = Approved

    // Transfer some tokens to donor1 for testing
    const tokensForDonor = ethers.BigNumber.from(10000).mul(
      ethers.BigNumber.from(10).pow(18)
    );
    await charityToken.connect(owner).transfer(donor1.address, tokensForDonor);
  });

  describe("ETH Donations", function () {
    it("should accept ETH donations to approved charities", async function () {
      const donationAmount = ethers.utils.parseEther("1");

      const tx = await donationPlatform
        .connect(donor1)
        .donateETH(charity1.address, "Supporting disaster relief", {
          value: donationAmount,
        });

      await expect(tx).to.emit(donationPlatform, "DonationReceived").withArgs(
        donor1.address,
        charity1.address,
        donationAmount,
        0, // ETH
        ethers.constants.AddressZero
      );

      // Check charity balance
      const charityBalance = await donationPlatform.charityBalances(
        charity1.address,
        ethers.constants.AddressZero
      );
      expect(charityBalance.toString()).to.equal(donationAmount.toString());
    });

    it("should not accept donations with zero amount", async function () {
      await expect(
        donationPlatform
          .connect(donor1)
          .donateETH(charity1.address, "Zero donation", { value: 0 })
      ).to.be.revertedWith("Donation amount must be greater than 0");
    });

    it("should not accept donations to unapproved charities", async function () {
      await charityRegistry
        .connect(owner)
        .updateCharityStatus(charity1.address, 2); // 2 = Rejected

      await expect(
        donationPlatform
          .connect(donor1)
          .donateETH(charity1.address, "To rejected charity", {
            value: ethers.utils.parseEther("1"),
          })
      ).to.be.revertedWith("Charity is not approved");
    });
  });

  describe("Token Donations", function () {
    it("should accept token donations to approved charities", async function () {
      const donationAmount = ethers.BigNumber.from(1000).mul(
        ethers.BigNumber.from(10).pow(18)
      );

      // Approve tokens first
      await charityToken
        .connect(donor1)
        .approve(donationPlatform.address, donationAmount);

      const tx = await donationPlatform
        .connect(donor1)
        .donateToken(
          charity1.address,
          charityToken.address,
          donationAmount,
          "Token donation for medical supplies"
        );

      await expect(tx).to.emit(donationPlatform, "DonationReceived").withArgs(
        donor1.address,
        charity1.address,
        donationAmount,
        1, // Token
        charityToken.address
      );

      // Check charity token balance
      const charityTokenBalance = await donationPlatform.charityBalances(
        charity1.address,
        charityToken.address
      );
      expect(charityTokenBalance).to.equal(donationAmount);
    });
  });

  describe("Fund Requests", function () {
    beforeEach(async function () {
      // Donate to charity1
      await donationPlatform
        .connect(donor1)
        .donateETH(charity1.address, "Initial donation", {
          value: ethers.utils.parseEther("2"),
        });
    });

    it("should allow charities to create fund requests", async function () {
      const requestAmount = ethers.utils.parseEther("1");

      const tx = await donationPlatform
        .connect(charity1)
        .createFundRequest(
          requestAmount,
          "Emergency Relief",
          "Funds for disaster area support"
        );

      await expect(tx)
        .to.emit(donationPlatform, "FundRequestCreated")
        .withArgs(charity1.address, requestAmount, "Emergency Relief");

      // Verify request was created
      const requestId = 0; // First request
      const request = await donationPlatform.fundRequests(requestId);
      expect(request.charity).to.equal(charity1.address);
      expect(request.amount.toString()).to.equal(requestAmount.toString());
      expect(request.status.toString()).to.equal("0"); // Pending
    });

    it("should allow owner to approve fund requests", async function () {
      // Create request
      const requestAmount = ethers.utils.parseEther("1");
      await donationPlatform
        .connect(charity1)
        .createFundRequest(
          requestAmount,
          "Emergency Relief",
          "Funds for disaster area support"
        );

      // Approve request
      const requestId = 0;
      const tx = await donationPlatform.connect(owner).updateFundRequestStatus(
        requestId,
        1 // Approved
      );

      await expect(tx)
        .to.emit(donationPlatform, "FundRequestStatusUpdated")
        .withArgs(requestId, 1); // Approved

      const request = await donationPlatform.fundRequests(requestId);
      expect(request.status.toString()).to.equal("1"); // Approved
    });

    it("should allow charities to withdraw approved funds", async function () {
      // Create and approve request
      const requestAmount = ethers.utils.parseEther("1");
      await donationPlatform
        .connect(charity1)
        .createFundRequest(
          requestAmount,
          "Emergency Relief",
          "Funds for disaster area support"
        );

      const requestId = 0;
      await donationPlatform.connect(owner).updateFundRequestStatus(
        requestId,
        1 // Approved
      );

      // Track balance before withdrawal
      const initialBalance = await ethers.provider.getBalance(charity1.address);

      // Withdraw funds
      const tx = await donationPlatform.connect(charity1).withdrawFunds(
        requestId,
        ethers.constants.AddressZero // ETH
      );

      await expect(tx)
        .to.emit(donationPlatform, "FundsWithdrawn")
        .withArgs(charity1.address, requestId, requestAmount);

      // Verify charity received the funds
      const finalBalance = await ethers.provider.getBalance(charity1.address);

      // The charity should have received the funds minus gas costs
      // We can't predict the exact balance due to gas costs, but we can check it increased
      expect(finalBalance.gt(initialBalance)).to.be.true;

      // Verify request status changed to Completed
      const request = await donationPlatform.fundRequests(requestId);
      expect(request.status.toString()).to.equal("3"); // Completed
    });

    it("should allow charities to submit usage reports", async function () {
      // Create, approve and withdraw a fund request
      const requestAmount = ethers.utils.parseEther("1");
      await donationPlatform
        .connect(charity1)
        .createFundRequest(
          requestAmount,
          "Emergency Relief",
          "Funds for disaster area support"
        );

      const requestId = 0;
      await donationPlatform.connect(owner).updateFundRequestStatus(
        requestId,
        1 // Approved
      );

      await donationPlatform.connect(charity1).withdrawFunds(
        requestId,
        ethers.constants.AddressZero // ETH
      );

      // Submit usage report
      const tx = await donationPlatform.connect(charity1).submitFundUsageReport(
        requestId,
        "Purchased medical supplies and food",
        "ipfs://QmHash123456" // IPFS hash of evidence documents
      );

      await expect(tx)
        .to.emit(donationPlatform, "FundUsageReportSubmitted")
        .withArgs(charity1.address, requestId);

      // Verify report was stored
      const reportDetails = await donationPlatform.getFundUsageReportDetails(
        requestId,
        0
      );
      expect(reportDetails.description).to.equal(
        "Purchased medical supplies and food"
      );
      expect(reportDetails.evidence).to.equal("ipfs://QmHash123456");
    });
  });

  describe("Donation Statistics", function () {
    it("should track total donations and donor count correctly", async function () {
      // First donation from donor1
      await donationPlatform
        .connect(donor1)
        .donateETH(charity1.address, "First donation", {
          value: ethers.utils.parseEther("1"),
        });

      // Second donation from donor2
      await donationPlatform
        .connect(donor2)
        .donateETH(charity1.address, "Second donation", {
          value: ethers.utils.parseEther("0.5"),
        });

      // Check donor count for charity1
      const donorCount = await donationPlatform.donorsCount(charity1.address);
      expect(donorCount.toString()).to.equal("2");

      // Check total donated by donor1
      const totalDonated = await donationPlatform.totalDonated(donor1.address);
      expect(totalDonated.toString()).to.equal(
        ethers.utils.parseEther("1").toString()
      );
    });
  });
});
