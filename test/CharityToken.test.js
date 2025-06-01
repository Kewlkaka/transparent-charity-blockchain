// test/CharityToken.test.js
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("CharityToken", function () {
  let CharityToken;
  let charityToken;
  let owner, user1, user2;
  let initialSupply;
  let expectedTotalSupply;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    initialSupply = ethers.BigNumber.from(1000000);
    const decimals = ethers.BigNumber.from(18);
    expectedTotalSupply = initialSupply.mul(
      ethers.BigNumber.from(10).pow(decimals)
    );

    CharityToken = await ethers.getContractFactory("CharityToken");
    charityToken = await CharityToken.deploy(initialSupply);
    await charityToken.deployed();
  });

  describe("Deployment", function () {
    it("should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await charityToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(expectedTotalSupply);

      const totalSupply = await charityToken.totalSupply();
      expect(totalSupply).to.equal(expectedTotalSupply);
    });

    it("should set the correct token name and symbol", async function () {
      const name = await charityToken.name();
      const symbol = await charityToken.symbol();

      expect(name).to.equal("Charity Token");
      expect(symbol).to.equal("CHT");
    });
  });

  describe("Token minting", function () {
    it("should allow the owner to mint new tokens", async function () {
      const amountToMint = ethers.BigNumber.from(1000).mul(
        ethers.BigNumber.from(10).pow(18)
      );

      await charityToken.connect(owner).mint(user1.address, amountToMint);

      const user1Balance = await charityToken.balanceOf(user1.address);
      expect(user1Balance).to.equal(amountToMint);

      const newTotalSupply = await charityToken.totalSupply();
      expect(newTotalSupply).to.equal(expectedTotalSupply.add(amountToMint));
    });

    it("should not allow non-owners to mint tokens", async function () {
      const amountToMint = ethers.BigNumber.from(1000).mul(
        ethers.BigNumber.from(10).pow(18)
      );

      await expect(
        charityToken.connect(user1).mint(user1.address, amountToMint)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Token transfers", function () {
    it("should transfer tokens between accounts", async function () {
      const transferAmount = ethers.BigNumber.from(1000).mul(
        ethers.BigNumber.from(10).pow(18)
      );

      // Transfer from owner to user1
      await charityToken.connect(owner).transfer(user1.address, transferAmount);

      const user1Balance = await charityToken.balanceOf(user1.address);
      expect(user1Balance).to.equal(transferAmount);

      // Transfer from user1 to user2
      await charityToken
        .connect(user1)
        .transfer(user2.address, transferAmount.div(2));

      const user2Balance = await charityToken.balanceOf(user2.address);
      expect(user2Balance).to.equal(transferAmount.div(2));

      const user1BalanceAfter = await charityToken.balanceOf(user1.address);
      expect(user1BalanceAfter).to.equal(transferAmount.div(2));
    });

    it("should fail when trying to transfer more than balance", async function () {
      const transferAmount = ethers.BigNumber.from(1000).mul(
        ethers.BigNumber.from(10).pow(18)
      );

      await charityToken.connect(owner).transfer(user1.address, transferAmount);

      await expect(
        charityToken
          .connect(user1)
          .transfer(user2.address, transferAmount.mul(2))
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });
});
