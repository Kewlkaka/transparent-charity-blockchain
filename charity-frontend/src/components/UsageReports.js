import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Alert,
  Table,
  Badge,
  Spinner,
  Button,
  Modal,
  Form,
} from "react-bootstrap";
import { ethers } from "ethers";
import { formatErrorMessage } from "../utils/errorHandler";

const UsageReports = ({
  donationPlatform,
  charityRegistry,
  provider,
  account,
  refreshTrigger,
  onUsageReportSubmitted,
}) => {
  const [usageReports, setUsageReports] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Submit report modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [reportDescription, setReportDescription] = useState("");
  const [reportEvidence, setReportEvidence] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const loadData = useCallback(async () => {
    if (!donationPlatform || !charityRegistry) return;

    try {
      setLoading(true);
      setFeedback({ type: "", message: "" });

      const fundRequestsCount = await donationPlatform.getFundRequestsCount();
      const reports = [];
      const completed = [];

      for (let i = 0; i < fundRequestsCount; i++) {
        const request = await donationPlatform.getFundRequestDetails(i);
        const charity = await charityRegistry.getCharityDetails(
          request.charityAddress
        );

        // If request is completed, check if user can submit report
        if (Number(request.status) === 3) {
          const requestData = {
            id: i,
            charityAddress: request.charityAddress,
            charityName: charity.name || charity[0],
            purpose: request.purpose,
            description: request.description,
            amount: ethers.formatEther(request.amount),
            completionDate: new Date(
              Number(request.completionDate) * 1000
            ).toLocaleDateString(),
          };

          completed.push(requestData);

          // Load existing usage reports for this request
          try {
            const reportCount = await donationPlatform.getFundUsageReportsCount(
              i
            );
            for (let j = 0; j < reportCount; j++) {
              const reportDetails =
                await donationPlatform.getFundUsageReportDetails(i, j);
              reports.push({
                ...requestData,
                reportIndex: j,
                reportDescription: reportDetails.description,
                evidence: reportDetails.evidence,
                reportDate: new Date(
                  Number(reportDetails.reportDate) * 1000
                ).toLocaleDateString(),
              });
            }
          } catch (err) {
            console.error(`Error loading reports for request ${i}:`, err);
          }
        }
      }

      setUsageReports(reports);
      setCompletedRequests(completed);
    } catch (err) {
      console.error("Error loading usage reports:", err);
      setFeedback({
        type: "danger",
        message: "Error loading usage reports. Please refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  }, [donationPlatform, charityRegistry]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);
  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (!reportDescription.trim() || !reportEvidence.trim()) {
      setFeedback({
        type: "danger",
        message: "Please fill in all fields.",
      });
      return;
    }

    setSubmitLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const signer = await provider.getSigner();
      const platformWithSigner = donationPlatform.connect(signer);

      const tx = await platformWithSigner.submitFundUsageReport(
        selectedRequestId,
        reportDescription,
        reportEvidence
      );
      await tx.wait();

      setFeedback({
        type: "success",
        message: "Usage report submitted successfully!",
      });

      // Reset form and close modal
      setReportDescription("");
      setReportEvidence("");
      setShowSubmitModal(false);
      setSelectedRequestId(null);

      // Reload data
      loadData();
      if (onUsageReportSubmitted) onUsageReportSubmitted();
    } catch (err) {
      console.error("Error submitting usage report:", err);
      const errorMsg = formatErrorMessage(err);
      setFeedback({
        type: errorMsg.type,
        message: errorMsg.message,
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenSubmitModal = (requestId) => {
    setSelectedRequestId(requestId);
    setReportDescription("");
    setReportEvidence("");
    setShowSubmitModal(true);
    setFeedback({ type: "", message: "" });
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  if (loading) {
    return (
      <Card>
        <Card.Header as="h5">Fund Usage Reports</Card.Header>
        <Card.Body className="text-center">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Loading usage reports...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Fund Usage Reports</h5>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" animation="border" /> : "Refresh"}
          </Button>
        </Card.Header>
        <Card.Body>
          {feedback.message && (
            <Alert variant={feedback.type} className="mb-3">
              {feedback.message}
            </Alert>
          )}

          {/* Show available fund requests for charity to submit reports */}
          {account && completedRequests.length > 0 && (
            <>
              <h6 className="mb-3">Your Completed Fund Requests</h6>
              <div className="mb-4">
                {completedRequests
                  .filter(
                    (req) =>
                      req.charityAddress.toLowerCase() === account.toLowerCase()
                  )
                  .map((request) => {
                    const hasReport = usageReports.some(
                      (report) => report.id === request.id
                    );
                    return (
                      <Card key={request.id} className="mb-2">
                        <Card.Body className="py-2">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{request.purpose}</strong> -{" "}
                              {request.amount} ETH
                              <br />
                              <small className="text-muted">
                                Completed: {request.completionDate}
                              </small>
                            </div>
                            <div>
                              {hasReport ? (
                                <Badge bg="success">Report Submitted</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() =>
                                    handleOpenSubmitModal(request.id)
                                  }
                                >
                                  Submit Usage Report
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    );
                  })}
              </div>
            </>
          )}

          {/* Display all submitted usage reports */}
          <h6 className="mb-3">Submitted Usage Reports</h6>
          {usageReports.length === 0 ? (
            <Alert variant="info">
              <strong>No Usage Reports Yet</strong>
              <br />
              Fund usage reports will appear here once charities submit them for
              their completed projects. These reports provide transparency on
              how donated funds were utilized.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Charity</th>
                    <th>Project</th>
                    <th>Amount</th>
                    <th>Usage Description</th>
                    <th>Evidence</th>
                    <th>Report Date</th>
                  </tr>
                </thead>
                <tbody>
                  {usageReports.map((report, index) => (
                    <tr key={`${report.id}-${report.reportIndex}`}>
                      <td>#{report.id}</td>
                      <td>
                        <div>
                          <strong>{report.charityName}</strong>
                          <br />
                          <small className="text-muted">
                            {formatAddress(report.charityAddress)}
                          </small>
                        </div>
                      </td>
                      <td>
                        <strong>{report.purpose}</strong>
                        <br />
                        <small className="text-muted">
                          {report.description.length > 50
                            ? `${report.description.substring(0, 50)}...`
                            : report.description}
                        </small>
                      </td>
                      <td>
                        <strong>{report.amount} ETH</strong>
                      </td>
                      <td>
                        <div style={{ maxWidth: "200px" }}>
                          {report.reportDescription.length > 100
                            ? `${report.reportDescription.substring(0, 100)}...`
                            : report.reportDescription}
                        </div>
                      </td>
                      <td>
                        <div
                          style={{ maxWidth: "150px", wordBreak: "break-all" }}
                        >
                          {report.evidence.startsWith("http") ? (
                            <a
                              href={report.evidence}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-decoration-none"
                            >
                              View Evidence
                            </a>
                          ) : (
                            <small>{report.evidence}</small>
                          )}
                        </div>
                      </td>
                      <td>{report.reportDate}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          <div className="mt-3">
            <small className="text-muted">
              <strong>About Usage Reports:</strong> This section allows
              charities to submit reports on how they used withdrawn funds and
              displays all submitted reports for transparency. Reports include
              descriptions of fund usage and evidence links.
            </small>
          </div>
        </Card.Body>
      </Card>

      {/* Submit Usage Report Modal */}
      <Modal show={showSubmitModal} onHide={() => setShowSubmitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Submit Fund Usage Report</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitReport}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Usage Description *</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe how the funds were used (e.g., purchased medical supplies, food distribution, etc.)"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Evidence *</Form.Label>
              <Form.Control
                type="text"
                value={reportEvidence}
                onChange={(e) => setReportEvidence(e.target.value)}
                placeholder="Provide evidence link (e.g., IPFS hash, photos, receipts, documents)"
                required
              />
              <Form.Text className="text-muted">
                This can be an IPFS hash, Google Drive link, or any URL pointing
                to evidence of fund usage (receipts, photos, etc.)
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowSubmitModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitLoading}>
              {submitLoading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default UsageReports;
