// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {CompanyLib} from "../src/libraries/CompanyLib.sol";
import {MockEuroToken} from "./mocks/MockEuroToken.sol";

contract CompanyRegistryTest is Test {
    Ecommerce public ecommerce;
    MockEuroToken public euroToken;
    address public owner;
    address public company1;
    address public company2;

    function setUp() public {
        owner = address(this);
        company1 = makeAddr("company1");
        company2 = makeAddr("company2");

        euroToken = new MockEuroToken();
        ecommerce = new Ecommerce(address(euroToken));
    }

    function test_RegisterCompany() public {
        uint256 companyId = ecommerce.registerCompany(
            company1,
            "Company One",
            "Description"
        );

        assertEq(companyId, 1);

        CompanyLib.Company memory company = ecommerce.getCompany(companyId);
        assertEq(company.companyId, 1);
        assertEq(company.companyAddress, company1);
        assertEq(company.name, "Company One");
        assertEq(company.description, "Description");
        assertTrue(company.isActive);
    }

    function test_GetCompanyByAddress() public {
        ecommerce.registerCompany(company1, "Company One", "Description");

        CompanyLib.Company memory company = ecommerce.getCompanyByAddress(company1);
        assertEq(company.companyAddress, company1);
        assertEq(company.name, "Company One");
    }

    function test_DeactivateCompany() public {
        uint256 companyId = ecommerce.registerCompany(company1, "Company One", "Description");

        ecommerce.deactivateCompany(companyId);

        CompanyLib.Company memory company = ecommerce.getCompany(companyId);
        assertFalse(company.isActive);
        assertFalse(ecommerce.isCompanyActive(companyId));
    }

    function test_ActivateCompany() public {
        uint256 companyId = ecommerce.registerCompany(company1, "Company One", "Description");
        ecommerce.deactivateCompany(companyId);

        ecommerce.activateCompany(companyId);

        CompanyLib.Company memory company = ecommerce.getCompany(companyId);
        assertTrue(company.isActive);
    }

    function test_GetAllCompanies() public {
        ecommerce.registerCompany(company1, "Company One", "Desc 1");
        ecommerce.registerCompany(company2, "Company Two", "Desc 2");

        CompanyLib.Company[] memory companies = ecommerce.getAllCompanies();
        assertEq(companies.length, 2);
        assertEq(companies[0].name, "Company One");
        assertEq(companies[1].name, "Company Two");
    }

    function test_RevertWhen_RegisterDuplicateAddress() public {
        ecommerce.registerCompany(company1, "Company One", "Description");
        vm.expectRevert("Company already exists");
        ecommerce.registerCompany(company1, "Company One Again", "Description");
    }

    function test_RevertWhen_RegisterWithEmptyName() public {
        vm.expectRevert("Name required");
        ecommerce.registerCompany(company1, "", "Description");
    }

    function test_RevertWhen_RegisterWithZeroAddress() public {
        vm.expectRevert("Invalid address");
        ecommerce.registerCompany(address(0), "Company", "Description");
    }

    function test_RevertWhen_NonOwnerRegister() public {
        vm.prank(company1);
        vm.expectRevert("Only owner");
        ecommerce.registerCompany(company2, "Company", "Description");
    }

    function test_RevertWhen_NonOwnerDeactivate() public {
        uint256 companyId = ecommerce.registerCompany(company1, "Company One", "Description");

        vm.prank(company1);
        vm.expectRevert("Only owner");
        ecommerce.deactivateCompany(companyId);
    }

    function test_RevertWhen_GetNonExistentCompany() public {
        vm.expectRevert("Company not found");
        ecommerce.getCompany(999);
    }
}
