// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CharityRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DonationPlatform is Ownable, ReentrancyGuard {
    CharityRegistry public charityRegistry;

    enum FundRequestStatus {
        Pending,
        Approved,
        Rejected,
        Completed
    }
    enum DonationType {
        ETH,
        Token
    }

    struct Donation {
        address donor;
        address charity;
        uint256 amount;
        uint256 timestamp;
        DonationType donationType;
        address tokenAddress; // null for ETH
        string message;
    }

    struct FundRequest {
        address charity;
        uint256 amount;
        string purpose;
        string description;
        FundRequestStatus status;
        uint256 requestDate;
        uint256 completionDate;
    }

    struct FundUsageReport {
        uint256 requestId;
        string description;
        string evidence; // could be an IPFS hash of documentation
        uint256 reportDate;
    }

    // Mappings and arrays
    mapping(address => mapping(address => uint256)) public charityBalances; // charity -> token -> balance
    mapping(address => uint256) public donorsCount;
    mapping(address => uint256) public totalDonated;

    Donation[] public donations;
    FundRequest[] public fundRequests;
    mapping(uint256 => FundUsageReport[]) public fundUsageReports;

    //Events
    event DonationReceived(
        uint256 indexed donationId,
        address indexed donor,
        address indexed charity,
        uint256 amount,
        DonationType donationType,
        address tokenAddress,
        uint256 timestamp
    );

    event FundRequestCreated(
        uint256 indexed requestId,
        address indexed charity,
        uint256 amount,
        string purpose,
        uint256 requestDate
    );

    event FundRequestStatusUpdated(
        uint256 indexed requestId,
        FundRequestStatus status,
        uint256 timestamp
    );

    event FundsWithdrawn(
        address indexed charity,
        uint256 indexed requestId,
        uint256 amount,
        uint256 timestamp
    );

    event FundUsageReportSubmitted(
        address indexed charity,
        uint256 indexed requestId,
        uint256 reportDate
    );
    constructor(address _charityRegistryAddress, address _admin) {
        require(
            _charityRegistryAddress != address(0),
            "Invalid charity registry address"
        );
        require(_admin != address(0), "Admin address cannot be zero");
        charityRegistry = CharityRegistry(_charityRegistryAddress);
        _transferOwnership(_admin);
    }

    function donateETH(
        address _charityAddress,
        string memory _message
    ) public payable nonReentrant {
        require(msg.value > 0, "Donation amount must be greater than 0");
        require(
            charityRegistry.isCharityApproved(_charityAddress),
            "Charity is not approved"
        );

        charityBalances[_charityAddress][address(0)] += msg.value;

        if (totalDonated[msg.sender] == 0) {
            donorsCount[_charityAddress]++;
        }
        totalDonated[msg.sender] += msg.value;

        uint256 donationId = donations.length;
        donations.push(
            Donation({
                donor: msg.sender,
                charity: _charityAddress,
                amount: msg.value,
                timestamp: block.timestamp,
                donationType: DonationType.ETH,
                tokenAddress: address(0),
                message: _message
            })
        );

        emit DonationReceived(
            donationId,
            msg.sender,
            _charityAddress,
            msg.value,
            DonationType.ETH,
            address(0),
            block.timestamp
        );
    }

    function donateToken(
        address _charityAddress,
        address _tokenAddress,
        uint256 _amount,
        string memory _message
    ) public nonReentrant {
        require(_amount > 0, "Donation amount must be greater than 0");
        require(_tokenAddress != address(0), "Invalid token address");
        require(
            charityRegistry.isCharityApproved(_charityAddress),
            "Charity is not approved"
        );

        IERC20 token = IERC20(_tokenAddress);
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );
        charityBalances[_charityAddress][_tokenAddress] += _amount;

        if (totalDonated[msg.sender] == 0) {
            donorsCount[_charityAddress]++;
        }

        uint256 donationId = donations.length;
        donations.push(
            Donation({
                donor: msg.sender,
                charity: _charityAddress,
                amount: _amount,
                timestamp: block.timestamp,
                donationType: DonationType.Token,
                tokenAddress: _tokenAddress,
                message: _message
            })
        );

        emit DonationReceived(
            donationId,
            msg.sender,
            _charityAddress,
            _amount,
            DonationType.Token,
            _tokenAddress,
            block.timestamp
        );
    }

    function createFundRequest(
        uint256 _amount,
        string memory _purpose,
        string memory _description
    ) public {
        require(
            charityRegistry.isCharityApproved(msg.sender),
            "Only approved charities can request funds"
        );

        uint256 requestId = fundRequests.length;
        fundRequests.push(
            FundRequest({
                charity: msg.sender,
                amount: _amount,
                purpose: _purpose,
                description: _description,
                status: FundRequestStatus.Pending,
                requestDate: block.timestamp,
                completionDate: 0
            })
        );

        emit FundRequestCreated(
            requestId,
            msg.sender,
            _amount,
            _purpose,
            block.timestamp
        );
    }

    function updateFundRequestStatus(
        uint256 _requestId,
        FundRequestStatus _newStatus
    ) public onlyOwner {
        require(_requestId < fundRequests.length, "Invalid request ID");
        require(
            _newStatus != FundRequestStatus.Completed,
            "Use withdrawFunds for completion"
        );
        FundRequest storage request = fundRequests[_requestId];
        request.status = _newStatus;
        emit FundRequestStatusUpdated(_requestId, _newStatus, block.timestamp);
    }

    function withdrawFunds(
        uint256 _requestId,
        address _tokenAddress
    ) public nonReentrant {
        require(_requestId < fundRequests.length, "Invalid request ID");
        FundRequest storage request = fundRequests[_requestId];
        require(
            request.charity == msg.sender,
            "Only the requesting charity can withdraw"
        );
        require(
            request.status == FundRequestStatus.Approved,
            "Request is not approved"
        );

        uint256 amount = request.amount;
        require(
            charityBalances[msg.sender][_tokenAddress] >= amount,
            "Insufficient balance"
        );
        charityBalances[msg.sender][_tokenAddress] -= amount;

        if (_tokenAddress == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20 token = IERC20(_tokenAddress);
            require(
                token.transfer(msg.sender, amount),
                "Token transfer failed"
            );
        }

        request.status = FundRequestStatus.Completed;
        request.completionDate = block.timestamp;
        emit FundsWithdrawn(msg.sender, _requestId, amount, block.timestamp);
    }

    function submitFundUsageReport(
        uint256 _requestId,
        string memory _description,
        string memory _evidence
    ) public {
        require(_requestId < fundRequests.length, "Invalid request ID");
        FundRequest storage request = fundRequests[_requestId];
        require(
            request.charity == msg.sender,
            "Only the requesting charity can submit a report"
        );
        require(
            request.status == FundRequestStatus.Completed,
            "Request is not completed"
        );
        fundUsageReports[_requestId].push(
            FundUsageReport({
                requestId: _requestId,
                description: _description,
                evidence: _evidence,
                reportDate: block.timestamp
            })
        );
        emit FundUsageReportSubmitted(msg.sender, _requestId, block.timestamp);
    }

    function getDonationsCount() public view returns (uint256 count) {
        count = donations.length;
    }

    function getFundRequestsCount() public view returns (uint256 count) {
        count = fundRequests.length;
    }

    function getFundUsageReportsCount(
        uint256 _requestId
    ) public view returns (uint256 reportCount) {
        reportCount = fundUsageReports[_requestId].length;
    }

    function getDonationDetails(
        uint256 _donationId
    )
        public
        view
        returns (
            address donor,
            address charity,
            uint256 amount,
            uint256 timestamp,
            DonationType donationType,
            address tokenAddress,
            string memory message
        )
    {
        require(_donationId < donations.length, "Invalid donation ID");
        Donation memory donation = donations[_donationId];
        return (
            donation.donor,
            donation.charity,
            donation.amount,
            donation.timestamp,
            donation.donationType,
            donation.tokenAddress,
            donation.message
        );
    }

    function getFundRequestDetails(
        uint256 _requestId
    )
        public
        view
        returns (
            address charityAddress,
            uint256 amount,
            string memory purpose,
            string memory description,
            FundRequestStatus status,
            uint256 requestDate,
            uint256 completionDate
        )
    {
        require(_requestId < fundRequests.length, "Invalid request ID");
        FundRequest memory request = fundRequests[_requestId];
        return (
            request.charity,
            request.amount,
            request.purpose,
            request.description,
            request.status,
            request.requestDate,
            request.completionDate
        );
    }

    function getFundUsageReportDetails(
        uint256 _requestId,
        uint256 _reportIndex
    )
        public
        view
        returns (
            string memory description,
            string memory evidence,
            uint256 reportDate
        )
    {
        require(_requestId < fundRequests.length, "Invalid request ID");
        require(
            _reportIndex < fundUsageReports[_requestId].length,
            "Invalid report index"
        );
        FundUsageReport memory report = fundUsageReports[_requestId][
            _reportIndex
        ];
        return (report.description, report.evidence, report.reportDate);
    }
}
