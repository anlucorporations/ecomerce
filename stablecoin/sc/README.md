# EuroToken Smart Contract

EuroToken (EURT) es un contrato ERC20 con funcionalidad de minting y burning, diseñado como stablecoin vinculada al Euro.

## Características

- **Token ERC20**: Implementa el estándar ERC20 completo
- **Decimales**: 6 decimales (como USDC/USDT)
- **Ownable**: Solo el owner puede hacer mint de nuevos tokens
- **Burning**: Cualquier usuario puede quemar sus propios tokens

## Requisitos

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

## Instalación

```bash
# Instalar dependencias
forge install
```

## Deployment

### 1. Local (Anvil)

```bash
# Iniciar node local
anvil

# En otra terminal, hacer deploy
forge script script/DeployEuroToken.s.sol:DeployEuroToken --rpc-url http://localhost:8545 --broadcast --private-key <PRIVATE_KEY>
```

### 2. Testnet (Sepolia)

```bash
# Configurar variables de entorno
export SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"
export PRIVATE_KEY="your_private_key"

# Deploy
forge script script/DeployEuroToken.s.sol:DeployEuroToken --rpc-url $SEPOLIA_RPC_URL --broadcast --private-key $PRIVATE_KEY --verify --etherscan-api-key YOUR_ETHERSCAN_KEY
```

### 3. Mainnet

```bash
export MAINNET_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
export PRIVATE_KEY="your_private_key"

forge script script/DeployEuroToken.s.sol:DeployEuroToken --rpc-url $MAINNET_RPC_URL --broadcast --private-key $PRIVATE_KEY --verify --etherscan-api-key YOUR_ETHERSCAN_KEY
```

## Comandos Útiles

### Ver información del token

```bash
# Nombre del token
cast call <TOKEN_ADDRESS> "name()(string)" --rpc-url <RPC_URL>

# Símbolo
cast call <TOKEN_ADDRESS> "symbol()(string)" --rpc-url <RPC_URL>

# Decimales
cast call <TOKEN_ADDRESS> "decimals()(uint8)" --rpc-url <RPC_URL>

# Total supply
cast call <TOKEN_ADDRESS> "totalSupply()(uint256)" --rpc-url <RPC_URL>
```

### Ver balances

```bash
# Balance de una cuenta
cast call <TOKEN_ADDRESS> "balanceOf(address)(uint256)" <ACCOUNT_ADDRESS> --rpc-url <RPC_URL>

# Balance formateado (con decimales)
cast call <TOKEN_ADDRESS> "balanceOf(address)(uint256)" <ACCOUNT_ADDRESS> --rpc-url <RPC_URL> | cast --from-wei
```

### Ver owner

```bash
cast call <TOKEN_ADDRESS> "owner()(address)" --rpc-url <RPC_URL>
```

### Operaciones (requiere ser owner o tener tokens)

```bash
# Mint tokens (solo owner)
cast send <TOKEN_ADDRESS> "mint(address,uint256)" <RECIPIENT> <AMOUNT> --rpc-url <RPC_URL> --private-key <PRIVATE_KEY>

# Transfer tokens
cast send <TOKEN_ADDRESS> "transfer(address,uint256)" <RECIPIENT> <AMOUNT> --rpc-url <RPC_URL> --private-key <PRIVATE_KEY>

# Approve
cast send <TOKEN_ADDRESS> "approve(address,uint256)" <SPENDER> <AMOUNT> --rpc-url <RPC_URL> --private-key <PRIVATE_KEY>

# Burn tokens
cast send <TOKEN_ADDRESS> "burn(uint256)" <AMOUNT> --rpc-url <RPC_URL> --private-key <PRIVATE_KEY>
```

### Obtener información de cuentas

```bash
# Balance ETH de una cuenta
cast balance <ACCOUNT_ADDRESS> --rpc-url <RPC_URL>

# Nonce de una cuenta
cast nonce <ACCOUNT_ADDRESS> --rpc-url <RPC_URL>

# Código del contrato (verificar si está deployado)
cast code <TOKEN_ADDRESS> --rpc-url <RPC_URL>
```

### Ver transacciones

```bash
# Ver detalles de una transacción
cast tx <TX_HASH> --rpc-url <RPC_URL>

# Ver receipt de una transacción
cast receipt <TX_HASH> --rpc-url <RPC_URL>
```

## Ejemplo Completo con Anvil

```bash
# 1. Iniciar Anvil
anvil

# 2. Deploy del contrato (usando cuenta por defecto de Anvil)
forge script script/DeployEuroToken.s.sol:DeployEuroToken --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 3. Guardar dirección del contrato (saldrá en el log)
export TOKEN_ADDRESS=<address_from_deploy>

# 4. Mint 1000 EURT (1000000000 con 6 decimales)
cast send $TOKEN_ADDRESS "mint(address,uint256)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 1000000000 --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 5. Ver balance
cast call $TOKEN_ADDRESS "balanceOf(address)(uint256)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545

# 6. Transfer 100 EURT a otra cuenta
cast send $TOKEN_ADDRESS "transfer(address,uint256)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 100000000 --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Testing

```bash
# Ejecutar tests
forge test

# Tests con verbosity
forge test -vvv

# Coverage
forge coverage
```

## Build

```bash
forge build
```

## Estructura del Proyecto

```
.
├── script/
│   └── DeployEuroToken.s.sol    # Script de deployment
├── src/
│   └── EuroToken.sol             # Contrato principal
├── test/                         # Tests
├── foundry.toml                  # Configuración de Foundry
└── README.md                     # Este archivo
```

## Seguridad

⚠️ **Importante**:
- Nunca compartas tu `PRIVATE_KEY` en repositorios públicos
- Usa archivos `.env` y añádelos a `.gitignore`
- Verifica las direcciones antes de hacer transfers
- Testea exhaustivamente en testnets antes de hacer deploy en mainnet

## License

MIT
