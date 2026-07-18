// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {CompanyLib} from "./libraries/CompanyLib.sol";
import {ProductLib} from "./libraries/ProductLib.sol";
import {CustomerLib} from "./libraries/CustomerLib.sol";
import {ShoppingCartLib} from "./libraries/ShoppingCartLib.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Ecommerce {
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

    // Invoice and Payment structures
    struct Invoice {
        uint256 invoiceId;
        uint256 companyId;
        address customerAddress;
        uint256 totalAmount;
        uint256 timestamp;
        bool isPaid;
        string paymentTxHash;
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

    // Events
    event InvoiceCreated(uint256 indexed invoiceId, address indexed customer, uint256 indexed companyId, uint256 totalAmount);
    event InvoicePaid(uint256 indexed invoiceId, string txHash);
    event PaymentProcessed(uint256 indexed invoiceId, address indexed customer, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _euroTokenAddress) {
        owner = msg.sender;
        euroTokenAddress = _euroTokenAddress;
        companyStorage.nextCompanyId = 1;
        productStorage.nextProductId = 1;
    }

    // ============ COMPANY FUNCTIONS ============

    function registerCompany(
        address _address,
        string memory _name,
        string memory _description
    ) external onlyOwner returns (uint256) {
        return companyStorage.registerCompany(_address, _name, _description);
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
        return productStorage.addProduct(companyStorage, _companyId, _name, _description, _price, _ipfsImageHash, _stock, msg.sender);
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

    function getAllProducts() external view returns (ProductLib.Product[] memory) {
        return productStorage.getAllProducts();
    }

    function isProductAvailable(uint256 _productId, uint256 _quantity) external view returns (bool) {
        return productStorage.isProductAvailable(_productId, _quantity);
    }

    // ============ CUSTOMER FUNCTIONS ============

    function registerCustomer() external {
        customerStorage.registerCustomer(msg.sender);
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

    function getCart(address _customer) external view returns (ShoppingCartLib.CartItem[] memory) {
        return cartStorage.getCart(_customer);
    }

    function clearCart(address _customer) external {
        cartStorage.clearCart(_customer);
    }

    function calculateTotal(address _customer) external view returns (uint256) {
        return cartStorage.calculateTotal(_customer);
    }

    function getCartItemCount(address _customer) external view returns (uint256) {
        return cartStorage.getCartItemCount(_customer);
    }

    // ============ INVOICE FUNCTIONS ============

    function createInvoice(address _customer, uint256 _companyId) external returns (uint256) {
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
            paymentTxHash: ""
        });

        customerInvoices[_customer].push(invoiceId);
        companyInvoices[_companyId].push(invoiceId);
        invoiceIds.push(invoiceId);

        emit InvoiceCreated(invoiceId, _customer, _companyId, total);
        return invoiceId;
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

    // ============ PAYMENT FUNCTIONS ============

    function processPayment(
        address _customer,
        uint256 _amount,
        uint256 _invoiceId
    ) external returns (bool) {
        Invoice storage invoice = invoices[_invoiceId];
        require(invoice.invoiceId != 0, "Invoice not found");
        require(!invoice.isPaid, "Invoice already paid");
        require(invoice.totalAmount == _amount, "Amount mismatch");

        IERC20 euroToken = IERC20(euroTokenAddress);
        require(euroToken.balanceOf(_customer) >= _amount, "Insufficient balance");

        // Get company address
        CompanyLib.Company memory company = companyStorage.getCompany(invoice.companyId);

        // Transfer tokens from customer to company
        require(euroToken.transferFrom(_customer, company.companyAddress, _amount), "Transfer failed");

        // Mark invoice as paid
        invoice.isPaid = true;
        invoice.paymentTxHash = "";
        emit InvoicePaid(_invoiceId, "");

        // Update customer stats
        customerStorage.updatePurchaseStats(_customer, _amount);

        // Decrease stock for all invoice items
        InvoiceItem[] memory items = invoiceItems[_invoiceId];
        for (uint256 i = 0; i < items.length; i++) {
            productStorage.decreaseStock(items[i].productId, items[i].quantity);
        }

        emit PaymentProcessed(_invoiceId, _customer, _amount);
        return true;
    }
}
