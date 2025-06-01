import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Alert,
  Table,
  Button,
  Form,
  Badge,
  Spinner,
  Modal,
} from "react-bootstrap";
import { ethers } from "ethers";
import { formatErrorMessage } from "../utils/errorHandler";

const FundRequests = ({
  donationPlatform,
  charityRegistry,
  provider,
  account,
  isOwner,
  refreshTrigger,
  onFundRequestUpdated,
}) => {
  const [fundRequests, setFundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [actionLoading, setActionLoading] = useState({});

  // Create new request state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createAmount, setCreateAmount] = useState("");
  const [createPurpose, setCreatePurpose] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [isCharityApproved, setIsCharityApproved] = useState(false);

  const getStatusName = (status) => {
    switch (Number(status)) {
      case 0:
        return "Pending";
      case 1:
        return "Approved";
      case 2:
        return "Rejected";
      case 3:
        return "Completed";
      default:
        return "Unknown";
    }
  };

  const getStatusVariant = (status) => {
    switch (Number(status)) {
      case 0:
        return "warning";
      case 1:
        return "success";
      case 2:
        return "danger";
      case 3:
        return "info";
      default:
        return "secondary";
    }
  };

  const loadFundRequests = useCallback(async () => {
    if (!donationPlatform || !charityRegistry) return;

    try {
      setLoading(true);
      const count = await donationPlatform.getFundRequestsCount();
      const requests = [];

      for (let i = 0; i < count; i++) {
        const details = await donationPlatform.getFundRequestDetails(i);
        const charity = await charityRegistry.getCharityDetails(
          details.charityAddress
        );

        // Get charity balance
        const balance = await donationPlatform.charityBalances(
          details.charityAddress,
          ethers.ZeroAddress
        );

        requests.push({
          id: i,
          charityAddress: details.charityAddress,
          charityName: charity.name,
          amount: details.amount,
          purpose: details.purpose,
          description: details.description,
          status: details.status,
          requestDate: details.requestDate,
          completionDate: details.completionDate,
          charityBalance: balance,
        });
      }

      // Sort by newest first
      requests.sort((a, b) => Number(b.requestDate) - Number(a.requestDate));
      setFundRequests(requests);
    } catch (err) {
      console.error("Error loading fund requests:", err);
      setFeedback({
        type: "danger",
        message: "Error loading fund requests. Please refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  }, [donationPlatform, charityRegistry]);

  const checkCharityStatus = useCallback(async () => {
    if (!charityRegistry || !account) return;

    try {
      const approved = await charityRegistry.isCharityApproved(account);
      setIsCharityApproved(approved);
    } catch (err) {
      console.error("Error checking charity status:", err);
    }
  }, [charityRegistry, account]);

  useEffect(() => {
    loadFundRequests();
    checkCharityStatus();
  }, [loadFundRequests, checkCharityStatus, refreshTrigger]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    if (!createAmount || !createPurpose || !createDescription) {
      setFeedback({
        type: "danger",
        message: "Please fill in all fields.",
      });
      return;
    }

    setCreateLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const signer = await provider.getSigner();
      const platformWithSigner = donationPlatform.connect(signer);
      const amountWei = ethers.parseEther(createAmount);

      const tx = await platformWithSigner.createFundRequest(
        amountWei,
        createPurpose,
        createDescription
      );
      await tx.wait();

      setFeedback({
        type: "success",
        message: "Fund request created successfully!",
      });

      // Reset form
      setCreateAmount("");
      setCreatePurpose("");
      setCreateDescription("");
      setShowCreateModal(false); // Reload requests
      loadFundRequests();
      if (onFundRequestUpdated) onFundRequestUpdated();
    } catch (err) {
      console.error("Error creating fund request:", err);
      const errorMsg = formatErrorMessage(err);
      setFeedback({
        type: errorMsg.type,
        message: errorMsg.message,
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    setActionLoading({ ...actionLoading, [requestId]: true });
    setFeedback({ type: "", message: "" });

    try {
      const signer = await provider.getSigner();
      const platformWithSigner = donationPlatform.connect(signer);
      const tx = await platformWithSigner.updateFundRequestStatus(
        requestId,
        newStatus
      );
      await tx.wait();
      setFeedback({
        type: "success",
        message: `Request ${getStatusName(
          newStatus
        ).toLowerCase()} successfully!`,
      });

      loadFundRequests();
      if (onFundRequestUpdated) onFundRequestUpdated();
    } catch (err) {
      console.error("Error updating status:", err);
      const errorMsg = formatErrorMessage(err);
      setFeedback({
        type: errorMsg.type,
        message: errorMsg.message,
      });
    } finally {
      setActionLoading({ ...actionLoading, [requestId]: false });
    }
  };

  const handleWithdraw = async (requestId) => {
    setActionLoading({ ...actionLoading, [`withdraw_${requestId}`]: true });
    setFeedback({ type: "", message: "" });

    try {
      const signer = await provider.getSigner();
      const platformWithSigner = donationPlatform.connect(signer);
      const tx = await platformWithSigner.withdrawFunds(
        requestId,
        ethers.ZeroAddress
      );
      await tx.wait();
      setFeedback({
        type: "success",
        message: "Funds withdrawn successfully!",
      });

      loadFundRequests();
      if (onFundRequestUpdated) onFundRequestUpdated();
    } catch (err) {
      console.error("Error withdrawing funds:", err);
      const errorMsg = formatErrorMessage(err);
      setFeedback({
        type: errorMsg.type,
        message: errorMsg.message,
      });
    } finally {
      setActionLoading({ ...actionLoading, [`withdraw_${requestId}`]: false });
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Header as="h5">Fund Requests</Card.Header>
        <Card.Body className="text-center">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Loading fund requests...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Fund Requests</h5>
          {isCharityApproved && (
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              Create Request
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          {feedback.message && (
            <Alert variant={feedback.type} className="mb-3">
              {feedback.message}
            </Alert>
          )}

          {!isCharityApproved && account && (
            <Alert variant="info" className="mb-3">
              <strong>Note:</strong> Only approved charities can create fund
              requests. Please register and get approved first.
            </Alert>
          )}

          {fundRequests.length === 0 ? (
            <p className="text-muted">No fund requests yet.</p>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Charity</th>
                  <th>Amount</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fundRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div>
                        <strong>{request.charityName}</strong>
                        <br />
                        <small className="text-muted">
                          {request.charityAddress.slice(0, 6)}...
                          {request.charityAddress.slice(-4)}
                        </small>
                      </div>
                    </td>
                    <td>
                      <strong>{ethers.formatEther(request.amount)} ETH</strong>
                      <br />
                      <small className="text-muted">
                        Available: {ethers.formatEther(request.charityBalance)}{" "}
                        ETH
                      </small>
                    </td>
                    <td>
                      <strong>{request.purpose}</strong>
                      <br />
                      <small className="text-muted">
                        {request.description}
                      </small>
                    </td>
                    <td>
                      <Badge bg={getStatusVariant(request.status)}>
                        {getStatusName(request.status)}
                      </Badge>
                    </td>
                    <td>
                      {new Date(
                        Number(request.requestDate) * 1000
                      ).toLocaleDateString()}
                    </td>
                    <td>
                      {isOwner && Number(request.status) === 0 && (
                        <div className="d-flex gap-1">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleUpdateStatus(request.id, 1)}
                            disabled={actionLoading[request.id]}
                          >
                            {actionLoading[request.id] ? (
                              <Spinner size="sm" />
                            ) : (
                              "Approve"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleUpdateStatus(request.id, 2)}
                            disabled={actionLoading[request.id]}
                          >
                            {actionLoading[request.id] ? (
                              <Spinner size="sm" />
                            ) : (
                              "Reject"
                            )}
                          </Button>
                        </div>
                      )}
                      {account &&
                        account.toLowerCase() ===
                          request.charityAddress.toLowerCase() &&
                        Number(request.status) === 1 &&
                        ethers.parseEther("0") < request.charityBalance &&
                        request.charityBalance >= request.amount && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleWithdraw(request.id)}
                            disabled={actionLoading[`withdraw_${request.id}`]}
                          >
                            {actionLoading[`withdraw_${request.id}`] ? (
                              <Spinner size="sm" />
                            ) : (
                              "Withdraw"
                            )}
                          </Button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Create Fund Request Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Fund Request</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateRequest}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Amount (ETH)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
                placeholder="Enter amount in ETH"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Purpose</Form.Label>
              <Form.Control
                type="text"
                value={createPurpose}
                onChange={(e) => setCreatePurpose(e.target.value)}
                placeholder="e.g., Emergency Relief, Medical Equipment"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Detailed Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Describe how the funds will be used and provide context..."
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={createLoading}>
              {createLoading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Creating...
                </>
              ) : (
                "Create Request"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default FundRequests;
