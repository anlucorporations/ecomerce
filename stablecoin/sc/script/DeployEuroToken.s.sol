// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {EuroTokenOptimized} from "../src/EuroTokenOptimized.sol";

contract DeployEuroToken is Script {
    EuroTokenOptimized public euroToken;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        // Deploy EuroTokenOptimized with deployer as initial owner and minter
        euroToken = new EuroTokenOptimized(deployer, deployer);

        console.log("EuroToken deployed at:", address(euroToken));
        console.log("Name:", euroToken.name());
        console.log("Symbol:", euroToken.symbol());
        console.log("Decimals:", euroToken.decimals());

        vm.stopBroadcast();
    }
}