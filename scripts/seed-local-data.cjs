/**
 * Script de Inyección de Datos de Prueba Locales (Seeding Tool)
 * Plataforma E-Commerce Web3 BarloVentas
 * 
 * USO EXCLUSIVO EN ENTORNO LOCAL (http://127.0.0.1:8545)
 */

let ethers;
try {
    ethers = require('ethers');
} catch (e) {
    try {
        ethers = require('../web-admin/node_modules/ethers');
    } catch (err) {
        ethers = require('./web-admin/node_modules/ethers');
    }
}

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const ECOMMERCE_RAW_ADDRESS = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F';

const ACCOUNTS = {
    owner: {
        index: 0,
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        key: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    },
    empresa1: {
        index: 1,
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        key: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        name: 'TechZone Electronics S.L.',
        description: 'Distribuidor líder de tecnología, componentes informáticos, smartphones y gadgets de última generación.',
        businessType: 0,
        products: [
            {
                name: 'Laptop Gaming Pro Ultra 16"',
                description: 'Procesador i9 14ª Gen, 32GB RAM DDR5, SSD 1TB NVMe, NVIDIA RTX 4080 12GB.',
                priceEURT: '1200',
                stock: 15,
                image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=600'
            },
            {
                name: 'Smartphone NextGen 5G 256GB',
                description: 'Pantalla AMOLED 120Hz, cámara de 108MP, batería 5000mAh con carga rápida 67W.',
                priceEURT: '850',
                stock: 25,
                image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600'
            },
            {
                name: 'Auriculares Inalámbricos Noise Cancelling',
                description: 'Cancelación de ruido activa híbrida, bluetooth 5.3, autonomía de 30 horas.',
                priceEURT: '150',
                stock: 50,
                image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600'
            },
            {
                name: 'Monitor Gaming 4K OLED 32" 144Hz',
                description: 'Panel OLED 0.03ms respuesta, HDR1000, HDMI 2.1 y DisplayPort 1.4.',
                priceEURT: '600',
                stock: 10,
                image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=600'
            },
            {
                name: 'Teclado Mecánico RGB Switch Red',
                description: 'Formato 75%, hot-swappable, switches lineales silenciosos, chasis de aluminio.',
                priceEURT: '90',
                stock: 40,
                image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=600'
            }
        ]
    },
    empresa2: {
        index: 2,
        address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        key: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
        name: 'Moda & Estilo Barlovento S.A.',
        description: 'Boutique especializada en confección de moda urbana, calzado de cuero artesanal y accesorios sostenibles.',
        businessType: 0,
        products: [
            {
                name: 'Chaqueta de Cuero Genuino Artesanal',
                description: 'Cuero de vacuno 100% natural, forro térmico interior, acabados hechos a mano.',
                priceEURT: '250',
                stock: 20,
                image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600'
            },
            {
                name: 'Zapatillas Urbanas Cuero Ecológico',
                description: 'Suela ergonómica antiderrapante, diseño minimalista, materiales sostenibles.',
                priceEURT: '110',
                stock: 30,
                image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600'
            },
            {
                name: 'Reloj Ejecutivo Acero Inoxidable',
                description: 'Movimiento de cuarzo suizo, cristal de zafiro antirrayaduras, resistente a 50m.',
                priceEURT: '180',
                stock: 15,
                image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=600'
            },
            {
                name: 'Bolso de Mano Cuero Premium',
                description: 'Diseño italiano contemporáneo, compartimentos organizadores internos con cremallera.',
                priceEURT: '140',
                stock: 25,
                image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600'
            },
            {
                name: 'Gafas de Sol Polarizadas Aviador',
                description: 'Protección UV400 completa, montura ultraligera de titanio, lentes antirreflejo.',
                priceEURT: '75',
                stock: 60,
                image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=600'
            }
        ]
    },
    cliente1: {
        index: 3,
        address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        key: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
        name: 'Carlos Mendoza',
        email: 'carlos.mendoza@example.com',
        shippingAddress: 'Calle Gran Vía 45, 3ºB, 28013 Madrid, España'
    },
    cliente2: {
        index: 4,
        address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        key: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
        name: 'Elena Gómez',
        email: 'elena.gomez@example.com',
        shippingAddress: 'Avenida Diagonal 120, 5ºA, 08018 Barcelona, España'
    }
};

const ECOMMERCE_ABI = [
    'function owner() view returns (address)',
    'function euroTokenAddress() view returns (address)',
    'function registerCompanySelf(string _name, string _description, uint8 _businessType) payable returns (uint256)',
    'function updateKYCStatus(address account, bool status)',
    'function addProduct(uint256 _companyId, string _name, string _description, uint256 _price, string _ipfsImageHash, uint256 _stock) returns (uint256)',
    'function registerCustomerSelf(string _name, string _contactEmail, string _shippingAddress) payable',
    'function getEntityType(address account) view returns (uint8)',
    'function isKYCVerified(address account) view returns (bool)',
    'function getAllCompanies() view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate)[])',
    'function getCompanyProducts(uint256 _companyId) view returns (tuple(uint256 productId, uint256 companyId, string name, string description, uint256 price, string ipfsImageHash, uint256 stock, bool isActive, address companyAddress)[])',
    'function getAllCustomers() view returns (tuple(address customerAddress, string name, string contactEmail, string shippingAddress, bool isRegistered, uint256 registrationDate)[])'
];

const EURO_TOKEN_ABI = [
    'function decimals() view returns (uint8)',
    'function balanceOf(address account) view returns (uint256)',
    'function mint(address to, uint256 amount)'
];

class NonceTracker {
    constructor() {
        this.nonces = {};
    }

    async getNext(wallet) {
        const addr = wallet.address.toLowerCase();
        if (this.nonces[addr] === undefined) {
            this.nonces[addr] = await wallet.provider.getTransactionCount(wallet.address, 'latest');
        }
        return this.nonces[addr]++;
    }
}

async function seedLocalData() {
    console.log('==========================================================================');
    console.log('   HERRAMIENTA DE INYECCIÓN DE DATOS DE PRUEBA LOCALES - BARLO-VENTAS   ');
    console.log('==========================================================================\n');

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const ecommerceAddr = ethers.getAddress(ECOMMERCE_RAW_ADDRESS.toLowerCase());
    const tracker = new NonceTracker();

    // 1. Instanciar Billetera Owner Admin (Cuenta #0)
    const ownerWallet = new ethers.Wallet(ACCOUNTS.owner.key, provider);
    console.log(`[1/5] Verificando Cuenta #0 (Owner Admin)...`);
    console.log(`      Dirección Owner: ${ownerWallet.address}`);

    const ecomOwner = new ethers.Contract(ecommerceAddr, ECOMMERCE_ABI, ownerWallet);
    const onChainOwner = await ecomOwner.owner();
    console.log(`      Owner en Blockchain: ${onChainOwner}`);
    if (onChainOwner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
        throw new Error(`La cuenta ${ownerWallet.address} no es el propietario del contrato Ecommerce.`);
    }

    // Obtener EuroToken Address
    const rawTokenAddr = await ecomOwner.euroTokenAddress();
    const euroTokenAddr = ethers.getAddress(rawTokenAddr.toLowerCase());
    console.log(`      Contrato EuroToken: ${euroTokenAddr}`);

    const tokenContractOwner = new ethers.Contract(euroTokenAddr, EURO_TOKEN_ABI, ownerWallet);
    const decimals = Number(await tokenContractOwner.decimals());
    console.log(`      Decimales EuroToken: ${decimals}`);

    // 2. Registrar e Inyectar Empresas (Cuentas #1 y #2)
    console.log(`\n[2/5] Registrando e Inyectando Empresas (Cuentas #1 y #2)...`);

    const empresas = [ACCOUNTS.empresa1, ACCOUNTS.empresa2];
    const companyIds = {};

    for (const empData of empresas) {
        const empWallet = new ethers.Wallet(empData.key, provider);
        const ecomEmp = new ethers.Contract(ecommerceAddr, ECOMMERCE_ABI, empWallet);

        const currentType = Number(await ecomEmp.getEntityType(empWallet.address));
        let companyId;

        if (currentType === 1) {
            console.log(`   [!] ${empData.name} (${empWallet.address}) ya está registrada en la Blockchain.`);
            const allComps = await ecomOwner.getAllCompanies();
            const found = allComps.find(c => c.companyAddress.toLowerCase() === empWallet.address.toLowerCase());
            companyId = found ? Number(found.companyId) : 1;
        } else {
            console.log(`   [+] Registrando ${empData.name}...`);
            const nonce = await tracker.getNext(empWallet);
            const txReg = await ecomEmp.registerCompanySelf(empData.name, empData.description, empData.businessType, {
                value: ethers.parseEther('3.0'),
                nonce
            });
            await txReg.wait();
            
            const allComps = await ecomOwner.getAllCompanies();
            const found = allComps.find(c => c.companyAddress.toLowerCase() === empWallet.address.toLowerCase());
            companyId = found ? Number(found.companyId) : 1;
            console.log(`       -> Registrada exitosamente con CompanyID #${companyId}`);
        }

        // Aprobar KYC para la Empresa mediante el Owner Admin
        const isKyc = await ecomOwner.isKYCVerified(empWallet.address);
        if (!isKyc) {
            console.log(`       -> Aprobando KYC de Empresa por Admin Owner...`);
            const ownerNonce = await tracker.getNext(ownerWallet);
            const txKyc = await ecomOwner.updateKYCStatus(empWallet.address, true, { nonce: ownerNonce });
            await txKyc.wait();
            console.log(`       [v] KYC Verificado para ${empData.name}`);
        } else {
            console.log(`       [v] KYC Ya estaba Verificado para ${empData.name}`);
        }

        companyIds[empData.index] = companyId;
    }

    // 3. Incorporar 5 Artículos por Empresa (Total 10 Productos)
    console.log(`\n[3/5] Inyectando 5 Artículos por Empresa (Total 10 Productos)...`);

    for (const empData of empresas) {
        const empWallet = new ethers.Wallet(empData.key, provider);
        const ecomEmp = new ethers.Contract(ecommerceAddr, ECOMMERCE_ABI, empWallet);
        const companyId = companyIds[empData.index];

        const existingProducts = await ecomOwner.getCompanyProducts(companyId);
        console.log(`   [*] Empresa: ${empData.name} (CompanyID #${companyId}) - Productos Existentes: ${existingProducts.length}`);

        for (let i = 0; i < empData.products.length; i++) {
            const p = empData.products[i];
            const alreadyExists = existingProducts.some(ep => ep.name.toLowerCase() === p.name.toLowerCase());

            if (alreadyExists) {
                console.log(`       [-] Producto "${p.name}" ya existe on-chain.`);
            } else {
                const priceUnits = ethers.parseUnits(p.priceEURT, decimals);
                console.log(`       [+] Agregando: "${p.name}" | Precio: ${p.priceEURT} EURT | Stock: ${p.stock}`);
                const empNonce = await tracker.getNext(empWallet);
                const txProd = await ecomEmp.addProduct(
                    companyId,
                    p.name,
                    p.description,
                    priceUnits,
                    p.image,
                    p.stock,
                    { nonce: empNonce }
                );
                await txProd.wait();
                console.log(`           [v] Producto inyectado exitosamente.`);
            }
        }
    }

    // 4. Registrar Usuarios Regulares (Cuentas #3 y #4) y Acreditar 1000 EURT
    console.log(`\n[4/5] Registrando Clientes Regulares (Cuentas #3 y #4) con Saldo 1000 EURT...`);

    const clientes = [ACCOUNTS.cliente1, ACCOUNTS.cliente2];

    for (const cliData of clientes) {
        const cliWallet = new ethers.Wallet(cliData.key, provider);
        const ecomCli = new ethers.Contract(ecommerceAddr, ECOMMERCE_ABI, cliWallet);

        const currentType = Number(await ecomCli.getEntityType(cliWallet.address));

        if (currentType === 2) {
            console.log(`   [!] Cliente ${cliData.name} (${cliWallet.address}) ya está registrado.`);
        } else {
            console.log(`   [+] Registrando Cliente: ${cliData.name}...`);
            const cliNonce = await tracker.getNext(cliWallet);
            const txRegCli = await ecomCli.registerCustomerSelf(cliData.name, cliData.email, cliData.shippingAddress, { nonce: cliNonce });
            await txRegCli.wait();
            console.log(`       [v] Cliente registrado exitosamente.`);
        }

        // Aprobar KYC para el Cliente mediante el Owner Admin
        const isKyc = await ecomOwner.isKYCVerified(cliWallet.address);
        if (!isKyc) {
            console.log(`       -> Aprobando KYC de Cliente por Admin Owner...`);
            const ownerNonce = await tracker.getNext(ownerWallet);
            const txKyc = await ecomOwner.updateKYCStatus(cliWallet.address, true, { nonce: ownerNonce });
            await txKyc.wait();
            console.log(`       [v] KYC Verificado para ${cliData.name}`);
        } else {
            console.log(`       [v] KYC Ya estaba Verificado para ${cliData.name}`);
        }

        // Acreditar 1,000 EURT al cliente si su saldo es menor
        const tokenCli = new ethers.Contract(euroTokenAddr, EURO_TOKEN_ABI, ownerWallet);
        const balanceBig = await tokenCli.balanceOf(cliWallet.address);
        const targetBalance = ethers.parseUnits('1000', decimals);

        if (balanceBig < targetBalance) {
            const amountToMint = targetBalance - balanceBig;
            console.log(`       -> Minting ${ethers.formatUnits(amountToMint, decimals)} EURT para ${cliData.name}...`);
            const ownerNonce = await tracker.getNext(ownerWallet);
            const txMint = await tokenCli.mint(cliWallet.address, amountToMint, { nonce: ownerNonce });
            await txMint.wait();
            console.log(`       [v] Saldo final: 1,000 EURT en ${cliWallet.address}`);
        } else {
            console.log(`       [v] Saldo actual: ${ethers.formatUnits(balanceBig, decimals)} EURT (Suficiente)`);
        }
    }

    // 5. Verificación Final de Estado Global
    console.log(`\n==========================================================================`);
    console.log(`   VERIFICACIÓN GLOBAL DE OPERATIVIDAD EN LA BLOCKCHAIN LOCAL             `);
    console.log(`==========================================================================\n`);

    const allCompanies = await ecomOwner.getAllCompanies();
    console.log(`📊 TOTAL EMPRESAS REGISTRADAS: ${allCompanies.length}`);
    for (const c of allCompanies) {
        const kyc = await ecomOwner.isKYCVerified(c.companyAddress);
        const prods = await ecomOwner.getCompanyProducts(c.companyId);
        console.log(`   • ID #${c.companyId}: ${c.name} | Addr: ${c.companyAddress}`);
        console.log(`     KYC: ${kyc ? 'VERIFICADO 🟢' : 'PENDIENTE 🔴'} | Productos en Catálogo: ${prods.length}`);
    }

    const allCustomers = await ecomOwner.getAllCustomers();
    console.log(`\n👥 TOTAL CLIENTES REGISTRADOS: ${allCustomers.length}`);
    for (const cust of allCustomers) {
        const kyc = await ecomOwner.isKYCVerified(cust.customerAddress);
        const tokenCli = new ethers.Contract(euroTokenAddr, EURO_TOKEN_ABI, ownerWallet);
        const bal = await tokenCli.balanceOf(cust.customerAddress);
        console.log(`   • ${cust.name} (${cust.contactEmail}) | Addr: ${cust.customerAddress}`);
        console.log(`     KYC: ${kyc ? 'VERIFICADO 🟢' : 'PENDIENTE 🔴'} | Saldo EURT: ${ethers.formatUnits(bal, decimals)} EURT`);
    }

    console.log(`\n==========================================================================`);
    console.log(`   [SUCCESS] INYECCIÓN DE DATOS DE PRUEBA COMPLETADA EXITOSAMENTE!       `);
    console.log(`==========================================================================\n`);
}

seedLocalData().catch((err) => {
    console.error('\n[ERROR] Falló la inyección de datos de prueba:', err);
    process.exit(1);
});
