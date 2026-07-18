// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Ecommerce} from "../src/Ecommerce.sol";

contract DeployEcommerceScript is Script {
    function setUp() public {}

    function run() public {
        // Get EURO_TOKEN_ADDRESS from environment or use default
        address euroTokenAddress = vm.envOr("EURO_TOKEN_ADDRESS", address(0x5FbDB2315678afecb367f032d93F642f64180aa3));
        require(euroTokenAddress != address(0), "EURO_TOKEN_ADDRESS not set");

        vm.startBroadcast();

        Ecommerce ecommerce = new Ecommerce(euroTokenAddress);

        console.log("Ecommerce deployed at:", address(ecommerce));
        console.log("Owner:", ecommerce.owner());
        console.log("EuroToken:", ecommerce.euroTokenAddress());

        vm.stopBroadcast();
    }
}
