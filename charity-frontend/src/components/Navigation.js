import React from "react";
import { Navbar, Nav, Container } from "react-bootstrap";

const Navigation = ({ currentAccount }) => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand href="#home">🏥 Transparent Charity</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="#charities">Charities</Nav.Link>
            <Nav.Link href="#registration">Register</Nav.Link>
            <Nav.Link href="#fund-requests">Fund Requests</Nav.Link>
            <Nav.Link href="#usage-reports">Reports</Nav.Link>
          </Nav>
          <Nav>
            <Navbar.Text>
              Connected:{" "}
              {currentAccount
                ? `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`
                : "Not Connected"}
            </Navbar.Text>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
