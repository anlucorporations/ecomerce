// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {MockEuroToken} from "./mocks/MockEuroToken.sol";

contract EscrowSecurityTest is Test {
    Ecommerce public ecommerce;
    MockEuroToken public euroToken;

    address public companyOwner = makeAddr("companyOwner");
    address public customer = makeAddr("customer");

    uint256 public companyId;
    uint256 public productId;
    uint256 public itemPrice = 250000000; // 250 EURT

    function setUp() public {
        euroToken = new MockEuroToken();
        ecommerce = new Ecommerce(address(euroToken));

        // 1. Register company
        companyId = ecommerce.registerCompany(companyOwner, "Empresa BarloVentas", "Tienda Oficial");

        // 2. Add product
        vm.prank(companyOwner);
        productId = ecommerce.addProduct(companyId, "Camisa Algodon", "Camisa 100% Algodon", itemPrice, "QmHashCamisa", 20);

        // 3. Mint tokens to customer
        euroToken.mint(customer, 1000000000); // 1000 EURT
    }

    function test_EscrowCustodyAndReleaseFlow() public {
        // Customer adds item to cart & creates invoice
        vm.startPrank(customer);
        ecommerce.addToCart(productId, 2); // 2 * 250 = 500 EURT
        uint256 invoiceId = ecommerce.createInvoice(customer, companyId);
        uint256 totalAmount = 500000000;

        // Approve and process payment
        euroToken.approve(address(ecommerce), totalAmount);
        bool paid = ecommerce.processPayment(customer, totalAmount, invoiceId);
        assertTrue(paid);
        vm.stopPrank();

        // CHECK 1: Invoice status is Paid (1)
        Ecommerce.Invoice memory inv = ecommerce.getInvoice(invoiceId);
        assertTrue(inv.isPaid);
        assertEq(uint8(inv.status), 1); // 1 = Paid

        // CHECK 2: Custody On-Chain (Contract holds funds, Company has 0)
        assertEq(euroToken.balanceOf(address(ecommerce)), totalAmount);
        assertEq(euroToken.balanceOf(companyOwner), 0);

        // Merchant ships order with tracking ID
        vm.prank(companyOwner);
        ecommerce.shipOrder(invoiceId, "MRW-99887766");

        // CHECK 3: Order status is Shipped (2)
        inv = ecommerce.getInvoice(invoiceId);
        assertEq(uint8(inv.status), 2); // 2 = Shipped

        // Customer confirms delivery
        vm.prank(customer);
        ecommerce.confirmDelivery(invoiceId);

        // CHECK 4: Order status is Delivered (3) and funds released to Merchant
        inv = ecommerce.getInvoice(invoiceId);
        assertEq(uint8(inv.status), 3); // 3 = Delivered
        assertEq(euroToken.balanceOf(address(ecommerce)), 0);
        assertEq(euroToken.balanceOf(companyOwner), totalAmount);
    }

    function test_CompanyRatingSystem() public {
        // First make a verified purchase so customer has a paid invoice
        vm.startPrank(customer);
        ecommerce.addToCart(productId, 1);
        uint256 invoiceId = ecommerce.createInvoice(customer, companyId);
        euroToken.approve(address(ecommerce), itemPrice);
        ecommerce.processPayment(customer, itemPrice, invoiceId);

        // Customer rates company
        ecommerce.rateCompany(companyId, 5, "Excelente atencion y despacho rapido");
        vm.stopPrank();

        // Retrieve reviews
        Ecommerce.Rating[] memory reviews = ecommerce.getCompanyReviews(companyId);
        assertEq(reviews.length, 1);
        assertEq(reviews[0].reviewer, customer);
        assertEq(reviews[0].rating, 5);
        assertEq(reviews[0].comment, "Excelente atencion y despacho rapido");
    }
}
