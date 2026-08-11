// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {CompanyLib} from "../src/libraries/CompanyLib.sol";

interface IEuroToken {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
}

contract DeployEcommerceScript is Script {
    function setUp() public {}

    function run() public {
        // EuroToken default deployed address at 0x5FbDB2315678afecb367f032d93F642f64180aa3
        address euroTokenAddress = vm.envOr("EURO_TOKEN_ADDRESS", address(0x5FbDB2315678afecb367f032d93F642f64180aa3));

        // Owner Account #0 Private Key
        uint256 ownerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));

        // Buyer Account #1 Private Key
        uint256 buyerPrivateKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
        address buyerAddr = vm.addr(buyerPrivateKey);

        // 1. Deploy Contract as Owner
        vm.startBroadcast(ownerPrivateKey);

        Ecommerce ecommerce = new Ecommerce(euroTokenAddress);

        console.log("Ecommerce deployed at:", address(ecommerce));
        console.log("Owner:", ecommerce.owner());
        console.log("EuroToken:", ecommerce.euroTokenAddress());

        // 2. Owner self-registers as Company #1 paying 3.0 ETH registration fee
        uint256 companyId = ecommerce.registerCompanySelf{value: 3 ether}(
            "Super Owner Enterprise",
            "Empresa Principal del Administrador del Sistema E-Commerce",
            CompanyLib.BusinessType.ProductSales
        );

        // 3. Owner adds initial product priced at 10 EURT (10,000,000 base units with 6 decimals)
        uint256 initialPrice = 10_000_000; // 10 EURT
        uint256 productId = ecommerce.addProduct(
            companyId,
            "Licencia Software E-Commerce Pro",
            "Licencia inicial oficial de plataforma con soporte premium",
            initialPrice,
            "QmHashInitialProduct10EURT",
            50
        );

        // Mint 10 EURT to buyer address for the initial purchase
        IEuroToken(euroTokenAddress).mint(buyerAddr, initialPrice);

        vm.stopBroadcast();

        // 4. Buyer executes initial purchase of 10 EURT
        vm.startBroadcast(buyerPrivateKey);

        // Register Buyer as Customer
        ecommerce.registerCustomerSelf(
            "Cliente Inicial Demo",
            "cliente.inicial@mastercodecrypto.com",
            "Av. Central #100, Madrid"
        );

        // Add 1 unit of product #1 (10 EURT) to cart
        ecommerce.addToCart(productId, 1);

        // Create Invoice for Company #1
        uint256 invoiceId = ecommerce.createInvoice(buyerAddr, companyId);

        // Approve EuroTokens for Ecommerce contract
        IEuroToken(euroTokenAddress).approve(address(ecommerce), initialPrice);

        // Process 10 EURT Payment for Invoice
        bool paymentSuccess = ecommerce.processPayment(buyerAddr, initialPrice, invoiceId);
        require(paymentSuccess, "Initial payment failed");

        vm.stopBroadcast();
    }
}
