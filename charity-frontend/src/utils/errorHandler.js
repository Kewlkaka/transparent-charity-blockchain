// Enhanced error handling utility for blockchain interactions
import { ethers } from "ethers";

/**
 * Formats blockchain errors into user-friendly messages
 * @param {Error} error - The error object from blockchain interaction
 * @returns {Object} - Formatted error with type and message
 */
export const formatErrorMessage = (error) => {
  console.error("Blockchain error:", error);

  // User rejected transaction
  if (error.code === "ACTION_REJECTED" || error.code === 4001) {
    return {
      type: "warning",
      message: "Transaction cancelled by user. Please try again when ready.",
    };
  }

  // Insufficient funds for gas
  if (
    error.reason?.includes("insufficient funds") ||
    error.message?.includes("insufficient funds")
  ) {
    return {
      type: "danger",
      message:
        "Insufficient ETH balance to cover gas fees. Please add more ETH to your wallet.",
    };
  }

  // Gas estimation failed
  if (error.reason?.includes("gas") || error.message?.includes("gas")) {
    return {
      type: "danger",
      message:
        "Transaction failed due to gas estimation error. Please check your inputs and try again.",
    };
  }

  // Network errors
  if (error.code === "NETWORK_ERROR" || error.message?.includes("network")) {
    return {
      type: "danger",
      message:
        "Network connection error. Please check your internet connection and try again.",
    };
  }

  // Contract revert errors
  if (error.reason) {
    // Clean up common revert reasons
    let reason = error.reason;
    if (reason.includes("execution reverted:")) {
      reason = reason.replace("execution reverted:", "").trim();
    }

    return {
      type: "danger",
      message: `Transaction failed: ${reason}`,
    };
  }

  // Contract call errors
  if (error.message?.includes("call revert exception")) {
    return {
      type: "danger",
      message:
        "Smart contract call failed. Please check your inputs and try again.",
    };
  }

  // Generic fallback
  return {
    type: "danger",
    message: `Unexpected error: ${
      error.message || "Unknown blockchain error occurred"
    }`,
  };
};

/**
 * Get transaction status message for UI display
 * @param {string} status - Transaction status (pending, success, failed)
 * @param {string} txHash - Transaction hash
 * @returns {Object} - Status message with type and content
 */
export const getTransactionStatusMessage = (status, txHash) => {
  switch (status) {
    case "pending":
      return {
        type: "info",
        message: (
          <div>
            <strong>Transaction Pending...</strong>
            <br />
            <small>
              Please wait while your transaction is being processed.
              {txHash && (
                <>
                  <br />
                  Hash:{" "}
                  <code>
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </code>
                </>
              )}
            </small>
          </div>
        ),
      };

    case "success":
      return {
        type: "success",
        message: (
          <div>
            <strong>Transaction Successful!</strong>
            <br />
            <small>
              Your transaction has been confirmed on the blockchain.
            </small>
          </div>
        ),
      };

    case "failed":
      return {
        type: "danger",
        message: (
          <div>
            <strong>Transaction Failed</strong>
            <br />
            <small>
              Your transaction was not successful. Please try again.
            </small>
          </div>
        ),
      };

    default:
      return null;
  }
};

/**
 * Format Wei values to ETH for display
 * @param {string|BigNumber} weiValue - Value in Wei
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted ETH value
 */
export const formatEther = (weiValue, decimals = 4) => {
  try {
    return parseFloat(ethers.formatEther(weiValue)).toFixed(decimals);
  } catch (error) {
    console.error("Error formatting ether:", error);
    return "0.0000";
  }
};

/**
 * Parse ETH values to Wei
 * @param {string} etherValue - Value in ETH
 * @returns {BigNumber} - Value in Wei
 */
export const parseEther = (etherValue) => {
  try {
    return ethers.parseEther(etherValue.toString());
  } catch (error) {
    console.error("Error parsing ether:", error);
    throw new Error("Invalid amount format");
  }
};
