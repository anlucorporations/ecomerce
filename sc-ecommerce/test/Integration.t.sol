// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {MockEuroToken} from "./mocks/MockEuroToken.sol";
import {ProductLib} from "../src/libraries/ProductLib.sol";
import {ShoppingCartLib} from "../src/libraries/ShoppingCartLib.sol";

contract IntegrationTest is Test {
    Ecommerce public ecommerce;
    MockEuroToken public euroToken;

    address public owner;
    address public company1;
    address public customer1;

    uint256 public companyId1;
    uint256 public productId1;
    uint256 public productId2;

    function setUp() public {
        owner = address(this);
        company1 = makeAddr("company1");
        customer1 = makeAddr("customer1");

        // Deploy EuroToken and Ecommerce
        euroToken = new MockEuroToken();
        ecommerce = new Ecommerce(address(euroToken));

        // Register company
        companyId1 = ecommerce.registerCompany(
            company1,
            "Tech Store",
            "Electronics store"
        );

        // Add products
        vm.startPrank(company1);
        productId1 = ecommerce.addProduct(
            companyId1,
            "Laptop",
            "High-end laptop",
            1000000000, // 1000 EURT
            "QmLaptop",
            10
        );
        productId2 = ecommerce.addProduct(
            companyId1,
            "Mouse",
            "Wireless mouse",
            50000000, // 50 EURT
            "QmMouse",
            100
        );
        vm.stopPrank();

        // Give customer some EURT
        euroToken.mint(customer1, 5000000000); // 5000 EURT
    }

    function test_CompletePurchaseFlow() public {
        // 1. Customer adds items to cart
        vm.startPrank(customer1);
        ecommerce.addToCart(productId1, 1); // 1 Laptop
        ecommerce.addToCart(productId2, 2); // 2 Mice

        // 2. Check cart total
        uint256 expectedTotal = 1000000000 + (50000000 * 2); // 1100 EURT
        uint256 cartTotal = ecommerce.calculateTotal(customer1);
        assertEq(cartTotal, expectedTotal);

        // 3. Create invoice
        vm.stopPrank();
        uint256 invoiceId = ecommerce.createInvoice(customer1, companyId1);

        Ecommerce.Invoice memory invoice = ecommerce.getInvoice(invoiceId);
        assertEq(invoice.customerAddress, customer1);
        assertEq(invoice.companyId, companyId1);
        assertEq(invoice.totalAmount, expectedTotal);
        assertFalse(invoice.isPaid);

        // 4. Customer approves payment
        vm.startPrank(customer1);
        euroToken.approve(address(ecommerce), expectedTotal);

        // 5. Process payment
        bool success = ecommerce.processPayment(
            customer1,
            expectedTotal,
            invoiceId
        );
        assertTrue(success);
        vm.stopPrank();

        // 6. Verify invoice is paid
        invoice = ecommerce.getInvoice(invoiceId);
        assertTrue(invoice.isPaid);

        // 7. Verify stock was decreased
        ProductLib.Product memory laptop = ecommerce.getProduct(productId1);
        ProductLib.Product memory mouse = ecommerce.getProduct(productId2);
        assertEq(laptop.stock, 9);
        assertEq(mouse.stock, 98);

        // 8. Verify funds are held in Escrow contract balance
        assertEq(euroToken.balanceOf(address(ecommerce)), expectedTotal);
        assertEq(euroToken.balanceOf(company1), 0);

        // 9. Verify customer balance decreased
        uint256 customerBalance = euroToken.balanceOf(customer1);
        assertEq(customerBalance, 5000000000 - expectedTotal);

        // 10. Ship order and confirm delivery to release Escrow funds
        vm.prank(company1);
        ecommerce.shipOrder(invoiceId, "DHL-12345");

        vm.prank(customer1);
        ecommerce.confirmDelivery(invoiceId);

        // 11. Verify company received released Escrow funds
        assertEq(euroToken.balanceOf(company1), expectedTotal);
    }

    function test_MultipleCompaniesFlow() public {
        // Register second company
        address company2 = makeAddr("company2");
        uint256 companyId2 = ecommerce.registerCompany(
            company2,
            "Book Store",
            "Books"
        );

        // Add product from company2
        vm.startPrank(company2);
        uint256 bookId = ecommerce.addProduct(
            companyId2,
            "Book",
            "Programming book",
            30000000, // 30 EURT
            "QmBook",
            50
        );
        vm.stopPrank();

        // Customer adds items from both companies
        vm.startPrank(customer1);
        ecommerce.addToCart(productId1, 1); // Company 1: Laptop
        ecommerce.addToCart(bookId, 1);     // Company 2: Book
        vm.stopPrank();

        // Create invoices for each company
        uint256 invoice1 = ecommerce.createInvoice(customer1, companyId1);
        uint256 invoice2 = ecommerce.createInvoice(customer1, companyId2);

        Ecommerce.Invoice memory inv1 = ecommerce.getInvoice(invoice1);
        Ecommerce.Invoice memory inv2 = ecommerce.getInvoice(invoice2);

        assertEq(inv1.totalAmount, 1000000000); // Laptop only
        assertEq(inv2.totalAmount, 30000000);   // Book only

        // Pay both invoices
        vm.startPrank(customer1);
        euroToken.approve(address(ecommerce), 5000000000);

        ecommerce.processPayment(customer1, inv1.totalAmount, invoice1);
        ecommerce.processPayment(customer1, inv2.totalAmount, invoice2);
        vm.stopPrank();

        // Verify Escrow holds total payment
        assertEq(euroToken.balanceOf(address(ecommerce)), 1000000000 + 30000000);
        assertEq(euroToken.balanceOf(company1), 0);
        assertEq(euroToken.balanceOf(company2), 0);

        // Ship and confirm delivery for both invoices
        vm.prank(company1);
        ecommerce.shipOrder(invoice1, "DHL-001");
        vm.prank(company2);
        ecommerce.shipOrder(invoice2, "FEDEX-002");

        vm.startPrank(customer1);
        ecommerce.confirmDelivery(invoice1);
        ecommerce.confirmDelivery(invoice2);
        vm.stopPrank();

        // Verify both companies received their released Escrow payments
        assertEq(euroToken.balanceOf(company1), 1000000000);
        assertEq(euroToken.balanceOf(company2), 30000000);
    }

    function test_CheckoutMultiCompanySingleTx() public {
        address company2 = makeAddr("company2");
        uint256 comp2Id = ecommerce.registerCompany(company2, "Cloud Services", "Cloud consulting");

        vm.startPrank(company2);
        uint256 prod2Id = ecommerce.addProduct(comp2Id, "Cloud Hosting", "Monthly hosting", 30000000, "QmCloud", 10);
        vm.stopPrank();

        uint256[] memory companyIds = new uint256[](2);
        companyIds[0] = companyId1;
        companyIds[1] = comp2Id;

        uint256[] memory productIds = new uint256[](2);
        productIds[0] = productId1; // 1000 EURT (Company 1)
        productIds[1] = prod2Id;    // 30 EURT (Company 2)

        uint256[] memory quantities = new uint256[](2);
        quantities[0] = 1;
        quantities[1] = 1;

        uint256 totalPayment = 1030000000; // 1030 EURT

        vm.startPrank(customer1);
        euroToken.approve(address(ecommerce), totalPayment);

        uint256[] memory borderInvoices = ecommerce.checkoutMultiCompany(companyIds, productIds, quantities);
        vm.stopPrank();

        assertEq(borderInvoices.length, 2);
        assertEq(euroToken.balanceOf(address(ecommerce)), totalPayment); // Custody Escrow

        // Verify company 1 order
        uint256 inv1 = borderInvoices[0];
        assertEq(uint256(ecommerce.getInvoice(inv1).status), 1); // Paid
        assertEq(ecommerce.getInvoice(inv1).totalAmount, 1000000000);

        // Verify company 2 order
        uint256 inv2 = borderInvoices[1];
        assertEq(uint256(ecommerce.getInvoice(inv2).status), 1); // Paid
        assertEq(ecommerce.getInvoice(inv2).totalAmount, 30000000);
    }

    function test_InsufficientBalanceFailure() public {
        address poorCustomer = makeAddr("poorCustomer");
        euroToken.mint(poorCustomer, 10000000); // Only 10 EURT

        vm.startPrank(poorCustomer);
        ecommerce.addToCart(productId1, 1); // 1000 EURT laptop
        vm.stopPrank();

        uint256 invoiceId = ecommerce.createInvoice(poorCustomer, companyId1);

        vm.startPrank(poorCustomer);
        euroToken.approve(address(ecommerce), 1000000000);
        vm.stopPrank();

        vm.expectRevert("Insufficient balance");
        ecommerce.processPayment(poorCustomer, 1000000000, invoiceId);
    }

    function test_StockValidation() public {
        // Try to buy more than available
        vm.startPrank(customer1);

        // First purchase reduces stock to 9
        ecommerce.addToCart(productId1, 1);
        vm.stopPrank();

        uint256 invoice1 = ecommerce.createInvoice(customer1, companyId1);

        vm.startPrank(customer1);
        euroToken.approve(address(ecommerce), 1000000000);
        ecommerce.processPayment(customer1, 1000000000, invoice1);

        // Clear cart and try to add 10 (but only 9 available)
        ecommerce.clearCart(customer1);
        vm.stopPrank();

        vm.prank(customer1);
        vm.expectRevert("Insufficient stock");
        ecommerce.addToCart(productId1, 10);
    }

    function test_GetInvoiceItems() public {
        vm.startPrank(customer1);
        ecommerce.addToCart(productId1, 1);
        ecommerce.addToCart(productId2, 2);
        vm.stopPrank();

        uint256 invoiceId = ecommerce.createInvoice(customer1, companyId1);

        Ecommerce.InvoiceItem[] memory items = ecommerce.getInvoiceItems(invoiceId);
        assertEq(items.length, 2);
        assertEq(items[0].productName, "Laptop");
        assertEq(items[0].quantity, 1);
        assertEq(items[1].productName, "Mouse");
        assertEq(items[1].quantity, 2);
    }

    function test_CustomerInvoiceHistory() public {
        // Make multiple purchases
        vm.startPrank(customer1);
        ecommerce.addToCart(productId1, 1);
        vm.stopPrank();

        uint256 invoice1 = ecommerce.createInvoice(customer1, companyId1);

        vm.startPrank(customer1);
        euroToken.approve(address(ecommerce), 1000000000);
        ecommerce.processPayment(customer1, 1000000000, invoice1);
        ecommerce.clearCart(customer1);

        ecommerce.addToCart(productId2, 1);
        vm.stopPrank();

        uint256 invoice2 = ecommerce.createInvoice(customer1, companyId1);

        Ecommerce.Invoice[] memory invoices = ecommerce.getCustomerInvoices(customer1);
        assertEq(invoices.length, 2);
        assertTrue(invoices[0].isPaid);
        assertFalse(invoices[1].isPaid);
    }
}
