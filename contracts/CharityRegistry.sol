// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CharityRegistry is Ownable {
    enum CharityStatus {
        Pending,
        Approved,
        Rejected,
        Suspended
    }

    struct Charity {
        string name;
        string description;
        address payable walletAddress;
        CharityStatus status;
        uint256 registrationDate;
        string website;
        string contactInformation;
    }

    //mapping from charity address to Charity struct
    mapping(address => Charity) public charities;

    //array store addresses of all registered charities
    address[] public charityAddresses;

    // Events
    event CharityRegistered(
        address indexed charityAddress,
        string name,
        uint256 registrationDate
    );
    event CharityStatusChanged(
        address indexed charityAddress,
        CharityStatus newStatus
    );
    event CharityInfoUpdated(address indexed charityAddress);

    function registerCharity(
        string memory _name,
        string memory _description,
        address payable _walletAddress,
        string memory _website,
        string memory _contactInformation
    ) public {
        require(_walletAddress != address(0), "Invalid wallet address");
        require(
            charities[_walletAddress].registrationDate == 0,
            "Charity already registered"
        );

        Charity memory newCharity = Charity({
            name: _name,
            description: _description,
            walletAddress: _walletAddress,
            status: CharityStatus.Pending,
            registrationDate: block.timestamp,
            website: _website,
            contactInformation: _contactInformation
        });

        charities[_walletAddress] = newCharity;
        charityAddresses.push(_walletAddress);

        emit CharityRegistered(_walletAddress, _name, block.timestamp);
    }

    function updateCharityStatus(
        address _charityAddress,
        CharityStatus _newStatus
    ) public onlyOwner {
        require(
            charities[_charityAddress].registrationDate != 0,
            "Charity not registered"
        );

        charities[_charityAddress].status = _newStatus;

        emit CharityStatusChanged(_charityAddress, _newStatus);
    }

    function updateCharityInfo(
        address _charityAddress,
        string memory _name,
        string memory _description,
        string memory _website,
        string memory _contactInformation
    ) public {
        require(
            msg.sender == _charityAddress || msg.sender == owner(),
            "Unauthorized"
        );
        require(
            charities[_charityAddress].registrationDate != 0,
            "Charity not registered"
        );

        Charity storage charity = charities[_charityAddress];
        charity.name = _name;
        charity.description = _description;
        charity.website = _website;
        charity.contactInformation = _contactInformation;

        emit CharityInfoUpdated(_charityAddress);
    }

    function isCharityApproved(
        address _charityAddress
    ) public view returns (bool isApproved) {
        isApproved = (charities[_charityAddress].status ==
            CharityStatus.Approved);
    }

    function getAllCharities()
        public
        view
        returns (address[] memory charityList)
    {
        charityList = charityAddresses;
    }

    function getCharityDetails(
        address _charityAddress
    )
        public
        view
        returns (
            string memory name,
            string memory description,
            address walletAddress,
            CharityStatus status,
            uint256 registrationDate,
            string memory website,
            string memory contactInformation
        )
    {
        Charity memory charity = charities[_charityAddress];
        return (
            charity.name,
            charity.description,
            charity.walletAddress,
            charity.status,
            charity.registrationDate,
            charity.website,
            charity.contactInformation
        );
    }
}
