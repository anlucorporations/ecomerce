// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Ecommerce} from "../src/Ecommerce.sol";

contract DeployEcommerceScript is Script {
    function setUp() public {}

    function run() public {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        require(ownerPrivateKey != 0, "Deployer PRIVATE_KEY environment variable required");

        // C1: EURO_TOKEN_ADDRESS es OBLIGATORIO — nunca desplegar MockEuroToken fuera de tests
        address euroToken = vm.envOr("EURO_TOKEN_ADDRESS", address(0));
        require(euroToken != address(0), "EURO_TOKEN_ADDRESS environment variable required (EuroTokenOptimized desplegado)");

        vm.startBroadcast(ownerPrivateKey);

        Ecommerce ecommerce = new Ecommerce(euroToken);
        console.log("Ecommerce deployed at:", address(ecommerce));
        console.log("EuroToken (wired):", euroToken);

        vm.stopBroadcast();
    }
}
