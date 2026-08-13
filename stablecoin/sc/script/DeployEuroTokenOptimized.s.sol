// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {EuroTokenOptimized} from "../src/EuroTokenOptimized.sol";

contract DeployEuroTokenOptimized is Script {
    EuroTokenOptimized public euroToken;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        address admin = msg.sender;
        // Grant Minter Role to deployer / relayer
        euroToken = new EuroTokenOptimized(admin, admin);

        console.log("EuroTokenOptimized deployed at:", address(euroToken));
        console.log("Admin:", admin);
        console.log("Decimals:", euroToken.decimals());
        console.log("Name:", euroToken.name());
        console.log("Symbol:", euroToken.symbol());

        vm.stopBroadcast();
    }
}
