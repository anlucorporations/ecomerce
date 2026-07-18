// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {CompanyLib} from "./CompanyLib.sol";

library ProductLib {
    struct Product {
        uint256 productId;
        uint256 companyId;
        string name;
        string description;
        uint256 price;
        string ipfsImageHash;
        uint256 stock;
        bool isActive;
        uint256 createdAt;
    }

    struct ProductStorage {
        uint256 nextProductId;
        mapping(uint256 => Product) products;
        mapping(uint256 => uint256[]) companyProducts;
        uint256[] productIds;
    }

    event ProductAdded(uint256 indexed productId, uint256 indexed companyId, string name, uint256 price);
    event ProductUpdated(uint256 indexed productId);
    event ProductDeactivated(uint256 indexed productId);
    event ProductActivated(uint256 indexed productId);
    event StockUpdated(uint256 indexed productId, uint256 newStock);

    function addProduct(
        ProductStorage storage self,
        CompanyLib.CompanyStorage storage companyStorage,
        uint256 _companyId,
        string memory _name,
        string memory _description,
        uint256 _price,
        string memory _ipfsImageHash,
        uint256 _stock,
        address _sender
    ) external returns (uint256) {
        CompanyLib.Company memory company = CompanyLib.getCompany(companyStorage, _companyId);
        require(company.companyAddress == _sender, "Not company owner");
        require(bytes(_name).length > 0, "Name required");
        require(_price > 0, "Price must be > 0");
        require(CompanyLib.isCompanyActive(companyStorage, _companyId), "Company not active");

        uint256 productId = self.nextProductId++;

        self.products[productId] = Product({
            productId: productId,
            companyId: _companyId,
            name: _name,
            description: _description,
            price: _price,
            ipfsImageHash: _ipfsImageHash,
            stock: _stock,
            isActive: true,
            createdAt: block.timestamp
        });

        self.companyProducts[_companyId].push(productId);
        self.productIds.push(productId);

        emit ProductAdded(productId, _companyId, _name, _price);
        return productId;
    }

    function updateProduct(
        ProductStorage storage self,
        CompanyLib.CompanyStorage storage companyStorage,
        uint256 _productId,
        string memory _name,
        string memory _description,
        uint256 _price,
        string memory _ipfsImageHash,
        address _sender
    ) external {
        Product storage product = self.products[_productId];
        require(product.productId != 0, "Product not found");

        CompanyLib.Company memory company = CompanyLib.getCompany(companyStorage, product.companyId);
        require(company.companyAddress == _sender, "Not company owner");

        if (bytes(_name).length > 0) product.name = _name;
        if (bytes(_description).length > 0) product.description = _description;
        if (_price > 0) product.price = _price;
        if (bytes(_ipfsImageHash).length > 0) product.ipfsImageHash = _ipfsImageHash;

        emit ProductUpdated(_productId);
    }

    function updateStock(
        ProductStorage storage self,
        CompanyLib.CompanyStorage storage companyStorage,
        uint256 _productId,
        uint256 _newStock,
        address _sender
    ) external {
        Product storage product = self.products[_productId];
        require(product.productId != 0, "Product not found");

        CompanyLib.Company memory company = CompanyLib.getCompany(companyStorage, product.companyId);
        require(company.companyAddress == _sender, "Not company owner");

        product.stock = _newStock;
        emit StockUpdated(_productId, _newStock);
    }

    function decreaseStock(ProductStorage storage self, uint256 _productId, uint256 _quantity) external {
        Product storage product = self.products[_productId];
        require(product.productId != 0, "Product not found");
        require(product.stock >= _quantity, "Insufficient stock");

        product.stock -= _quantity;
        emit StockUpdated(_productId, product.stock);
    }

    function deactivateProduct(
        ProductStorage storage self,
        CompanyLib.CompanyStorage storage companyStorage,
        uint256 _productId,
        address _sender
    ) external {
        Product storage product = self.products[_productId];
        require(product.productId != 0, "Product not found");

        CompanyLib.Company memory company = CompanyLib.getCompany(companyStorage, product.companyId);
        require(company.companyAddress == _sender, "Not company owner");

        product.isActive = false;
        emit ProductDeactivated(_productId);
    }

    function activateProduct(
        ProductStorage storage self,
        CompanyLib.CompanyStorage storage companyStorage,
        uint256 _productId,
        address _sender
    ) external {
        Product storage product = self.products[_productId];
        require(product.productId != 0, "Product not found");

        CompanyLib.Company memory company = CompanyLib.getCompany(companyStorage, product.companyId);
        require(company.companyAddress == _sender, "Not company owner");

        product.isActive = true;
        emit ProductActivated(_productId);
    }

    function getProduct(ProductStorage storage self, uint256 _productId) external view returns (Product memory) {
        require(self.products[_productId].productId != 0, "Product not found");
        return self.products[_productId];
    }

    function getProductsByCompany(ProductStorage storage self, uint256 _companyId) external view returns (Product[] memory) {
        uint256[] memory productIdsForCompany = self.companyProducts[_companyId];
        Product[] memory result = new Product[](productIdsForCompany.length);

        for (uint256 i = 0; i < productIdsForCompany.length; i++) {
            result[i] = self.products[productIdsForCompany[i]];
        }

        return result;
    }

    function getAllProducts(ProductStorage storage self) external view returns (Product[] memory) {
        Product[] memory allProducts = new Product[](self.productIds.length);
        for (uint256 i = 0; i < self.productIds.length; i++) {
            allProducts[i] = self.products[self.productIds[i]];
        }
        return allProducts;
    }

    function isProductAvailable(ProductStorage storage self, uint256 _productId, uint256 _quantity) external view returns (bool) {
        Product memory product = self.products[_productId];
        return product.isActive && product.stock >= _quantity;
    }
}
