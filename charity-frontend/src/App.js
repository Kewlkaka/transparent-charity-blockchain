// src/App.js
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Alert, Spinner } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

// Components
import Navigation from "./components/Navigation";
import CharityRegistration from "./components/CharityRegistration";
import CharityList from "./components/CharityList";
import DonationForm from "./components/DonationForm";
import FundRequests from "./components/FundRequests";
import UsageReports from "./components/UsageReports";

// Utils
import getWeb3 from "./utils/getWeb3";
import { loadContracts } from "./utils/contractHelpers";

function App() {
  const [provider, setProvider] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contracts, setContracts] = useState({
    charityRegistry: null,
    donationPlatform: null,
    charityToken: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [refreshCharities, setRefreshCharities] = useState(0);
  const [refreshDonations, setRefreshDonations] = useState(0);
  const [refreshFundRequests, setRefreshFundRequests] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        //get ethers provider
        const prov = await getWeb3();
        setProvider(prov);

        //req acc from metamask
        await prov.send("eth_requestAccounts", []);
        const signer = await prov.getSigner();
        const addr = await signer.getAddress();
        setAccounts([addr]); //get chainid
        const { chainId } = await prov.getNetwork();

        //loadcontracts
        const ctrs = await loadContracts(prov, chainId);
        if (!ctrs) {
          throw new Error("Failed to load contracts on network " + chainId);
        }
        setContracts(ctrs);

        //check owner
        const owner = await ctrs.charityRegistry.owner();
        setIsOwner(addr.toLowerCase() === owner.toLowerCase());

        //listed acc change
        window.ethereum.on("accountsChanged", async (newAccounts) => {
          const newAddr = newAccounts[0];
          setAccounts([newAddr]);
          const currentOwner = await ctrs.charityRegistry.owner();
          setIsOwner(newAddr.toLowerCase() === currentOwner.toLowerCase());
        });

        window.charityRegistry = ctrs.charityRegistry;
        window.regWithSigner = ctrs.charityRegistry.connect(
          await prov.getSigner()
        );

        setLoading(false);
      } catch (err) {
        console.error("Error initializing app:", err);
        setError("Failed to load Web3, accounts, or contracts. See console.");
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) {
    return (
      <Container className="vh-100 d-flex justify-content-center align-items-center">
        <Spinner animation="border" role="status" />
        <span className="ms-2">Loading…</span>
      </Container>
    );
  }

  return (
    <div className="App">
      <Navigation currentAccount={accounts[0]} />

      <Container className="mt-4">
        {error && <Alert variant="danger">{error}</Alert>}
        <Row className="mb-4">
          <Col>
            <h1 className="text-center">Transparent Charity Platform</h1>
            <p className="text-center">
              A decentralized platform for transparent and accountable charity
              donations
            </p>
          </Col>
        </Row>{" "}
        {/* Charity List and Register Charity side by side */}
        <Row className="mb-4" id="charities-section">
          <Col md={12} lg={6}>
            <CharityList
              charityRegistry={contracts.charityRegistry}
              provider={provider}
              account={accounts[0]}
              isOwner={isOwner}
              refreshTrigger={refreshCharities}
              onCharityStatusUpdated={() =>
                setRefreshDonations((prev) => prev + 1)
              }
            />
          </Col>
          <Col md={12} lg={6}>
            <CharityRegistration
              charityRegistry={contracts.charityRegistry}
              provider={provider}
              onCharityRegistered={() =>
                setRefreshCharities((prev) => prev + 1)
              }
            />
          </Col>
        </Row>{" "}
        {/* Make a Donation */}
        <Row className="mb-4" id="donation-section">
          <Col>
            <DonationForm
              provider={provider}
              donationPlatform={contracts.donationPlatform}
              charityRegistry={contracts.charityRegistry}
              charityToken={contracts.charityToken}
              account={accounts[0]}
              refreshTrigger={refreshDonations}
              onDonationMade={() => setRefreshFundRequests((prev) => prev + 1)}
            />
          </Col>
        </Row>
        {/* Fund Request List and Fund Request */}
        <Row className="mb-4" id="fund-requests-section">
          <Col>
            <FundRequests
              donationPlatform={contracts.donationPlatform}
              charityRegistry={contracts.charityRegistry}
              provider={provider}
              account={accounts[0]}
              isOwner={isOwner}
              refreshTrigger={refreshFundRequests}
              onFundRequestUpdated={() =>
                setRefreshFundRequests((prev) => prev + 1)
              }
            />
          </Col>
        </Row>
        {/* Usage Reports */}{" "}
        <Row className="mb-4" id="usage-reports-section">
          <Col>
            <UsageReports
              donationPlatform={contracts.donationPlatform}
              charityRegistry={contracts.charityRegistry}
              provider={provider}
              account={accounts[0]}
              refreshTrigger={refreshFundRequests}
              onUsageReportSubmitted={() =>
                setRefreshFundRequests((prev) => prev + 1)
              }
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;
