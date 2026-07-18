// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {EuroToken} from "../src/EuroToken.sol";

contract DeployEuroToken is Script {
    EuroToken public euroToken;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy EuroToken with deployer as initial owner
        euroToken = new EuroToken(msg.sender);

        console.log("EuroToken deployed at:", address(euroToken));
        console.log("Owner:", euroToken.owner());
        console.log("Total Supply:", euroToken.totalSupply());
        console.log("Name:", euroToken.name());
        console.log("Symbol:", euroToken.symbol());
        console.log("Decimals:", euroToken.decimals());

        vm.stopBroadcast();
    }
}