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

        // Owner Account #0 Private Key (Deployer, Super Admin & Relayer)
        uint256 ownerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address ownerAddr = vm.addr(ownerPrivateKey);

        // 1. Deploy Contract as Owner Account #0
        vm.startBroadcast(ownerPrivateKey);

        Ecommerce ecommerce = new Ecommerce(euroTokenAddress);

        console.log("Ecommerce deployed at:", address(ecommerce));
        console.log("Owner Account #0:", ecommerce.owner());
        console.log("EuroToken:", ecommerce.euroTokenAddress());

        // 2. ONLY Owner Account #0 self-registers as Company #1 paying 3.0 ETH registration fee
        uint256 companyId = ecommerce.registerCompanySelf{value: 3 ether}(
            "Super Owner Enterprise",
            "Empresa Principal del Administrador del Sistema E-Commerce",
            CompanyLib.BusinessType.ProductSales
        );

        // 3. Owner Account #0 adds initial product (10 EURT)
        uint256 initialPrice = 10_000_000; // 10 EURT
        ecommerce.addProduct(
            companyId,
            "Licencia Software E-Commerce Pro",
            "Licencia inicial oficial de plataforma con soporte premium",
            initialPrice,
            "QmHashInitialProduct10EURT",
            50
        );

        // 4. Owner Account #0 self-registers as Customer sending 3.0 ETH deposit for full web-customer access
        ecommerce.registerCustomerSelf{value: 3 ether}(
            "Super Owner Admin",
            "owner@mastercodecrypto.com",
            "Sede Central E-Commerce, Madrid"
        );

        // Mint initial 1,000 EURT to Owner Account #0 for relayer / demo liquidity
        IEuroToken(euroTokenAddress).mint(ownerAddr, 1000_000_000);

        vm.stopBroadcast();
    }
}
