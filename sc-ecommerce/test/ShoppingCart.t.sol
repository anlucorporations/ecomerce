// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {ShoppingCartLib} from "../src/libraries/ShoppingCartLib.sol";
import {MockEuroToken} from "./mocks/MockEuroToken.sol";

contract ShoppingCartTest is Test {
    Ecommerce public ecommerce;
    MockEuroToken public euroToken;

    address public owner;
    address public company1;
    address public customer1;
    address public customer2;
    uint256 public companyId1;
    uint256 public productId1;
    uint256 public productId2;

    function setUp() public {
        owner = address(this);
        company1 = makeAddr("company1");
        customer1 = makeAddr("customer1");
        customer2 = makeAddr("customer2");

        euroToken = new MockEuroToken();
        ecommerce = new Ecommerce(address(euroToken));

        companyId1 = ecommerce.registerCompany(company1, "Company One", "Desc");

        vm.startPrank(company1);
        productId1 = ecommerce.addProduct(companyId1, "Product 1", "Desc", 1000000, "QmHash", 100);
        productId2 = ecommerce.addProduct(companyId1, "Product 2", "Desc", 2000000, "QmHash", 50);
        vm.stopPrank();
    }

    function test_AddToCart() public {
        vm.prank(customer1);
        ecommerce.addToCart(productId1, 5);

        ShoppingCartLib.CartItem[] memory items = ecommerce.getCart(customer1);
        assertEq(items.length, 1);
        assertEq(items[0].productId, productId1);
        assertEq(items[0].quantity, 5);
        assertEq(items[0].unitPrice, 1000000);
    }

    function test_AddSameProductTwice() public {
        vm.startPrank(customer1);
        ecommerce.addToCart(productId1, 5);
        ecommerce.addToCart(productId1, 3);
        vm.stopPrank();

        ShoppingCartLib.CartItem[] memory items = ecommerce.getCart(customer1);
        assertEq(items.length, 1);
        assertEq(items[0].quantity, 8);
    }

    function test_RemoveFromCart() public {
        vm.startPrank(customer1);
        ecommerce.addToCart(productId1, 5);
        ecommerce.removeFromCart(productId1);
        vm.stopPrank();

        ShoppingCartLib.CartItem[] memory items = ecommerce.getCart(customer1);
        assertEq(items.length, 0);
    }

    function test_UpdateQuantity() public {
        vm.startPrank(customer1);
        ecommerce.addToCart(productId1, 5);
        ecommerce.updateQuantity(productId1, 10);
        vm.stopPrank();

        ShoppingCartLib.CartItem[] memory items = ecommerce.getCart(customer1);
        assertEq(items[0].quantity, 10);
    }

    function test_CalculateTotal() public {
        vm.startPrank(customer1);
        ecommerce.addToCart(productId1, 2); // 2 * 1000000 = 2000000
        ecommerce.addToCart(productId2, 3); // 3 * 2000000 = 6000000
        vm.stopPrank();

        uint256 total = ecommerce.calculateTotal(customer1);
        assertEq(total, 8000000);
    }

    function test_ClearCart() public {
        vm.startPrank(customer1);
        ecommerce.addToCart(productId1, 5);
        ecommerce.addToCart(productId2, 3);
        vm.stopPrank();

        ecommerce.clearCart(customer1);

        ShoppingCartLib.CartItem[] memory items = ecommerce.getCart(customer1);
        assertEq(items.length, 0);
    }

    function test_GetCartItemCount() public {
        vm.startPrank(customer1);
        ecommerce.addToCart(productId1, 5);
        ecommerce.addToCart(productId2, 3);
        vm.stopPrank();

        uint256 count = ecommerce.getCartItemCount(customer1);
        assertEq(count, 2);
    }

    function test_MultipleCustomerCarts() public {
        vm.prank(customer1);
        ecommerce.addToCart(productId1, 5);

        vm.prank(customer2);
        ecommerce.addToCart(productId2, 3);

        ShoppingCartLib.CartItem[] memory items1 = ecommerce.getCart(customer1);
        ShoppingCartLib.CartItem[] memory items2 = ecommerce.getCart(customer2);

        assertEq(items1.length, 1);
        assertEq(items2.length, 1);
        assertEq(items1[0].productId, productId1);
        assertEq(items2[0].productId, productId2);
    }

    function test_RevertWhen_AddToCartInsufficientStock() public {
        vm.prank(customer1);
        vm.expectRevert("Insufficient stock");
        ecommerce.addToCart(productId1, 101);
    }

    function test_RevertWhen_AddToCartZeroQuantity() public {
        vm.prank(customer1);
        vm.expectRevert("Quantity must be > 0");
        ecommerce.addToCart(productId1, 0);
    }

    function test_RevertWhen_RemoveNonExistentItem() public {
        vm.prank(customer1);
        vm.expectRevert("Item not in cart");
        ecommerce.removeFromCart(productId1);
    }

    function test_RevertWhen_UpdateQuantityInsufficientStock() public {
        vm.startPrank(customer1);
        ecommerce.addToCart(productId1, 5);
        vm.expectRevert("Insufficient stock");
        ecommerce.updateQuantity(productId1, 101);
        vm.stopPrank();
    }
}
