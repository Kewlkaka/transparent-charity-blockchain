// test/CharityRegistry.test.js
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("CharityRegistry", function () {
  let CharityRegistry;
  let charityRegistry;
  let owner, charity1, charity2, nonOwner;

  beforeEach(async function () {
    [owner, charity1, charity2, nonOwner] = await ethers.getSigners();

    CharityRegistry = await ethers.getContractFactory("CharityRegistry");
    charityRegistry = await CharityRegistry.deploy();
    await charityRegistry.deployed();
  });

  describe("Charity Registration", function () {
    it("should register a new charity", async function () {
      const tx = await charityRegistry
        .connect(charity1)
        .registerCharity(
          "Red Cross",
          "International humanitarian organization",
          charity1.address,
          "www.redcross.org",
          "contact@redcross.org"
        );

      // Check event was emitted
      await expect(tx)
        .to.emit(charityRegistry, "CharityRegistered")
        .withArgs(charity1.address, "Red Cross");

      // Check charity is stored
      const charityData = await charityRegistry.getCharityDetails(
        charity1.address
      );
      expect(charityData.name).to.equal("Red Cross");
      expect(charityData.description).to.equal(
        "International humanitarian organization"
      );
      expect(charityData.walletAddress).to.equal(charity1.address);
      expect(charityData.status.toString()).to.equal("0"); // Pending
    });

    it("should not register a charity with zero address", async function () {
      await expect(
        charityRegistry
          .connect(charity1)
          .registerCharity(
            "Invalid Charity",
            "Description",
            ethers.constants.AddressZero,
            "website",
            "contact"
          )
      ).to.be.revertedWith("Invalid wallet address");
    });

    it("should not register the same charity twice", async function () {
      await charityRegistry
        .connect(charity1)
        .registerCharity(
          "Red Cross",
          "International humanitarian organization",
          charity1.address,
          "www.redcross.org",
          "contact@redcross.org"
        );

      await expect(
        charityRegistry
          .connect(charity1)
          .registerCharity(
            "Red Cross Again",
            "Duplicate",
            charity1.address,
            "website",
            "contact"
          )
      ).to.be.revertedWith("Charity already registered");
    });
  });

  describe("Charity Status Management", function () {
    beforeEach(async function () {
      await charityRegistry
        .connect(charity1)
        .registerCharity(
          "Red Cross",
          "International humanitarian organization",
          charity1.address,
          "www.redcross.org",
          "contact@redcross.org"
        );
    });

    it("should allow owner to update charity status", async function () {
      const tx = await charityRegistry
        .connect(owner)
        .updateCharityStatus(charity1.address, 1); // 1 = Approved

      await expect(tx)
        .to.emit(charityRegistry, "CharityStatusChanged")
        .withArgs(charity1.address, 1);

      const charityData = await charityRegistry.getCharityDetails(
        charity1.address
      );
      expect(charityData.status.toString()).to.equal("1"); // Approved
    });

    it("should not allow non-owners to update charity status", async function () {
      await expect(
        charityRegistry
          .connect(nonOwner)
          .updateCharityStatus(charity1.address, 1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should correctly check if a charity is approved", async function () {
      // Initially not approved
      let isApproved = await charityRegistry.isCharityApproved(
        charity1.address
      );
      expect(isApproved).to.be.false;

      // Approve the charity
      await charityRegistry
        .connect(owner)
        .updateCharityStatus(charity1.address, 1); // 1 = Approved

      // Now should be approved
      isApproved = await charityRegistry.isCharityApproved(charity1.address);
      expect(isApproved).to.be.true;
    });
  });

  describe("Charity Information Updates", function () {
    beforeEach(async function () {
      await charityRegistry
        .connect(charity1)
        .registerCharity(
          "Red Cross",
          "International humanitarian organization",
          charity1.address,
          "www.redcross.org",
          "contact@redcross.org"
        );
    });

    it("should allow charity to update its information", async function () {
      const tx = await charityRegistry
        .connect(charity1)
        .updateCharityInfo(
          charity1.address,
          "Updated Red Cross",
          "Updated description",
          "www.updated-redcross.org",
          "new-contact@redcross.org"
        );

      await expect(tx)
        .to.emit(charityRegistry, "CharityInfoUpdated")
        .withArgs(charity1.address);

      const charityData = await charityRegistry.getCharityDetails(
        charity1.address
      );
      expect(charityData.name).to.equal("Updated Red Cross");
      expect(charityData.description).to.equal("Updated description");
      expect(charityData.website).to.equal("www.updated-redcross.org");
      expect(charityData.contactInformation).to.equal(
        "new-contact@redcross.org"
      );
    });

    it("should allow owner to update charity information", async function () {
      const tx = await charityRegistry
        .connect(owner)
        .updateCharityInfo(
          charity1.address,
          "Owner Updated Red Cross",
          "Owner updated description",
          "www.owner-updated.org",
          "owner-updated@redcross.org"
        );

      await expect(tx)
        .to.emit(charityRegistry, "CharityInfoUpdated")
        .withArgs(charity1.address);

      const charityData = await charityRegistry.getCharityDetails(
        charity1.address
      );
      expect(charityData.name).to.equal("Owner Updated Red Cross");
    });

    it("should not allow unauthorized users to update charity information", async function () {
      await expect(
        charityRegistry
          .connect(nonOwner)
          .updateCharityInfo(
            charity1.address,
            "Unauthorized Update",
            "Unauthorized description",
            "website",
            "contact"
          )
      ).to.be.revertedWith("Unauthorized");
    });
  });

  describe("Charity Listing", function () {
    beforeEach(async function () {
      await charityRegistry
        .connect(charity1)
        .registerCharity(
          "Red Cross",
          "Description 1",
          charity1.address,
          "website1",
          "contact1"
        );

      await charityRegistry
        .connect(charity2)
        .registerCharity(
          "Doctors Without Borders",
          "Description 2",
          charity2.address,
          "website2",
          "contact2"
        );
    });

    it("should return all registered charities", async function () {
      const charities = await charityRegistry.getAllCharities();
      expect(charities.length).to.equal(2);
      expect(charities[0]).to.equal(charity1.address);
      expect(charities[1]).to.equal(charity2.address);
    });
  });
});
