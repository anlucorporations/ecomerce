// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {EuroTokenOptimized} from "../src/EuroTokenOptimized.sol";

contract EuroTokenOptimizedTest is Test {
    EuroTokenOptimized public token;

    address public admin = makeAddr("admin");
    address public minter = makeAddr("minter");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");

    function setUp() public {
        vm.startPrank(admin);
        token = new EuroTokenOptimized(admin, minter);
        vm.stopPrank();
    }

    function test_DecimalsAndMetadata() public view {
        assertEq(token.decimals(), 6);
        assertEq(token.name(), "EuroToken");
        assertEq(token.symbol(), "EURT");
    }

    function test_MintByMinter() public {
        vm.prank(minter);
        token.mint(user1, 500000000); // 500 EURT

        assertEq(token.balanceOf(user1), 500000000);
    }

    function test_RevertWhen_MintByUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert();
        token.mint(user1, 100000000);
    }

    function test_BurnTokens() public {
        vm.prank(minter);
        token.mint(user1, 200000000); // 200 EURT

        vm.prank(user1);
        token.burn(50000000); // Burn 50 EURT

        assertEq(token.balanceOf(user1), 150000000);
    }

    function test_PauseAndUnpause() public {
        vm.prank(admin);
        token.pause();

        vm.prank(minter);
        vm.expectRevert();
        token.mint(user1, 100000000);

        vm.prank(admin);
        token.unpause();

        vm.prank(minter);
        token.mint(user1, 100000000);
        assertEq(token.balanceOf(user1), 100000000);
    }
}
