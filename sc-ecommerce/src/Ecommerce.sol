// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {CompanyLib} from "./libraries/CompanyLib.sol";
import {ProductLib} from "./libraries/ProductLib.sol";
import {CustomerLib} from "./libraries/CustomerLib.sol";
import {ShoppingCartLib} from "./libraries/ShoppingCartLib.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Ecommerce is ReentrancyGuard {
    using CompanyLib for CompanyLib.CompanyStorage;
    using ProductLib for ProductLib.ProductStorage;
    using CustomerLib for CustomerLib.CustomerStorage;
    using ShoppingCartLib for ShoppingCartLib.CartStorage;

    address public owner;
    address public euroTokenAddress;

    // Storage for each module
    CompanyLib.CompanyStorage internal companyStorage;
    ProductLib.ProductStorage internal productStorage;
    CustomerLib.CustomerStorage internal customerStorage;
    ShoppingCartLib.CartStorage internal cartStorage;

    enum OrderStatus { Created, Paid, Shipped, Delivered, Completed }

    // Invoice and Payment structures
    struct Invoice {
        uint256 invoiceId;
        uint256 companyId;
        address customerAddress;
        uint256 totalAmount;
        uint256 timestamp;
        bool isPaid;
        string paymentTxHash;
        OrderStatus status;
        string trackingNumber;
        uint256 shippedTimestamp;
        uint256 deliveredTimestamp;
    }

    struct Rating {
        uint8 rating; // 1 to 5
        string comment;
        address reviewer;
        uint256 timestamp;
    }

    struct InvoiceItem {
        uint256 productId;
        string productName;
        uint256 quantity;
        uint256 unitPrice;
        uint256 totalPrice;
    }

    uint256 private nextInvoiceId = 1;
    mapping(uint256 => Invoice) private invoices;
    mapping(uint256 => InvoiceItem[]) private invoiceItems;
    mapping(address => uint256[]) private customerInvoices;
    mapping(uint256 => uint256[]) private companyInvoices;
    uint256[] private invoiceIds;

    // Reputation & Rating Storage
    mapping(uint256 => uint256) public companyTotalRating;
    mapping(uint256 => uint256) public companyRatingCount;
    mapping(uint256 => Rating[]) private companyRatings;

    // Light KYC Certification Storage
    mapping(address => bool) public isKYCVerified;

    uint256 public constant REGISTRATION_FEE = 3 ether;

    struct ActivityLog {
        address user;
        string action;
        string details;
        uint256 timestamp;
    }

    ActivityLog[] private activityLogs;

    // Events
    event InvoiceCreated(uint256 indexed invoiceId, address indexed customer, uint256 indexed companyId, uint256 totalAmount);
    event InvoicePaid(uint256 indexed invoiceId, string txHash);
    event PaymentProcessed(uint256 indexed invoiceId, address indexed customer, uint256 amount);
    event OrderShipped(uint256 indexed invoiceId, uint256 indexed companyId, string trackingNumber);
    event OrderDelivered(uint256 indexed invoiceId, address indexed customer);
    event CompanyRated(uint256 indexed companyId, address indexed reviewer, uint8 rating, string comment);
    event KYCStatusUpdated(address indexed account, bool isVerified);
    event ActivityLogged(address indexed user, string action, string details, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyCustomerOrAdmin(address _customer) {
        require(msg.sender == _customer || msg.sender == owner, "AccessControl: Caller is not customer nor admin");
        _;
    }

    constructor(address _euroTokenAddress) {
        owner = msg.sender;
        euroTokenAddress = _euroTokenAddress;
        companyStorage.nextCompanyId = 1;
        productStorage.nextProductId = 1;
    }

    // ============ AUDIT & LOGGING FUNCTIONS ============

    function _logActivity(address _user, string memory _action, string memory _details) internal {
        activityLogs.push(ActivityLog({
            user: _user,
            action: _action,
            details: _details,
            timestamp: block.timestamp
        }));
        emit ActivityLogged(_user, _action, _details, block.timestamp);
    }

    function getActivityLogs() external view returns (ActivityLog[] memory) {
        return activityLogs;
    }

    function isSystemsAdmin(address account) external view returns (bool) {
        return account == owner;
    }

    // ============ COMPANY FUNCTIONS ============

    function registerCompanySelf(
        string memory _name,
        string memory _description,
        CompanyLib.BusinessType _businessType
    ) external payable returns (uint256) {
        require(msg.value >= REGISTRATION_FEE, "Registration fee is 3 ETH");

        // Transfer 3 ETH fee to owner
        payable(owner).transfer(msg.value);

        isKYCVerified[msg.sender] = false;
        emit KYCStatusUpdated(msg.sender, false);

        uint256 companyId = companyStorage.registerCompany(msg.sender, _name, _description, _businessType);
        _logActivity(msg.sender, "REGISTER_COMPANY_SELF", _name);

        return companyId;
    }

    function registerCompany(
        address _address,
        string memory _name,
        string memory _description
    ) external onlyOwner returns (uint256) {
        return registerCompany(_address, _name, _description, CompanyLib.BusinessType.ProductSales);
    }

    function registerCompany(
        address _address,
        string memory _name,
        string memory _description,
        CompanyLib.BusinessType _businessType
    ) public onlyOwner returns (uint256) {
        isKYCVerified[_address] = true;
        emit KYCStatusUpdated(_address, true);

        uint256 companyId = companyStorage.registerCompany(_address, _name, _description, _businessType);
        _logActivity(_address, "REGISTER_COMPANY_ADMIN", _name);

        return companyId;
    }

    function deactivateCompany(uint256 _companyId) external onlyOwner {
        companyStorage.deactivateCompany(_companyId);
    }

    function activateCompany(uint256 _companyId) external onlyOwner {
        companyStorage.activateCompany(_companyId);
    }

    function getCompany(uint256 _companyId) external view returns (CompanyLib.Company memory) {
        return companyStorage.getCompany(_companyId);
    }

    function getCompanyByAddress(address _address) external view returns (CompanyLib.Company memory) {
        return companyStorage.getCompanyByAddress(_address);
    }

    function getAllCompanies() external view returns (CompanyLib.Company[] memory) {
        return companyStorage.getAllCompanies();
    }

    function isCompanyActive(uint256 _companyId) external view returns (bool) {
        return companyStorage.isCompanyActive(_companyId);
    }

    // ============ PRODUCT FUNCTIONS ============

    function addProduct(
        uint256 _companyId,
        string memory _name,
        string memory _description,
        uint256 _price,
        string memory _ipfsImageHash,
        uint256 _stock
    ) external returns (uint256) {
        uint256 productId = productStorage.addProduct(companyStorage, _companyId, _name, _description, _price, _ipfsImageHash, _stock, msg.sender);
        _logActivity(msg.sender, "ADD_PRODUCT", _name);
        return productId;
    }

    function updateProduct(
        uint256 _productId,
        string memory _name,
        string memory _description,
        uint256 _price,
        string memory _ipfsImageHash
    ) external {
        productStorage.updateProduct(companyStorage, _productId, _name, _description, _price, _ipfsImageHash, msg.sender);
    }

    function updateStock(uint256 _productId, uint256 _newStock) external {
        productStorage.updateStock(companyStorage, _productId, _newStock, msg.sender);
    }

    function decreaseStock(uint256 _productId, uint256 _quantity) external {
        productStorage.decreaseStock(_productId, _quantity);
    }

    function deactivateProduct(uint256 _productId) external {
        productStorage.deactivateProduct(companyStorage, _productId, msg.sender);
    }

    function activateProduct(uint256 _productId) external {
        productStorage.activateProduct(companyStorage, _productId, msg.sender);
    }

    function getProduct(uint256 _productId) external view returns (ProductLib.Product memory) {
        return productStorage.getProduct(_productId);
    }

    function getProductsByCompany(uint256 _companyId) external view returns (ProductLib.Product[] memory) {
        return productStorage.getProductsByCompany(_companyId);
    }

    function getCompanyProducts(uint256 _companyId) external view returns (ProductLib.Product[] memory) {
        return productStorage.getProductsByCompany(_companyId);
    }

    function getAllProducts() external view returns (ProductLib.Product[] memory) {
        return productStorage.getAllProducts();
    }

    function isProductAvailable(uint256 _productId, uint256 _quantity) external view returns (bool) {
        return productStorage.isProductAvailable(_productId, _quantity);
    }

    // ============ ENTITY & AUTH FUNCTIONS ============

    function getEntityType(address account) public view returns (uint8) {
        if (account == owner) {
            return 3; // Owner
        }
        if (companyStorage.addressToCompanyId[account] != 0) {
            return 1; // Company
        }
        if (customerStorage.isCustomerRegistered(account)) {
            return 2; // Customer
        }
        return 0; // Unregistered
    }

    function isRegisteredEntity(address account) external view returns (bool) {
        return getEntityType(account) != 0;
    }

    // ============ CUSTOMER FUNCTIONS ============

    function updateKYCStatus(address account, bool status) external onlyOwner {
        isKYCVerified[account] = status;
        emit KYCStatusUpdated(account, status);
    }

    function registerCustomerSelf(
        string memory _name,
        string memory _contactEmail,
        string memory _shippingAddress
    ) external payable {
        require(bytes(_contactEmail).length > 0, "El correo electronico es obligatorio");
        require(bytes(_shippingAddress).length > 0, "La direccion de despacho es obligatoria");

        isKYCVerified[msg.sender] = false;
        emit KYCStatusUpdated(msg.sender, false);

        customerStorage.registerCustomerSelf(msg.sender, _name, _contactEmail, _shippingAddress);
        _logActivity(msg.sender, "REGISTER_CUSTOMER_SELF", _name);
    }

    function registerCustomer() external {
        isKYCVerified[msg.sender] = false;
        emit KYCStatusUpdated(msg.sender, false);
        customerStorage.registerCustomer(msg.sender);
        _logActivity(msg.sender, "REGISTER_CUSTOMER", "Auto Customer");
    }

    function getCustomer(address _customer) external view returns (CustomerLib.Customer memory) {
        return customerStorage.getCustomer(_customer);
    }

    function getAllCustomers() external view returns (CustomerLib.Customer[] memory) {
        return customerStorage.getAllCustomers();
    }

    function isCustomerRegistered(address _customer) external view returns (bool) {
        return customerStorage.isCustomerRegistered(_customer);
    }

    // ============ SHOPPING CART FUNCTIONS ============

    function addToCart(uint256 _productId, uint256 _quantity) external {
        cartStorage.addToCart(productStorage, _productId, _quantity, msg.sender);
    }

    function removeFromCart(uint256 _productId) external {
        cartStorage.removeFromCart(_productId, msg.sender);
    }

    function updateQuantity(uint256 _productId, uint256 _quantity) external {
        cartStorage.updateQuantity(productStorage, _productId, _quantity, msg.sender);
    }

    function getCart(address _customer) external view onlyCustomerOrAdmin(_customer) returns (ShoppingCartLib.CartItem[] memory) {
        return cartStorage.getCart(_customer);
    }

    function clearCart(address _customer) external onlyCustomerOrAdmin(_customer) {
        cartStorage.clearCart(_customer);
    }

    function calculateTotal(address _customer) external view onlyCustomerOrAdmin(_customer) returns (uint256) {
        return cartStorage.calculateTotal(_customer);
    }

    function getCartItemCount(address _customer) external view onlyCustomerOrAdmin(_customer) returns (uint256) {
        return cartStorage.getCartItemCount(_customer);
    }

    // ============ INVOICE FUNCTIONS ============

    function createInvoice(address _customer, uint256 _companyId) external onlyCustomerOrAdmin(_customer) returns (uint256) {
        ShoppingCartLib.CartItem[] memory cartItems = cartStorage.getCart(_customer);
        require(cartItems.length > 0, "Cart is empty");

        uint256 total = 0;
        uint256 invoiceId = nextInvoiceId++;

        // Create invoice items
        for (uint256 i = 0; i < cartItems.length; i++) {
            ProductLib.Product memory product = productStorage.getProduct(cartItems[i].productId);

            // Only include items from this company
            if (product.companyId == _companyId) {
                uint256 itemTotal = cartItems[i].unitPrice * cartItems[i].quantity;
                total += itemTotal;

                invoiceItems[invoiceId].push(InvoiceItem({
                    productId: cartItems[i].productId,
                    productName: product.name,
                    quantity: cartItems[i].quantity,
                    unitPrice: cartItems[i].unitPrice,
                    totalPrice: itemTotal
                }));
            }
        }

        require(total > 0, "No items for this company");

        invoices[invoiceId] = Invoice({
            invoiceId: invoiceId,
            companyId: _companyId,
            customerAddress: _customer,
            totalAmount: total,
            timestamp: block.timestamp,
            isPaid: false,
            paymentTxHash: "",
            status: OrderStatus.Created,
            trackingNumber: "",
            shippedTimestamp: 0,
            deliveredTimestamp: 0
        });

        customerInvoices[_customer].push(invoiceId);
        companyInvoices[_companyId].push(invoiceId);
        invoiceIds.push(invoiceId);

        emit InvoiceCreated(invoiceId, _customer, _companyId, total);
        return invoiceId;
    }

    /// @notice Processes multi-company checkout in a SINGLE transaction
    /// @param _companyIds Array of unique company IDs present in the purchase
    /// @param _productIds Array of product IDs purchased
    /// @param _quantities Array of quantities for each product ID
    /// @return createdInvoiceIds Array of invoice IDs generated for each company
    function checkoutMultiCompany(
        uint256[] memory _companyIds,
        uint256[] memory _productIds,
        uint256[] memory _quantities
    ) external nonReentrant returns (uint256[] memory createdInvoiceIds) {
        require(_companyIds.length > 0, "No companies specified");
        require(_productIds.length > 0 && _productIds.length == _quantities.length, "Invalid product data");

        createdInvoiceIds = new uint256[](_companyIds.length);
        uint256 grandTotal = 0;

        // Step 1: Validate stock and compute grand total across all companies
        for (uint256 c = 0; c < _companyIds.length; c++) {
            uint256 companyId = _companyIds[c];
            uint256 companyTotal = 0;

            for (uint256 i = 0; i < _productIds.length; i++) {
                ProductLib.Product memory product = productStorage.getProduct(_productIds[i]);
                if (product.companyId == companyId) {
                    require(product.stock >= _quantities[i], "Insufficient stock for product");
                    companyTotal += product.price * _quantities[i];
                }
            }
            require(companyTotal > 0, "No items for company");
            grandTotal += companyTotal;
        }

        // Step 2: SINGLE transferFrom of EURT tokens into Escrow Smart Contract custody (address(this))
        IERC20 euroToken = IERC20(euroTokenAddress);
        require(euroToken.balanceOf(msg.sender) >= grandTotal, "Insufficient EURT balance");
        require(euroToken.transferFrom(msg.sender, address(this), grandTotal), "Escrow transferFrom failed");

        // Step 3: Create invoice and mark Paid for EACH company
        for (uint256 c = 0; c < _companyIds.length; c++) {
            uint256 companyId = _companyIds[c];
            uint256 invoiceId = nextInvoiceId++;
            uint256 companyTotal = 0;

            for (uint256 i = 0; i < _productIds.length; i++) {
                ProductLib.Product memory product = productStorage.getProduct(_productIds[i]);
                if (product.companyId == companyId) {
                    uint256 itemTotal = product.price * _quantities[i];
                    companyTotal += itemTotal;

                    invoiceItems[invoiceId].push(InvoiceItem({
                        productId: _productIds[i],
                        productName: product.name,
                        quantity: _quantities[i],
                        unitPrice: product.price,
                        totalPrice: itemTotal
                    }));

                    // Decrease stock
                    productStorage.decreaseStock(_productIds[i], _quantities[i]);
                }
            }

            invoices[invoiceId] = Invoice({
                invoiceId: invoiceId,
                companyId: companyId,
                customerAddress: msg.sender,
                totalAmount: companyTotal,
                timestamp: block.timestamp,
                isPaid: true,
                paymentTxHash: "",
                status: OrderStatus.Paid,
                trackingNumber: "",
                shippedTimestamp: 0,
                deliveredTimestamp: 0
            });

            customerInvoices[msg.sender].push(invoiceId);
            companyInvoices[companyId].push(invoiceId);
            invoiceIds.push(invoiceId);

            createdInvoiceIds[c] = invoiceId;

            emit InvoiceCreated(invoiceId, msg.sender, companyId, companyTotal);
            emit InvoicePaid(invoiceId, "");
            emit PaymentProcessed(invoiceId, msg.sender, companyTotal);
        }

        // Step 4: Update customer purchase stats and clear on-chain cart
        customerStorage.updatePurchaseStats(msg.sender, grandTotal);
        cartStorage.clearCart(msg.sender);

        _logActivity(msg.sender, "CHECKOUT_MULTI_COMPANY", "Paid Multi-Company Order into Escrow Custody");
        return createdInvoiceIds;
    }

    function getInvoice(uint256 _invoiceId) external view returns (Invoice memory) {
        require(invoices[_invoiceId].invoiceId != 0, "Invoice not found");
        return invoices[_invoiceId];
    }

    function getInvoiceItems(uint256 _invoiceId) external view returns (InvoiceItem[] memory) {
        return invoiceItems[_invoiceId];
    }

    function getCustomerInvoices(address _customer) external view returns (Invoice[] memory) {
        uint256[] memory invoiceIdsForCustomer = customerInvoices[_customer];
        Invoice[] memory result = new Invoice[](invoiceIdsForCustomer.length);

        for (uint256 i = 0; i < invoiceIdsForCustomer.length; i++) {
            result[i] = invoices[invoiceIdsForCustomer[i]];
        }

        return result;
    }

    function getCompanyInvoices(uint256 _companyId) external view returns (Invoice[] memory) {
        uint256[] memory invoiceIdsForCompany = companyInvoices[_companyId];
        Invoice[] memory result = new Invoice[](invoiceIdsForCompany.length);

        for (uint256 i = 0; i < invoiceIdsForCompany.length; i++) {
            result[i] = invoices[invoiceIdsForCompany[i]];
        }

        return result;
    }

    // ============ PAYMENT & ORDER WORKFLOW FUNCTIONS ============

    function processPayment(
        address _customer,
        uint256 _amount,
        uint256 _invoiceId
    ) external nonReentrant onlyCustomerOrAdmin(_customer) returns (bool) {
        Invoice storage invoice = invoices[_invoiceId];
        require(invoice.invoiceId != 0, "Invoice not found");
        require(!invoice.isPaid, "Invoice already paid");
        require(invoice.totalAmount == _amount, "Amount mismatch");

        IERC20 euroToken = IERC20(euroTokenAddress);
        require(euroToken.balanceOf(_customer) >= _amount, "Insufficient balance");

        // Get company address
        CompanyLib.Company memory company = companyStorage.getCompany(invoice.companyId);

        // EFFECTS (State changes BEFORE external interaction)
        invoice.isPaid = true;
        invoice.paymentTxHash = "";
        invoice.status = OrderStatus.Paid;

        // Update customer stats
        customerStorage.updatePurchaseStats(_customer, _amount);

        // Decrease stock for all invoice items
        InvoiceItem[] memory items = invoiceItems[_invoiceId];
        for (uint256 i = 0; i < items.length; i++) {
            productStorage.decreaseStock(items[i].productId, items[i].quantity);
        }

        // INTERACTIONS (External token transfer to Escrow Smart Contract custody)
        require(euroToken.transferFrom(_customer, address(this), _amount), "Transfer to Escrow failed");

        emit InvoicePaid(_invoiceId, "");
        emit PaymentProcessed(_invoiceId, _customer, _amount);
        _logActivity(_customer, "PAYMENT_PROCESSED", "Paid Invoice to Escrow Custody");
        return true;
    }

    function shipOrder(uint256 _invoiceId, string memory _trackingNumber) external {
        Invoice storage invoice = invoices[_invoiceId];
        require(invoice.invoiceId != 0, "Invoice not found");
        require(invoice.isPaid, "Invoice not paid");
        require(invoice.status == OrderStatus.Paid, "Order cannot be shipped");

        // Verify sender is company owner
        CompanyLib.Company memory company = companyStorage.getCompany(invoice.companyId);
        require(msg.sender == company.companyAddress || msg.sender == owner, "Only company owner can ship");

        invoice.status = OrderStatus.Shipped;
        invoice.trackingNumber = _trackingNumber;
        invoice.shippedTimestamp = block.timestamp;

        _logActivity(msg.sender, "SHIP_ORDER", _trackingNumber);
        emit OrderShipped(_invoiceId, invoice.companyId, _trackingNumber);
    }

    function confirmDelivery(uint256 _invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[_invoiceId];
        require(invoice.invoiceId != 0, "Invoice not found");
        require(invoice.customerAddress == msg.sender || msg.sender == owner, "Only buyer or owner can confirm delivery");
        require(invoice.status == OrderStatus.Shipped, "Order not shipped yet");

        CompanyLib.Company memory company = companyStorage.getCompany(invoice.companyId);

        // EFFECTS (State changes BEFORE external interaction)
        invoice.status = OrderStatus.Delivered;
        invoice.deliveredTimestamp = block.timestamp;

        // INTERACTIONS (Release locked funds from Escrow Smart Contract custody to merchant)
        IERC20 euroToken = IERC20(euroTokenAddress);
        require(euroToken.transfer(company.companyAddress, invoice.totalAmount), "Escrow release transfer failed");

        _logActivity(msg.sender, "CONFIRM_DELIVERY", "Escrow Released to Merchant");
        emit OrderDelivered(_invoiceId, msg.sender);
    }

    function resolveDisputeReleaseEscrow(uint256 _invoiceId) external onlyOwner nonReentrant {
        Invoice storage invoice = invoices[_invoiceId];
        require(invoice.invoiceId != 0, "Invoice not found");
        require(invoice.isPaid, "Invoice not paid");
        require(invoice.status == OrderStatus.Shipped, "Order must be shipped to resolve dispute");

        CompanyLib.Company memory company = companyStorage.getCompany(invoice.companyId);

        // EFFECTS
        invoice.status = OrderStatus.Delivered;
        invoice.deliveredTimestamp = block.timestamp;

        // INTERACTIONS
        IERC20 euroToken = IERC20(euroTokenAddress);
        require(euroToken.transfer(company.companyAddress, invoice.totalAmount), "Dispute release transfer failed");

        _logActivity(msg.sender, "DISPUTE_RESOLVED", "Escrow Released by Admin");
        emit OrderDelivered(_invoiceId, invoice.customerAddress);
    }

    // ============ REPUTATION & RATING FUNCTIONS ============

    function hasPaidInvoiceWithCompany(address _customer, uint256 _companyId) public view returns (bool) {
        uint256[] memory invIds = customerInvoices[_customer];
        for (uint256 i = 0; i < invIds.length; i++) {
            Invoice memory inv = invoices[invIds[i]];
            if (inv.companyId == _companyId && inv.isPaid) {
                return true;
            }
        }
        return false;
    }

    function rateCompany(uint256 _companyId, uint8 _rating, string memory _comment) external {
        require(_rating >= 1 && _rating <= 5, "Rating must be 1 to 5");
        require(companyStorage.isCompanyActive(_companyId), "Company inactive");
        require(hasPaidInvoiceWithCompany(msg.sender, _companyId), "ReviewDenied: Customer has no verified purchase with this company");

        companyTotalRating[_companyId] += _rating;
        companyRatingCount[_companyId] += 1;

        companyRatings[_companyId].push(Rating({
            rating: _rating,
            comment: _comment,
            reviewer: msg.sender,
            timestamp: block.timestamp
        }));

        emit CompanyRated(_companyId, msg.sender, _rating, _comment);
    }

    function getCompanyRating(uint256 _companyId) external view returns (uint256 avgRatingTimes100, uint256 totalReviews) {
        totalReviews = companyRatingCount[_companyId];
        if (totalReviews == 0) {
            return (0, 0);
        }
        avgRatingTimes100 = (companyTotalRating[_companyId] * 100) / totalReviews;
    }

    function getCompanyReviews(uint256 _companyId) external view returns (Rating[] memory) {
        return companyRatings[_companyId];
    }

    // ============ BATCH QUERY OPTIMIZATIONS ============

    function getProductsBatch(uint256[] calldata _productIds) external view returns (ProductLib.Product[] memory) {
        ProductLib.Product[] memory batch = new ProductLib.Product[](_productIds.length);
        for (uint256 i = 0; i < _productIds.length; i++) {
            batch[i] = productStorage.getProduct(_productIds[i]);
        }
        return batch;
    }

    function getInvoicesBatch(uint256[] calldata _invoiceIds) external view returns (Invoice[] memory) {
        Invoice[] memory batch = new Invoice[](_invoiceIds.length);
        for (uint256 i = 0; i < _invoiceIds.length; i++) {
            batch[i] = invoices[_invoiceIds[i]];
        }
        return batch;
    }
}
