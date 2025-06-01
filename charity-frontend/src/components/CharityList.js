import React, { useState, useEffect } from "react";
import { Card, Button, Badge, Spinner, Alert } from "react-bootstrap";

const CharityList = ({
  charityRegistry,
  provider,
  account,
  isOwner,
  refreshTrigger,
  onCharityStatusUpdated,
}) => {
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Helper functions for status display
  const getStatusName = (status) => {
    const statusNames = {
      0: "Pending",
      1: "Approved",
      2: "Rejected",
      3: "Suspended",
    };
    return statusNames[status] || "Unknown";
  };

  const getStatusVariant = (status) => {
    const variants = {
      0: "warning", // Pending
      1: "success", // Approved
      2: "danger", // Rejected
      3: "secondary", // Suspended
    };
    return variants[status] || "secondary";
  };
  useEffect(() => {
    loadCharities();
  }, [charityRegistry, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCharities = async () => {
    if (!charityRegistry) return;

    try {
      setLoading(true);
      const addresses = await charityRegistry.getAllCharities();
      const charityList = [];
      for (const addr of addresses) {
        const details = await charityRegistry.getCharityDetails(addr);
        const isApproved = await charityRegistry.isCharityApproved(addr);
        charityList.push({
          address: addr,
          name: details.name || details[0],
          description: details.description || details[1],
          walletAddress: details.walletAddress || details[2],
          status: Number(details.status || details[3] || 0), // Ensure it's a number
          registrationDate: details.registrationDate || details[4],
          website: details.website || details[5],
          contactInformation: details.contactInformation || details[6],
          approved: isApproved,
        });
      }

      console.log("Loaded charities:", charityList);
      console.log("isOwner:", isOwner);
      console.log("account:", account);

      setCharities(charityList);
    } catch (err) {
      console.error("Error loading charities:", err);
      setFeedback({
        type: "danger",
        message: "Error loading charities. Please refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleApprove = async (charityAddress) => {
    setActionLoading({ ...actionLoading, [charityAddress]: true });
    setFeedback({ type: "", message: "" });

    try {
      const signer = await provider.getSigner();
      const registryWithSigner = charityRegistry.connect(signer);
      // CharityStatus.Approved = 1
      const tx = await registryWithSigner.updateCharityStatus(
        charityAddress,
        1
      );
      await tx.wait();

      setFeedback({
        type: "success",
        message: "Charity approved successfully!",
      });
      loadCharities();
      onCharityStatusUpdated();
    } catch (err) {
      console.error("Error approving charity:", err);
      setFeedback({
        type: "danger",
        message: "Error approving charity. Please try again.",
      });
    } finally {
      setActionLoading({ ...actionLoading, [charityAddress]: false });
    }
  };
  const handleReject = async (charityAddress) => {
    setActionLoading({ ...actionLoading, [charityAddress]: true });
    setFeedback({ type: "", message: "" });

    try {
      const signer = await provider.getSigner();
      const registryWithSigner = charityRegistry.connect(signer);
      // CharityStatus.Rejected = 2
      const tx = await registryWithSigner.updateCharityStatus(
        charityAddress,
        2
      );
      await tx.wait();

      setFeedback({
        type: "warning",
        message: "Charity rejected.",
      });
      loadCharities();
      onCharityStatusUpdated();
    } catch (err) {
      console.error("Error rejecting charity:", err);
      setFeedback({
        type: "danger",
        message: "Error rejecting charity. Please try again.",
      });
    } finally {
      setActionLoading({ ...actionLoading, [charityAddress]: false });
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Header as="h5">Registered Charities</Card.Header>
        <Card.Body className="text-center">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Loading charities...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header as="h5">Registered Charities</Card.Header>
      <Card.Body>
        {feedback.message && (
          <Alert variant={feedback.type} className="mb-3">
            {feedback.message}
          </Alert>
        )}

        {charities.length === 0 ? (
          <p className="text-muted">No charities registered yet.</p>
        ) : (
          charities.map((charity, index) => (
            <Card key={index} className="mb-3 charity-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  {" "}
                  <div>
                    <Card.Title>{charity.name}</Card.Title>
                    <Card.Text>{charity.description}</Card.Text>
                    {charity.website && (
                      <div className="mb-2">
                        <strong>Website:</strong>{" "}
                        <a
                          href={charity.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-decoration-none"
                        >
                          {charity.website}
                        </a>
                      </div>
                    )}
                    {charity.contactInformation && (
                      <div className="mb-2">
                        <strong>Contact:</strong> {charity.contactInformation}
                      </div>
                    )}
                    <small className="text-muted">
                      Wallet: {charity.walletAddress || charity.address}
                    </small>
                    <br />
                    <small className="text-muted">
                      Registered:{" "}
                      {charity.registrationDate
                        ? new Date(
                            Number(charity.registrationDate) * 1000
                          ).toLocaleDateString()
                        : "N/A"}
                    </small>
                  </div>{" "}
                  <div className="text-end">
                    <Badge
                      bg={getStatusVariant(charity.status)}
                      className="mb-2"
                    >
                      {getStatusName(charity.status)}
                    </Badge>{" "}
                    {isOwner &&
                      Number(charity.status) === 0 && ( // Only show buttons for Pending status
                        <div className="d-flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApprove(charity.address)}
                            disabled={actionLoading[charity.address]}
                          >
                            {actionLoading[charity.address] ? (
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                              />
                            ) : (
                              "Approve"
                            )}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleReject(charity.address)}
                            disabled={actionLoading[charity.address]}
                          >
                            {actionLoading[charity.address] ? (
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                              />
                            ) : (
                              "Reject"
                            )}
                          </Button>
                        </div>
                      )}
                    {/* Debug Information */}
                    {process.env.NODE_ENV === "development" && (
                      <div className="mt-2">
                        <small className="text-info">
                          Debug: isOwner={isOwner ? "true" : "false"}, status=
                          {charity.status}, numStatus={Number(charity.status)}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))
        )}
      </Card.Body>
    </Card>
  );
};

export default CharityList;
