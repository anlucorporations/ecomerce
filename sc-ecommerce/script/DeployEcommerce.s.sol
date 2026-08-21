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

        address euroToken = vm.envOr("EURO_TOKEN_ADDRESS", address(0));

        vm.startBroadcast(ownerPrivateKey);

        if (euroToken == address(0)) {
            euroToken = address(new MockEuroToken());
            console.log("MockEuroToken deployed at:", euroToken);
        } else {
            console.log("Using existing EuroToken at:", euroToken);
        }

        Ecommerce ecommerce = new Ecommerce(euroToken);
        console.log("Ecommerce deployed at:", address(ecommerce));

        vm.stopBroadcast();
    }
}
