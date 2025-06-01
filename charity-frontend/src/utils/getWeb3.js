import { ethers } from "ethers";

const getWeb3 = () => {
  return new Promise((resolve, reject) => {
    window.addEventListener("load", async () => {
      if (window.ethereum) {
        try {
          await window.ethereum.request({ method: "eth_requestAccounts" });
          const provider = new ethers.BrowserProvider(window.ethereum);
          resolve(provider);
        } catch (error) {
          reject(error);
        }
      } else if (window.web3) {
        const provider = new ethers.BrowserProvider(
          window.web3.currentProvider
        );
        console.log("Injected web3 detected.");
        resolve(provider);
      } else {
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        console.log("No web3 instance injected, using Local web3.");
        resolve(provider);
      }
    });
  });
};

export default getWeb3;
