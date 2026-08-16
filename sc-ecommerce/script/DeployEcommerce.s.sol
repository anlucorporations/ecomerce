// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {CompanyLib} from "../src/libraries/CompanyLib.sol";

interface IEuroToken {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
}

contract DeployEcommerceScript is Script {
    function setUp() public {}

    function run() public {
        // EuroToken default deployed address at 0x5FbDB2315678afecb367f032d93F642f64180aa3
        address euroTokenAddress = vm.envOr("EURO_TOKEN_ADDRESS", address(0x5FbDB2315678afecb367f032d93F642f64180aa3));

        // Anvil Accounts Private Keys
        uint256 ownerPrivateKey  = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)); // Acc #0
        uint256 comp1PrivateKey  = uint256(0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d); // Acc #1
        uint256 comp2PrivateKey  = uint256(0x5de4111daf705d6dd080b0b8c4d23f4b633005391bc40c49040aeeb5c55be1ab); // Acc #2
        uint256 cust1PrivateKey  = uint256(0x7c852118294e37e65e383b8402329267c8772732b463d6b389659b615a2d347f); // Acc #3
        uint256 cust2PrivateKey  = uint256(0x47e179ec197488593b137f810a5f4d0e635b04e428734bca810842840008087a); // Acc #4

        address ownerAddr = vm.addr(ownerPrivateKey);
        address comp1Addr = vm.addr(comp1PrivateKey);
        address comp2Addr = vm.addr(comp2PrivateKey);
        address cust1Addr = vm.addr(cust1PrivateKey);
        address cust2Addr = vm.addr(cust2PrivateKey);

        // 1. Deploy Contract as Owner Account #0
        vm.startBroadcast(ownerPrivateKey);

        Ecommerce ecommerce = new Ecommerce(euroTokenAddress);

        console.log("Ecommerce deployed at:", address(ecommerce));
        console.log("Owner Account #0:", ecommerce.owner());
        console.log("EuroToken:", ecommerce.euroTokenAddress());

        // Account #0 (Owner): Duly registered as Customer Entity, 0 EURT balance
        ecommerce.registerCustomerSelf(
            "Super Admin Owner",
            "owner@barloventas.com",
            "Sede Central BARLO-VENTAS, Madrid"
        );

        // Fund customer accounts with 1 ETH for gas
        payable(cust1Addr).transfer(1 ether);
        payable(cust2Addr).transfer(1 ether);

        vm.stopBroadcast();

        // 2. Register Empresa 1 & Empresa 2 as Owner Admin
        vm.startBroadcast(ownerPrivateKey);

        uint256 comp1Id = ecommerce.registerCompany(
            comp1Addr,
            "TechMarket Iberia S.L.",
            "Distribuidor mayorista de productos de alta tecnologia, laptops, monitores y accesorios.",
            CompanyLib.BusinessType.ProductSales
        );

        uint256 comp2Id = ecommerce.registerCompany(
            comp2Addr,
            "ServiCloud Consultores S.A.",
            "Firma especializada en ciberseguridad Web3, infraestructura Cloud y desarrollo de Smart Contracts.",
            CompanyLib.BusinessType.ServiceProvision
        );

        vm.stopBroadcast();

        // 3. Account #1: Add 5 Products
        vm.startBroadcast(comp1PrivateKey);
        ecommerce.addProduct(comp1Id, "Laptop Pro 16\" M3 Max", "Laptop de alto rendimiento para desarrolladores y creativos", 1850_000_000, "QmHashTechLaptop16", 15);
        ecommerce.addProduct(comp1Id, "Monitor OLED Curvo 34\"", "Monitor profesional 34 pulgadas 175Hz 0.1ms", 650_000_000, "QmHashTechMonitor34", 20);
        ecommerce.addProduct(comp1Id, "Teclado Mecanico Inalambrico RGB", "Teclado mecanico con switches tactiles silenciosos", 110_000_000, "QmHashTechKeyboardRGB", 45);
        ecommerce.addProduct(comp1Id, "Auriculares Studio Noise Cancelling", "Auriculares inalambricos con cancelacion activa de ruido", 180_000_000, "QmHashTechHeadphonesANC", 35);
        ecommerce.addProduct(comp1Id, "Hub USB-C Multiport Thunderbolt 4", "Estacion de acoplamiento 10 en 1 dual 4K HDMI", 65_000_000, "QmHashTechHubUSBC", 50);
        vm.stopBroadcast();

        // 4. Account #2: Add 5 Services
        vm.startBroadcast(comp2PrivateKey);
        ecommerce.addProduct(comp2Id, "Auditoria de Ciberseguridad & Smart Contracts", "Evaluacion integral de vulnerabilidades en codigo Solidity y arquitectura DApp", 1200_000_000, "QmHashServiAuditSec", 10);
        ecommerce.addProduct(comp2Id, "Consultoria de Arquitectura Cloud (por hora)", "Asesoria especializada AWS/Azure para arquitecturas resilientes", 120_000_000, "QmHashServiCloudConsulting", 100);
        ecommerce.addProduct(comp2Id, "Mantenimiento Preventivo de Servidores (Mensual)", "Monitoreo 24/7 y optimizacion de rendimiento de infraestructura", 350_000_000, "QmHashServiServerMaint", 25);
        ecommerce.addProduct(comp2Id, "Migracion de Base de Datos SQL a la Nube", "Servicio completo de migracion sin interrupcion de servicio", 750_000_000, "QmHashServiDBMigration", 15);
        ecommerce.addProduct(comp2Id, "Soporte Tecnico 24/7 Nivel 3 (Suscripcion)", "Atencion prioritaria para resolucion de incidentes criticos", 280_000_000, "QmHashServiSupport247", 30);
        vm.stopBroadcast();

        // 4. Account #3: Register Customer 1 (Carlos Mendoza Rivas) & Mint 1,000 EURT
        vm.startBroadcast(cust1PrivateKey);
        ecommerce.registerCustomerSelf(
            "Carlos Mendoza Rivas",
            "carlos.mendoza@barloventas.com",
            unicode"Av. Diagonal 402, 4º B, Barcelona"
        );
        vm.stopBroadcast();

        // 5. Account #4: Register Customer 2 (Maria Fernandez Silva) & Mint 500 EURT
        vm.startBroadcast(cust2PrivateKey);
        ecommerce.registerCustomerSelf(
            "Maria Fernandez Silva",
            "maria.fernandez@barloventas.com",
            unicode"Calle Velazquez 78, 2º Izq, Madrid"
        );
        vm.stopBroadcast();

        // 6. Owner Mints Initial Tokens to Customers for testing
        vm.startBroadcast(ownerPrivateKey);
        IEuroToken(euroTokenAddress).mint(cust1Addr, 1000_000_000); // 1,000 EURT
        IEuroToken(euroTokenAddress).mint(cust2Addr, 500_000_000);  // 500 EURT
        vm.stopBroadcast();

        console.log("=== SEED DATA DEPLOYMENT COMPLETE ===");
        console.log("Account #0 (Owner):", ownerAddr);
        console.log("Account #1 (Company 1):", comp1Addr, comp1Id);
        console.log("Account #2 (Company 2):", comp2Addr, comp2Id);
        console.log("Account #3 (Customer 1):", cust1Addr);
        console.log("Account #4 (Customer 2):", cust2Addr);
    }
}
