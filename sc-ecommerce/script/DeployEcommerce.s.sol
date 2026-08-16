// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {MockEuroToken} from "../test/mocks/MockEuroToken.sol";

contract DeployEcommerceScript is Script {
    function setUp() public {}

    function run() public {
        uint256 ownerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));

        vm.startBroadcast(ownerPrivateKey);

        MockEuroToken mockEuroToken = new MockEuroToken();
        Ecommerce ecommerce = new Ecommerce(address(mockEuroToken));

        console.log("MockEuroToken deployed at:", address(mockEuroToken));
        console.log("Ecommerce deployed at:", address(ecommerce));

        vm.stopBroadcast();
    }
}
