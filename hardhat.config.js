// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const path = require("path");
const { MNEMONIC } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
      accounts: { mnemonic: MNEMONIC },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "charity-frontend/src/contracts",
  },
};
