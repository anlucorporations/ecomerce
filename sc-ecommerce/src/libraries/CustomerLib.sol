// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

library CustomerLib {
    struct Customer {
        address customerAddress;
        string name;
        string contactEmail;
        string shippingAddress;
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

    event CustomerRegistered(address indexed customerAddress, string name);
    event PurchaseStatsUpdated(address indexed customerAddress, uint256 amount);

    function registerCustomerSelf(
        CustomerStorage storage self,
        address _customer,
        string memory _name,
        string memory _contactEmail,
        string memory _shippingAddress
    ) external {
        require(self.customers[_customer].customerAddress == address(0), "Customer already exists");

        self.customers[_customer] = Customer({
            customerAddress: _customer,
            name: _name,
            contactEmail: _contactEmail,
            shippingAddress: _shippingAddress,
            totalPurchases: 0,
            totalSpent: 0,
            registrationDate: block.timestamp,
            lastPurchaseDate: 0,
            isActive: true
        });

        self.customerAddresses.push(_customer);
        emit CustomerRegistered(_customer, _name);
    }

    function registerCustomer(CustomerStorage storage self, address _customer) external {
        require(self.customers[_customer].customerAddress == address(0), "Customer already exists");

        self.customers[_customer] = Customer({
            customerAddress: _customer,
            name: "Cliente Registrado",
            contactEmail: "",
            shippingAddress: "",
            totalPurchases: 0,
            totalSpent: 0,
            registrationDate: block.timestamp,
            lastPurchaseDate: 0,
            isActive: true
        });

        self.customerAddresses.push(_customer);
        emit CustomerRegistered(_customer, "Cliente Registrado");
    }

    function updatePurchaseStats(CustomerStorage storage self, address _customer, uint256 _amount) external {
        Customer storage customer = self.customers[_customer];

        // Auto-register if not exists
        if (customer.customerAddress == address(0)) {
            self.customers[_customer] = Customer({
                customerAddress: _customer,
                name: "Cliente Autoregistrado",
                contactEmail: "",
                shippingAddress: "",
                totalPurchases: 0,
                totalSpent: 0,
                registrationDate: block.timestamp,
                lastPurchaseDate: 0,
                isActive: true
            });
            self.customerAddresses.push(_customer);
            emit CustomerRegistered(_customer, "Cliente Autoregistrado");
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
