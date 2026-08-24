// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {CompanyLib} from "../src/libraries/CompanyLib.sol";
import {MockEuroToken} from "./mocks/MockEuroToken.sol";
import {ProductLib} from "../src/libraries/ProductLib.sol";

/**
 * Tests de remediación (auditoría INFORME_AUDITORIA_PROFUNDA.md)
 * Cubren: C2 decreaseStock auth, C3 dedupe checkoutMultiCompany, C4 ETH atrapado,
 * C5 cancelación/reembolso y disputa desde Paid, A1 consumo de carrito,
 * A2 pago de factura ajena, A3 isActive, M3 tarifa exacta, M4 dedupe de ratings.
 */
contract SecurityRemediationTest is Test {
    Ecommerce public ecommerce;
    MockEuroToken public euroToken;

    address public companyOwner = makeAddr("companyOwner");
    address public customer = makeAddr("customer");
    address public attacker = makeAddr("attacker");

    uint256 public companyId;
    uint256 public productId;
    uint256 public itemPrice = 250000000; // 250 EURT

    // Permite al contrato de test recibir ETH (owner en estos tests)
    receive() external payable {}

    function setUp() public {
        euroToken = new MockEuroToken();
        ecommerce = new Ecommerce(address(euroToken));

        companyId = ecommerce.registerCompany(companyOwner, "Empresa BarloVentas", "Tienda Oficial");

        vm.prank(companyOwner);
        productId = ecommerce.addProduct(companyId, "Camisa Algodon", "Camisa 100% Algodon", itemPrice, "QmHashCamisa", 20);

        euroToken.mint(customer, 1000000000); // 1000 EURT
    }

    // ---------- C2: decreaseStock con control de acceso ----------
    function test_C2_DecreaseStockRejectedForNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert("Only company owner can decrease stock");
        ecommerce.decreaseStock(productId, 1);
    }

    function test_C2_DecreaseStockAllowedForCompanyOwner() public {
        vm.prank(companyOwner);
        ecommerce.decreaseStock(productId, 5);
        assertEq(ecommerce.getProduct(productId).stock, 15);
    }

    // ---------- C3: dedupe en checkoutMultiCompany ----------
    function test_C3_CheckoutMultiCompanyDuplicateCompanyReverts() public {
        uint256[] memory companyIds = new uint256[](2);
        companyIds[0] = companyId;
        companyIds[1] = companyId; // duplicado

        uint256[] memory productIds = new uint256[](1);
        productIds[0] = productId;

        uint256[] memory quantities = new uint256[](1);
        quantities[0] = 1;

        vm.startPrank(customer);
        euroToken.approve(address(ecommerce), 1000000000);
        vm.expectRevert("Duplicate company id");
        ecommerce.checkoutMultiCompany(companyIds, productIds, quantities);
        vm.stopPrank();
    }

    function test_C3_CheckoutMultiCompanyDuplicateProductReverts() public {
        uint256[] memory companyIds = new uint256[](1);
        companyIds[0] = companyId;

        uint256[] memory productIds = new uint256[](2);
        productIds[0] = productId;
        productIds[1] = productId; // duplicado

        uint256[] memory quantities = new uint256[](2);
        quantities[0] = 1;
        quantities[1] = 1;

        vm.startPrank(customer);
        euroToken.approve(address(ecommerce), 1000000000);
        vm.expectRevert("Duplicate product id");
        ecommerce.checkoutMultiCompany(companyIds, productIds, quantities);
        vm.stopPrank();
    }

    // ---------- C4: ETH atrapado en registerCustomerSelf ----------
    function test_C4_RegisterCustomerSelfRejectsEth() public {
        vm.deal(customer, 10 ether);
        vm.prank(customer);
        vm.expectRevert("Customer registration is free; do not send ETH");
        ecommerce.registerCustomerSelf{value: 3 ether}("Cliente", "cliente@mail.com", "Calle 1");
    }

    function test_C4_RegisterCustomerSelfWithoutEthOk() public {
        vm.prank(customer);
        ecommerce.registerCustomerSelf("Cliente", "cliente@mail.com", "Calle 1");
        assertTrue(ecommerce.isCustomerRegistered(customer));
    }

    function test_C4_WithdrawETH() public {
        // Simular ETH mal dirigido al contrato (el contrato no tiene receive, se fuerza el saldo)
        vm.deal(address(ecommerce), 1 ether);
        assertEq(address(ecommerce).balance, 1 ether);

        uint256 ownerBalanceBefore = address(this).balance;
        ecommerce.withdrawETH();
        assertEq(address(ecommerce).balance, 0);
        assertEq(address(this).balance, ownerBalanceBefore + 1 ether);
    }

    function test_C4_RescueToken() public {
        euroToken.mint(address(ecommerce), 500000000); // 500 EURT mal dirigidos
        ecommerce.rescueToken(address(euroToken), 500000000);
        assertEq(euroToken.balanceOf(address(this)), 500000000);
        assertEq(euroToken.balanceOf(address(ecommerce)), 0);
    }

    // ---------- C5: cancelación y reembolso ----------
    function _createAndPayInvoice() internal returns (uint256) {
        vm.startPrank(customer);
        ecommerce.addToCart(productId, 2); // 2 * 250 = 500 EURT
        uint256 invoiceId = ecommerce.createInvoice(customer, companyId);
        euroToken.approve(address(ecommerce), 500000000);
        ecommerce.processPayment(customer, 500000000, invoiceId);
        vm.stopPrank();
        return invoiceId;
    }

    function test_C5_CancelOrderRefundsBuyer() public {
        uint256 invoiceId = _createAndPayInvoice();
        assertEq(euroToken.balanceOf(address(ecommerce)), 500000000);

        vm.prank(customer);
        ecommerce.cancelOrder(invoiceId);

        Ecommerce.Invoice memory inv = ecommerce.getInvoice(invoiceId);
        assertEq(uint8(inv.status), 5); // Cancelled
        assertFalse(inv.isPaid);
        assertEq(euroToken.balanceOf(address(ecommerce)), 0);
        assertEq(euroToken.balanceOf(customer), 1000000000); // reembolsado
    }

    function test_C5_CancelShippedOrderReverts() public {
        uint256 invoiceId = _createAndPayInvoice();
        vm.prank(companyOwner);
        ecommerce.shipOrder(invoiceId, "TRACK-1");

        vm.prank(customer);
        vm.expectRevert("Only paid orders not yet shipped can be cancelled");
        ecommerce.cancelOrder(invoiceId);
    }

    function test_C5_DisputeFromPaidRefundsBuyer() public {
        uint256 invoiceId = _createAndPayInvoice();

        // El comerciante nunca envía; el owner resuelve la disputa desde Paid -> reembolso al cliente
        ecommerce.resolveDisputeReleaseEscrow(invoiceId);

        Ecommerce.Invoice memory inv = ecommerce.getInvoice(invoiceId);
        assertEq(uint8(inv.status), 5); // Cancelled
        assertEq(euroToken.balanceOf(customer), 1000000000);
        assertEq(euroToken.balanceOf(address(ecommerce)), 0);
    }

    function test_C5_DisputeFromShippedReleasesToMerchant() public {
        uint256 invoiceId = _createAndPayInvoice();
        vm.prank(companyOwner);
        ecommerce.shipOrder(invoiceId, "TRACK-1");

        ecommerce.resolveDisputeReleaseEscrow(invoiceId);

        assertEq(euroToken.balanceOf(companyOwner), 500000000);
        assertEq(euroToken.balanceOf(address(ecommerce)), 0);
    }

    // ---------- A1: createInvoice consume el carrito ----------
    function test_A1_CreateInvoiceConsumesCart() public {
        vm.prank(customer);
        ecommerce.addToCart(productId, 2);

        vm.prank(customer);
        uint256 invoiceId = ecommerce.createInvoice(customer, companyId);
        assertTrue(invoiceId > 0);

        // El carrito quedó vacío: no se puede crear una segunda factura del mismo carrito
        vm.prank(customer);
        vm.expectRevert("Cart is empty");
        ecommerce.createInvoice(customer, companyId);
    }

    // ---------- A2: processPayment solo del titular de la factura ----------
    function test_A2_CannotPayOtherCustomersInvoice() public {
        vm.startPrank(customer);
        ecommerce.addToCart(productId, 1);
        uint256 invoiceId = ecommerce.createInvoice(customer, companyId);
        euroToken.approve(address(ecommerce), 1000000000);
        vm.stopPrank();

        // Atacante intenta pagar la factura del cliente
        euroToken.mint(attacker, 1000000000);
        vm.startPrank(attacker);
        euroToken.approve(address(ecommerce), 1000000000);
        vm.expectRevert("Not invoice customer");
        ecommerce.processPayment(attacker, itemPrice, invoiceId);
        vm.stopPrank();
    }

    // ---------- A3: checkoutMultiCompany valida isActive ----------
    function test_A3_InactiveProductReverts() public {
        vm.prank(companyOwner);
        ecommerce.deactivateProduct(productId);

        uint256[] memory companyIds = new uint256[](1);
        companyIds[0] = companyId;
        uint256[] memory productIds = new uint256[](1);
        productIds[0] = productId;
        uint256[] memory quantities = new uint256[](1);
        quantities[0] = 1;

        vm.startPrank(customer);
        euroToken.approve(address(ecommerce), 1000000000);
        vm.expectRevert("Product not active");
        ecommerce.checkoutMultiCompany(companyIds, productIds, quantities);
        vm.stopPrank();
    }

    // ---------- M3: registerCompanySelf transfiere exactamente la tarifa ----------
    function test_M3_RegisterCompanyExactFeeAndRefund() public {
        address newCompany = makeAddr("newCompany");
        vm.deal(newCompany, 10 ether);
        uint256 balanceBefore = address(this).balance;

        vm.prank(newCompany);
        uint256 newCompanyId = ecommerce.registerCompanySelf{value: 5 ether}("Nueva Empresa", "Desc", CompanyLib.BusinessType(0));

        // El owner recibe exactamente 3 ETH, el exceso (2 ETH) vuelve al remitente
        // newCompany: 10 (deal) - 5 (enviado) + 2 (reembolso) = 7 ETH
        assertEq(address(this).balance, balanceBefore + 3 ether);
        assertEq(newCompany.balance, 7 ether);
        assertTrue(newCompanyId > 0);
    }

    // ---------- M4: rating dedupe por cliente ----------
    function test_M4_RateCompanyOncePerCustomer() public {
        vm.startPrank(customer);
        ecommerce.addToCart(productId, 1);
        uint256 invoiceId = ecommerce.createInvoice(customer, companyId);
        euroToken.approve(address(ecommerce), itemPrice);
        ecommerce.processPayment(customer, itemPrice, invoiceId);

        ecommerce.rateCompany(companyId, 5, "Excelente");
        vm.expectRevert("Already rated this company");
        ecommerce.rateCompany(companyId, 4, "Segunda vez");
        vm.stopPrank();
    }

    // ---------- A4: registro de tx hash real ----------
    function test_A4_RecordPaymentTxHash() public {
        uint256 invoiceId = _createAndPayInvoice();

        ecommerce.recordPaymentTxHash(invoiceId, "0xabc123");

        Ecommerce.Invoice memory inv = ecommerce.getInvoice(invoiceId);
        assertEq(inv.paymentTxHash, "0xabc123");
    }
}
