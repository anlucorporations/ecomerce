// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

library CustomerLib {
    struct Customer {
        address customerAddress;
        uint256 totalPurchases;
        uint256 totalSpent;
        uint256 registrationDate;
        uint256 lastPurchaseDate;
        bool isActive;
    }

    struct CustomerStorage {
        mapping(address => Customer) customers;
        address[] customerAddresses;
    }

    event CustomerRegistered(address indexed customerAddress);
    event PurchaseStatsUpdated(address indexed customerAddress, uint256 amount);

    function registerCustomer(CustomerStorage storage self, address _customer) external {
        require(self.customers[_customer].customerAddress == address(0), "Customer already exists");

        self.customers[_customer] = Customer({
            customerAddress: _customer,
            totalPurchases: 0,
            totalSpent: 0,
            registrationDate: block.timestamp,
            lastPurchaseDate: 0,
            isActive: true
        });

        self.customerAddresses.push(_customer);
        emit CustomerRegistered(_customer);
    }

    function updatePurchaseStats(CustomerStorage storage self, address _customer, uint256 _amount) external {
        Customer storage customer = self.customers[_customer];

        // Auto-register if not exists
        if (customer.customerAddress == address(0)) {
            self.customers[_customer] = Customer({
                customerAddress: _customer,
                totalPurchases: 0,
                totalSpent: 0,
                registrationDate: block.timestamp,
                lastPurchaseDate: 0,
                isActive: true
            });
            self.customerAddresses.push(_customer);
            emit CustomerRegistered(_customer);
        }

        customer.totalPurchases++;
        customer.totalSpent += _amount;
        customer.lastPurchaseDate = block.timestamp;

        emit PurchaseStatsUpdated(_customer, _amount);
    }

    function getCustomer(CustomerStorage storage self, address _customer) external view returns (Customer memory) {
        require(self.customers[_customer].customerAddress != address(0), "Customer not found");
        return self.customers[_customer];
    }

    function getAllCustomers(CustomerStorage storage self) external view returns (Customer[] memory) {
        Customer[] memory allCustomers = new Customer[](self.customerAddresses.length);
        for (uint256 i = 0; i < self.customerAddresses.length; i++) {
            allCustomers[i] = self.customers[self.customerAddresses[i]];
        }
        return allCustomers;
    }

    function isCustomerRegistered(CustomerStorage storage self, address _customer) external view returns (bool) {
        return self.customers[_customer].customerAddress != address(0);
    }
}
