// charity-frontend/src/utils/contractHelpers.js
import CharityRegistryArtifact from "../contracts/contracts/CharityRegistry.sol/CharityRegistry.json";
import DonationPlatformArtifact from "../contracts/contracts/DonationPlatform.sol/DonationPlatform.json";
import CharityTokenArtifact from "../contracts/contracts/CharityToken.sol/CharityToken.json";
import addresses from "../contracts/addresses.json";
import { ethers } from "ethers";

export const loadContractInstance = (provider, abi, address) =>
  new ethers.Contract(address, abi, provider);

export const loadContracts = async (provider, rawChainId) => {
  //normalize
  let chainId = String(rawChainId);
  if (chainId.startsWith("0x")) chainId = parseInt(chainId, 16).toString();
  console.log("Detected network ID:", chainId);

  //adress.json network mapping
  let registryAddress, tokenAddress, platformAddress;
  if (addresses[chainId]) {
    ({
      CharityRegistry: registryAddress,
      CharityToken: tokenAddress,
      DonationPlatform: platformAddress,
    } = addresses[chainId]);
  } else if (addresses.CharityRegistry) {
    registryAddress = addresses.CharityRegistry;
    tokenAddress = addresses.CharityToken;
    platformAddress = addresses.DonationPlatform;
  }

  //fallback
  if (!registryAddress || !tokenAddress || !platformAddress) {
    console.warn(
      `No addresses.json entry for chain ${chainId}, falling back to artifact.networks`
    );
    registryAddress = CharityRegistryArtifact.networks?.[chainId]?.address;
    tokenAddress = CharityTokenArtifact.networks?.[chainId]?.address;
    platformAddress = DonationPlatformArtifact.networks?.[chainId]?.address;
  }

  if (!registryAddress || !tokenAddress || !platformAddress) {
    throw Error(`Could not find contract addresses for network ${chainId}`);
  }

  console.log("▶️ Registry:", registryAddress);
  console.log("▶️ Token:   ", tokenAddress);
  console.log("▶️ Platform:", platformAddress);

  //init
  const charityRegistry = loadContractInstance(
    provider,
    CharityRegistryArtifact.abi,
    registryAddress
  );
  const charityToken = loadContractInstance(
    provider,
    CharityTokenArtifact.abi,
    tokenAddress
  );
  const donationPlatform = loadContractInstance(
    provider,
    DonationPlatformArtifact.abi,
    platformAddress
  );

  return { charityRegistry, charityToken, donationPlatform };
};
