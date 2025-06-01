import React, { useState, useEffect } from "react";
import { Form, Button, Card, Alert, Spinner } from "react-bootstrap";

const CharityRegistration = ({
  charityRegistry,
  provider,
  onCharityRegistered,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [contactInformation, setContactInformation] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Auto-fill current user's address
  useEffect(() => {
    const fillCurrentAddress = async () => {
      if (provider && !walletAddress) {
        try {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setWalletAddress(address);
        } catch (err) {
          console.error("Error getting current address:", err);
        }
      }
    };
    fillCurrentAddress();
  }, [provider, walletAddress]);

  const handleUseCurrentAddress = async () => {
    try {
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
    } catch (err) {
      setFeedback({
        type: "danger",
        message: "Error getting current address. Please connect your wallet.",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !name.trim() ||
      !description.trim() ||
      !walletAddress.trim() ||
      !website.trim() ||
      !contactInformation.trim()
    ) {
      setFeedback({
        type: "danger",
        message: "Please fill in all fields.",
      });
      return;
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setFeedback({
        type: "danger",
        message: "Please enter a valid wallet address.",
      });
      return;
    }

    setLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const signer = await provider.getSigner();
      const registryWithSigner = charityRegistry.connect(signer);
      const tx = await registryWithSigner.registerCharity(
        name,
        description,
        walletAddress,
        website,
        contactInformation
      );
      await tx.wait();

      setFeedback({
        type: "success",
        message:
          "Charity registered successfully! Awaiting approval from admin.",
      });
      setName("");
      setDescription("");
      setWalletAddress("");
      setWebsite("");
      setContactInformation("");
      onCharityRegistered();
    } catch (err) {
      console.error("Error registering charity:", err);
      setFeedback({
        type: "danger",
        message: "Error registering charity. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header as="h5">Register Your Charity</Card.Header>
      <Card.Body>
        {feedback.message && (
          <Alert variant={feedback.type} className="mb-3">
            {feedback.message}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Charity Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter charity name"
              required
            />
          </Form.Group>{" "}
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your charity's mission and activities"
              required
            />
          </Form.Group>{" "}
          <Form.Group className="mb-3">
            <Form.Label>Wallet Address</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x... (Ethereum wallet address)"
                required
              />
              <Button
                variant="outline-secondary"
                onClick={handleUseCurrentAddress}
                type="button"
              >
                Use Current
              </Button>
            </div>
            <Form.Text className="text-muted">
              The Ethereum address that will represent this charity
            </Form.Text>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Website</Form.Label>
            <Form.Control
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://your-charity-website.com"
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Contact Information</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={contactInformation}
              onChange={(e) => setContactInformation(e.target.value)}
              placeholder="Email, phone, address, or other contact details"
              required
            />
          </Form.Group>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  className="me-2"
                />
                Registering...
              </>
            ) : (
              "Register Charity"
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default CharityRegistration;
