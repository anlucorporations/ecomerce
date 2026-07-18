// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {ProductLib} from "../src/libraries/ProductLib.sol";
import {MockEuroToken} from "./mocks/MockEuroToken.sol";

contract ProductCatalogTest is Test {
    Ecommerce public ecommerce;
    MockEuroToken public euroToken;

    address public owner;
    address public company1;
    address public company2;
    uint256 public companyId1;
    uint256 public companyId2;

    function setUp() public {
        owner = address(this);
        company1 = makeAddr("company1");
        company2 = makeAddr("company2");

        euroToken = new MockEuroToken();
        ecommerce = new Ecommerce(address(euroToken));

        companyId1 = ecommerce.registerCompany(company1, "Company One", "Desc");
        companyId2 = ecommerce.registerCompany(company2, "Company Two", "Desc");
    }

    function test_AddProduct() public {
        vm.prank(company1);
        uint256 productId = ecommerce.addProduct(
            companyId1,
            "Product 1",
            "Description",
            1000000, // 1 EURT (6 decimals)
            "QmHash123",
            100
        );

        assertEq(productId, 1);

        ProductLib.Product memory product = ecommerce.getProduct(productId);
        assertEq(product.productId, 1);
        assertEq(product.companyId, companyId1);
        assertEq(product.name, "Product 1");
        assertEq(product.price, 1000000);
        assertEq(product.stock, 100);
        assertTrue(product.isActive);
    }

    function test_UpdateProduct() public {
        vm.prank(company1);
        uint256 productId = ecommerce.addProduct(
            companyId1, "Product 1", "Desc", 1000000, "QmHash", 100
        );

        vm.prank(company1);
        ecommerce.updateProduct(
            productId,
            "Product 1 Updated",
            "New Description",
            2000000,
            "QmHash456"
        );

        ProductLib.Product memory product = ecommerce.getProduct(productId);
        assertEq(product.name, "Product 1 Updated");
        assertEq(product.description, "New Description");
        assertEq(product.price, 2000000);
        assertEq(product.ipfsImageHash, "QmHash456");
    }

    function test_UpdateStock() public {
        vm.prank(company1);
        uint256 productId = ecommerce.addProduct(
            companyId1, "Product 1", "Desc", 1000000, "QmHash", 100
        );

        vm.prank(company1);
        ecommerce.updateStock(productId, 50);

        ProductLib.Product memory product = ecommerce.getProduct(productId);
        assertEq(product.stock, 50);
    }

    function test_DecreaseStock() public {
        vm.prank(company1);
        uint256 productId = ecommerce.addProduct(
            companyId1, "Product 1", "Desc", 1000000, "QmHash", 100
        );

        ecommerce.decreaseStock(productId, 30);

        ProductLib.Product memory product = ecommerce.getProduct(productId);
        assertEq(product.stock, 70);
    }

    function test_DeactivateProduct() public {
        vm.prank(company1);
        uint256 productId = ecommerce.addProduct(
            companyId1, "Product 1", "Desc", 1000000, "QmHash", 100
        );

        vm.prank(company1);
        ecommerce.deactivateProduct(productId);

        ProductLib.Product memory product = ecommerce.getProduct(productId);
        assertFalse(product.isActive);
    }

    function test_GetProductsByCompany() public {
        vm.startPrank(company1);
        ecommerce.addProduct(companyId1, "Product 1", "Desc", 1000000, "QmHash", 100);
        ecommerce.addProduct(companyId1, "Product 2", "Desc", 2000000, "QmHash", 50);
        vm.stopPrank();

        ProductLib.Product[] memory products = ecommerce.getProductsByCompany(companyId1);
        assertEq(products.length, 2);
        assertEq(products[0].name, "Product 1");
        assertEq(products[1].name, "Product 2");
    }

    function test_GetAllProducts() public {
        vm.prank(company1);
        ecommerce.addProduct(companyId1, "Product 1", "Desc", 1000000, "QmHash", 100);

        vm.prank(company2);
        ecommerce.addProduct(companyId2, "Product 2", "Desc", 2000000, "QmHash", 50);

        ProductLib.Product[] memory products = ecommerce.getAllProducts();
        assertEq(products.length, 2);
    }

    function test_IsProductAvailable() public {
        vm.prank(company1);
        uint256 productId = ecommerce.addProduct(
            companyId1, "Product 1", "Desc", 1000000, "QmHash", 100
        );

        assertTrue(ecommerce.isProductAvailable(productId, 50));
        assertTrue(ecommerce.isProductAvailable(productId, 100));
        assertFalse(ecommerce.isProductAvailable(productId, 101));
    }

    function test_RevertWhen_AddProductNotCompanyOwner() public {
        vm.prank(company2);
        vm.expectRevert("Not company owner");
        ecommerce.addProduct(companyId1, "Product", "Desc", 1000000, "QmHash", 100);
    }

    function test_RevertWhen_UpdateProductNotOwner() public {
        vm.prank(company1);
        uint256 productId = ecommerce.addProduct(
            companyId1, "Product 1", "Desc", 1000000, "QmHash", 100
        );

        vm.prank(company2);
        vm.expectRevert("Not company owner");
        ecommerce.updateProduct(productId, "Hacked", "Hacked", 1, "Hacked");
    }

    function test_RevertWhen_DecreaseStockInsufficientStock() public {
        vm.prank(company1);
        uint256 productId = ecommerce.addProduct(
            companyId1, "Product 1", "Desc", 1000000, "QmHash", 100
        );

        vm.expectRevert("Insufficient stock");
        ecommerce.decreaseStock(productId, 101);
    }

    function test_RevertWhen_AddProductWithZeroPrice() public {
        vm.prank(company1);
        vm.expectRevert("Price must be > 0");
        ecommerce.addProduct(companyId1, "Product", "Desc", 0, "QmHash", 100);
    }
}
