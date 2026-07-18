// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

library CompanyLib {
    struct Company {
        uint256 companyId;
        address companyAddress;
        string name;
        string description;
        bool isActive;
        uint256 registrationDate;
    }

    struct CompanyStorage {
        uint256 nextCompanyId;
        mapping(uint256 => Company) companies;
        mapping(address => uint256) addressToCompanyId;
        uint256[] companyIds;
    }

    event CompanyRegistered(uint256 indexed companyId, address indexed companyAddress, string name);
    event CompanyDeactivated(uint256 indexed companyId);
    event CompanyActivated(uint256 indexed companyId);

    function registerCompany(
        CompanyStorage storage self,
        address _address,
        string memory _name,
        string memory _description
    ) external returns (uint256) {
        require(_address != address(0), "Invalid address");
        require(bytes(_name).length > 0, "Name required");
        require(self.addressToCompanyId[_address] == 0, "Company already exists");

        uint256 companyId = self.nextCompanyId++;

        self.companies[companyId] = Company({
            companyId: companyId,
            companyAddress: _address,
            name: _name,
            description: _description,
            isActive: true,
            registrationDate: block.timestamp
        });

        self.addressToCompanyId[_address] = companyId;
        self.companyIds.push(companyId);

        emit CompanyRegistered(companyId, _address, _name);
        return companyId;
    }

    function deactivateCompany(CompanyStorage storage self, uint256 _companyId) external {
        require(self.companies[_companyId].companyId != 0, "Company not found");
        self.companies[_companyId].isActive = false;
        emit CompanyDeactivated(_companyId);
    }

    function activateCompany(CompanyStorage storage self, uint256 _companyId) external {
        require(self.companies[_companyId].companyId != 0, "Company not found");
        self.companies[_companyId].isActive = true;
        emit CompanyActivated(_companyId);
    }

    function getCompany(CompanyStorage storage self, uint256 _companyId) external view returns (Company memory) {
        require(self.companies[_companyId].companyId != 0, "Company not found");
        return self.companies[_companyId];
    }

    function getCompanyByAddress(CompanyStorage storage self, address _address) external view returns (Company memory) {
        uint256 companyId = self.addressToCompanyId[_address];
        require(companyId != 0, "Company not found");
        return self.companies[companyId];
    }

    function getAllCompanies(CompanyStorage storage self) external view returns (Company[] memory) {
        Company[] memory allCompanies = new Company[](self.companyIds.length);
        for (uint256 i = 0; i < self.companyIds.length; i++) {
            allCompanies[i] = self.companies[self.companyIds[i]];
        }
        return allCompanies;
    }

    function isCompanyActive(CompanyStorage storage self, uint256 _companyId) external view returns (bool) {
        return self.companies[_companyId].isActive;
    }
}
