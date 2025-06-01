// charity-frontend/src/components/DonationForm.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Form,
  Button,
  Card,
  Alert,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import { ethers } from "ethers";
import {
  formatErrorMessage,
  getTransactionStatusMessage,
} from "../utils/errorHandler";

const DonationForm = ({
  provider,
  donationPlatform,
  charityRegistry,
  charityToken,
  account,
  refreshTrigger,
  onDonationMade,
}) => {
  const [charities, setCharities] = useState([]);
  const [selectedCharity, setSelectedCharity] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [donationType, setDonationType] = useState("ETH");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [tokenApproved, setTokenApproved] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [currentTxHash, setCurrentTxHash] = useState(null);

  useEffect(() => {
    const setupDebugObjects = async () => {
      //ethers library
      window.ethers = ethers;
      //current provider (by MetaMask)
      window.provider = provider;
      //a signer pulled from that provider
      window.signer = await window.provider.getSigner();
      //your read-only contract instance
      window.donationPlatform = donationPlatform;
      //your signer-bound contract instance
      window.platformWithSigner = donationPlatform.connect(window.signer);
      console.log(
        "✅ window.platformWithSigner ready at",
        window.platformWithSigner.address
      );
    };
    if (provider && donationPlatform) {
      setupDebugObjects();
    }
  }, [provider, donationPlatform]);

  const loadApprovedCharities = useCallback(async () => {
    if (!charityRegistry) return;

    try {
      const addresses = await charityRegistry.getAllCharities();
      const approved = [];

      for (const addr of addresses) {
        const isApproved = await charityRegistry.isCharityApproved(addr);
        if (isApproved) {
          const info = await charityRegistry.getCharityDetails(addr);
          approved.push({ address: addr, name: info.name });
        }
      }

      setCharities(approved);
    } catch (err) {
      console.error("Error fetching approved charities:", err);
    }
  }, [charityRegistry]);

  useEffect(() => {
    loadApprovedCharities();
  }, [loadApprovedCharities, refreshTrigger]);

  const handleApproveTokens = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setFeedback({ type: "danger", message: "Please enter a valid amount" });
      return;
    }

    setLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const signer = await provider.getSigner();
      const tokenWithSigner = charityToken.connect(signer);
      const amountWei = ethers.parseEther(amount);

      setTransactionStatus("pending");
      const tx = await tokenWithSigner.approve(
        donationPlatform.address,
        amountWei
      );
      setCurrentTxHash(tx.hash);

      await tx.wait();

      setTokenApproved(true);
      setTransactionStatus("success");
      setFeedback({
        type: "success",
        message:
          "Tokens approved for donation! You can now proceed with the donation.",
      });
    } catch (err) {
      const errorFeedback = formatErrorMessage(err);
      setFeedback(errorFeedback);
      setTransactionStatus(null);
    }

    setLoading(false);
  };

  const verifyCharityStatus = async (charityAddress) => {
    try {
      const isApproved = await charityRegistry.isCharityApproved(
        charityAddress
      );
      console.log(`Charity ${charityAddress} approved status:`, isApproved);
      if (!isApproved) {
        setFeedback({
          type: "warning",
          message:
            "This charity does not appear to be approved in the registry.",
        });
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error checking charity status:", err);
      setFeedback({
        type: "danger",
        message: "Error verifying charity status.",
      });
      return false;
    }
  };

  const handleDonate = async (e) => {
    e.preventDefault();

    if (!selectedCharity) {
      setFeedback({ type: "danger", message: "Please select a charity" });
      return;
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setFeedback({ type: "danger", message: "Please enter a valid amount" });
      return;
    }

    const isValidCharity = await verifyCharityStatus(selectedCharity);
    if (!isValidCharity) {
      return;
    }

    setLoading(true);
    setFeedback({ type: "", message: "" });
    setTransactionStatus(null);
    setCurrentTxHash(null);

    try {
      const signer = await provider.getSigner();
      const platformWithSigner = donationPlatform.connect(signer);
      const amountWei = ethers.parseEther(amount);

      console.log("Selected charity:", selectedCharity);
      console.log("Message:", message);
      console.log("Amount (ETH):", amount);
      console.log("Amount (Wei):", amountWei.toString());

      let tx;
      setTransactionStatus("pending");

      if (donationType === "ETH") {
        //ETH donation
        tx = await platformWithSigner.donateETH(
          selectedCharity,
          message || "",
          {
            value: amountWei,
          }
        );
      } else {
        if (!tokenApproved) {
          setFeedback({
            type: "danger",
            message: (
              <div>
                <strong>Token Approval Required:</strong> You need to approve
                tokens before donating.
                <br />
                <small>
                  <em>
                    Click "Approve Tokens" first, then try donating again.
                  </em>
                </small>
              </div>
            ),
          });
          setLoading(false);
          setTransactionStatus(null);
          return;
        }

        tx = await platformWithSigner.donateToken(
          selectedCharity,
          charityToken.address,
          amountWei,
          message || "" // Ensure message is never undefined
        );
      }

      // Log transaction hash and show pending status
      console.log("Transaction submitted:", tx.hash);
      setCurrentTxHash(tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      setTransactionStatus("success");
      setFeedback({
        type: "success",
        message: (
          <div>
            <strong>Donation Successful!</strong> Thank you for your generous
            contribution.
            <br />
            <small>
              Transaction Hash:{" "}
              <code>
                {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
              </code>
            </small>
          </div>
        ),
      });
      setAmount("");
      setMessage("");
      setTokenApproved(false);

      // Call the callback to trigger refresh in parent components
      if (onDonationMade) onDonationMade();
    } catch (err) {
      const errorFeedback = formatErrorMessage(err);
      setFeedback(errorFeedback);
      setTransactionStatus(null);
      setCurrentTxHash(null);
    }

    setLoading(false);
  };

  return (
    <Card className="mb-4">
      <Card.Header as="h5">Make a Donation</Card.Header>
      <Card.Body>
        {/* Transaction Status */}
        {transactionStatus && (
          <Alert
            variant={
              getTransactionStatusMessage(transactionStatus, currentTxHash)
                ?.type
            }
          >
            {
              getTransactionStatusMessage(transactionStatus, currentTxHash)
                ?.message
            }
          </Alert>
        )}

        {/* Feedback Messages */}
        {feedback.message && (
          <Alert variant={feedback.type}>{feedback.message}</Alert>
        )}

        <Form onSubmit={handleDonate}>
          <Form.Group className="mb-3">
            <Form.Label>Select Charity</Form.Label>
            <Form.Select
              value={selectedCharity}
              onChange={(e) => setSelectedCharity(e.target.value)}
              required
            >
              <option value="">-- Select a Charity --</option>
              {charities.map((c, idx) => (
                <option key={idx} value={c.address}>
                  {c.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Donation Type</Form.Label>
            <div>
              <Form.Check
                inline
                type="radio"
                label="ETH"
                name="donationType"
                id="ethDonation"
                checked={donationType === "ETH"}
                onChange={() => setDonationType("ETH")}
              />
              <Form.Check
                inline
                type="radio"
                label="Charity Token"
                name="donationType"
                id="tokenDonation"
                checked={donationType === "Token"}
                onChange={() => setDonationType("Token")}
              />
            </div>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Amount</Form.Label>
            <InputGroup>
              <Form.Control
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter donation amount"
                required
              />
              <InputGroup.Text>
                {donationType === "ETH" ? "ETH" : "TOKEN"}
              </InputGroup.Text>
            </InputGroup>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Message (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message with your donation"
            />
          </Form.Group>{" "}
          {donationType === "Token" && (
            <Button
              variant="outline-primary"
              onClick={handleApproveTokens}
              disabled={loading || tokenApproved}
              className="mb-3 me-2"
            >
              {loading && transactionStatus === "pending" ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    className="me-2"
                  />
                  Approving...
                </>
              ) : tokenApproved ? (
                "✅ Tokens Approved"
              ) : (
                "Approve Tokens"
              )}
            </Button>
          )}
          <Button
            variant="primary"
            type="submit"
            disabled={loading || (donationType === "Token" && !tokenApproved)}
            size="lg"
          >
            {loading && transactionStatus === "pending" ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  className="me-2"
                />
                {donationType === "ETH"
                  ? "Sending ETH..."
                  : "Sending Tokens..."}
              </>
            ) : loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  className="me-2"
                />
                Processing...
              </>
            ) : (
              `Donate ${amount || "0"} ${
                donationType === "ETH" ? "ETH" : "Tokens"
              }`
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default DonationForm;
