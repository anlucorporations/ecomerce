// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ProductLib} from "./ProductLib.sol";

library ShoppingCartLib {
    struct CartItem {
        uint256 productId;
        uint256 quantity;
        uint256 unitPrice;
    }

    struct CartStorage {
        mapping(address => mapping(uint256 => CartItem)) carts;
        mapping(address => uint256[]) customerProductIds;
    }

    event ItemAdded(address indexed customer, uint256 indexed productId, uint256 quantity);
    event ItemRemoved(address indexed customer, uint256 indexed productId);
    event ItemUpdated(address indexed customer, uint256 indexed productId, uint256 quantity);
    event CartCleared(address indexed customer);

    function addToCart(
        CartStorage storage self,
        ProductLib.ProductStorage storage productStorage,
        uint256 _productId,
        uint256 _quantity,
        address _customer
    ) external {
        require(_quantity > 0, "Quantity must be > 0");

        ProductLib.Product memory product = ProductLib.getProduct(productStorage, _productId);
        require(product.isActive, "Product not active");
        require(product.stock >= _quantity, "Insufficient stock");

        // If item already exists, update quantity
        if (self.carts[_customer][_productId].productId != 0) {
            self.carts[_customer][_productId].quantity += _quantity;
        } else {
            self.carts[_customer][_productId] = CartItem({
                productId: _productId,
                quantity: _quantity,
                unitPrice: product.price
            });
            self.customerProductIds[_customer].push(_productId);
        }

        emit ItemAdded(_customer, _productId, _quantity);
    }

    function removeFromCart(CartStorage storage self, uint256 _productId, address _customer) external {
        require(self.carts[_customer][_productId].productId != 0, "Item not in cart");

        delete self.carts[_customer][_productId];

        // Remove from productIds array
        uint256[] storage productIds = self.customerProductIds[_customer];
        for (uint256 i = 0; i < productIds.length; i++) {
            if (productIds[i] == _productId) {
                productIds[i] = productIds[productIds.length - 1];
                productIds.pop();
                break;
            }
        }

        emit ItemRemoved(_customer, _productId);
    }

    function updateQuantity(
        CartStorage storage self,
        ProductLib.ProductStorage storage productStorage,
        uint256 _productId,
        uint256 _quantity,
        address _customer
    ) external {
        require(_quantity > 0, "Quantity must be > 0");
        require(self.carts[_customer][_productId].productId != 0, "Item not in cart");

        ProductLib.Product memory product = ProductLib.getProduct(productStorage, _productId);
        require(product.stock >= _quantity, "Insufficient stock");

        self.carts[_customer][_productId].quantity = _quantity;
        self.carts[_customer][_productId].unitPrice = product.price;

        emit ItemUpdated(_customer, _productId, _quantity);
    }

    function getCart(CartStorage storage self, address _customer) external view returns (CartItem[] memory) {
        uint256[] memory productIds = self.customerProductIds[_customer];
        CartItem[] memory items = new CartItem[](productIds.length);

        for (uint256 i = 0; i < productIds.length; i++) {
            items[i] = self.carts[_customer][productIds[i]];
        }

        return items;
    }

    function clearCart(CartStorage storage self, address _customer) external {
        uint256[] storage productIds = self.customerProductIds[_customer];

        for (uint256 i = 0; i < productIds.length; i++) {
            delete self.carts[_customer][productIds[i]];
        }

        delete self.customerProductIds[_customer];
        emit CartCleared(_customer);
    }

    function calculateTotal(CartStorage storage self, address _customer) external view returns (uint256) {
        uint256[] memory productIds = self.customerProductIds[_customer];
        uint256 total = 0;

        for (uint256 i = 0; i < productIds.length; i++) {
            CartItem memory item = self.carts[_customer][productIds[i]];
            total += item.unitPrice * item.quantity;
        }

        return total;
    }

    function getCartItemCount(CartStorage storage self, address _customer) external view returns (uint256) {
        return self.customerProductIds[_customer].length;
    }
}
