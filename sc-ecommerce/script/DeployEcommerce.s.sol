// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {MockEuroToken} from "../test/mocks/MockEuroToken.sol";

contract DeployEcommerceScript is Script {
    function setUp() public {}

    function run() public {
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        require(ownerPrivateKey != 0, "Deployer PRIVATE_KEY environment variable required");

        vm.startBroadcast(ownerPrivateKey);

        MockEuroToken mockEuroToken = new MockEuroToken();
        Ecommerce ecommerce = new Ecommerce(address(mockEuroToken));

        console.log("MockEuroToken deployed at:", address(mockEuroToken));
        console.log("Ecommerce deployed at:", address(ecommerce));

        vm.stopBroadcast();
    }
}
