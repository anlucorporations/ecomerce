# ARQUITECTURA DEL SISTEMA E-COMMERCE BLOCKCHAIN

## 1. ARQUITECTURA GENERAL DEL SISTEMA

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        UI[React UI Components]
        Wallet[Wallet Integration]
        Cart[Shopping Cart]
    end
    
    subgraph "Blockchain Layer (Foundry)"
        ETH[Ethereum Network]
        SC[Smart Contracts]
        Token[EURO Token]
        Anvil[Anvil Local Node]
    end
    
    subgraph "External Services"
        IPFS[IPFS/Pinata]
        Stripe[Stripe API]
        RPC[Infura/Alchemy]
    end
    
    UI --> Wallet
    Wallet --> SC
    SC --> ETH
    SC --> Anvil
    UI --> IPFS
    UI --> Stripe
    SC --> Token
    Wallet --> RPC
    
    classDef frontend fill:#e1f5fe
    classDef blockchain fill:#f3e5f5
    classDef external fill:#e8f5e8
    
    class UI,Wallet,Cart frontend
    class ETH,SC,Token blockchain
    class IPFS,Stripe,RPC external
```

## 2. ARQUITECTURA DE SMART CONTRACTS

```mermaid
graph TB
    subgraph "Smart Contract Architecture"
        Main[EcommerceMain.sol]
        
        subgraph "Core Contracts"
            Company[CompanyRegistry.sol]
            Product[ProductCatalog.sol]
            Customer[CustomerRegistry.sol]
        end
        
        subgraph "Business Logic"
            Cart[ShoppingCart.sol]
            Invoice[InvoiceSystem.sol]
            Payment[PaymentGateway.sol]
        end
        
        subgraph "Token System"
            Euro[EuroToken.sol]
        end
        
        Main --> Company
        Main --> Product
        Main --> Customer
        Main --> Cart
        Main --> Invoice
        Main --> Payment
        Main --> Euro
        
        Cart --> Product
        Invoice --> Cart
        Invoice --> Customer
        Payment --> Euro
    end
    
    classDef core fill:#bbdefb
    classDef business fill:#c8e6c9
    classDef token fill:#ffcdd2
    classDef main fill:#fff9c4
    
    class Company,Product,Customer core
    class Cart,Invoice,Payment business
    class Euro token
    class Main main
```

## 3. FLUJO DE COMPRA

```mermaid
sequenceDiagram
    participant U as Usuario
    participant D as DApp Frontend
    participant W as Wallet
    participant SC as Smart Contracts
    participant IPFS as IPFS
    participant S as Stripe
    
    U->>D: Navegar productos
    D->>SC: Obtener catálogo
    SC-->>D: Lista productos
    D->>IPFS: Cargar imágenes
    IPFS-->>D: URLs imágenes
    
    U->>D: Añadir al carrito
    D->>SC: Actualizar carrito
    SC-->>D: Confirmación
    
    U->>D: Proceder checkout
    D->>SC: Calcular total
    SC-->>D: Total + fees
    
    U->>W: Conectar wallet
    W-->>D: Address usuario
    
    U->>D: Completar pago
    D->>S: Crear sesión Stripe
    S-->>D: Redirect URL
    
    U->>S: Pagar con tarjeta
    S->>SC: Mint tokens (webhook)
    SC->>SC: Crear factura
    SC->>SC: Actualizar cliente
    SC-->>D: Confirmación
```

## 4. ARQUITECTURA DE DATOS

```mermaid
erDiagram
    COMPANY {
        uint256 companyId PK
        address companyAddress
        string name
        string description
        bool isActive
        uint256 registrationDate
    }
    
    PRODUCT {
        uint256 productId PK
        address companyAddress FK
        string name
        string description
        uint256 price
        string ipfsImageHash
        uint256 stock
        bool isActive
        uint256 createdAt
    }
    
    CUSTOMER {
        address customerAddress PK
        uint256 totalPurchases
        uint256 totalSpent
        uint256 registrationDate
        uint256 lastPurchaseDate
        bool isActive
    }
    
    INVOICE {
        uint256 invoiceId PK
        address companyAddress FK
        address customerAddress FK
        uint256 totalAmount
        uint256 timestamp
        bool isPaid
        string paymentTxHash
    }
    
    INVOICE_ITEM {
        uint256 invoiceId FK
        uint256 productId FK
        string productName
        uint256 quantity
        uint256 unitPrice
        uint256 totalPrice
    }
    
    CART_ITEM {
        address customerAddress FK
        uint256 productId FK
        uint256 quantity
        uint256 unitPrice
    }
    
    COMPANY ||--o{ PRODUCT : "owns"
    CUSTOMER ||--o{ INVOICE : "purchases"
    COMPANY ||--o{ INVOICE : "sells"
    INVOICE ||--o{ INVOICE_ITEM : "contains"
    PRODUCT ||--o{ INVOICE_ITEM : "included_in"
    CUSTOMER ||--o{ CART_ITEM : "has"
    PRODUCT ||--o{ CART_ITEM : "added_to"
```

## 5. ARQUITECTURA DE FRONTEND

```mermaid
graph TB
    subgraph "Next.js Frontend"
        subgraph "Pages"
            Home[Home Page]
            Companies[Companies]
            Products[Products]
            Cart[Cart]
            Checkout[Checkout]
            Invoices[Invoices]
            Wallet[Wallet]
        end
        
        subgraph "Components"
            Layout[Layout Components]
            UI[UI Components]
            Blockchain[Blockchain Components]
            Forms[Form Components]
        end
        
        subgraph "Hooks"
            WalletH[useWallet]
            ContractH[useContracts]
            ProductH[useProducts]
            CartH[useCart]
        end
        
        subgraph "Services"
            IPFSS[IPFS Service]
            StripeS[Stripe Service]
            ContractS[Contract Service]
        end
        
        Home --> Layout
        Companies --> UI
        Products --> Blockchain
        Cart --> Forms
        Checkout --> WalletH
        Invoices --> ContractH
        Wallet --> ProductH
        
        Layout --> WalletH
        UI --> ContractS
        Blockchain --> IPFSS
        Forms --> StripeS
    end
    
    classDef pages fill:#e3f2fd
    classDef components fill:#f1f8e9
    classDef hooks fill:#fce4ec
    classDef services fill:#fff3e0
    
    class Home,Companies,Products,Cart,Checkout,Invoices,Wallet pages
    class Layout,UI,Blockchain,Forms components
    class WalletH,ContractH,ProductH,CartH hooks
    class IPFSS,StripeS,ContractS services
```

## 6. FLUJO DE PAGOS

```mermaid
graph TB
    subgraph "Payment Flow"
        Start([Usuario inicia compra])
        
        subgraph "Compra de Tokens"
            Buy1[Usuario solicita tokens]
            Buy2[Crear sesión Stripe]
            Buy3[Pagar con tarjeta]
            Buy4[Webhook confirma pago]
            Buy5[Mint tokens en blockchain]
        end
        
        subgraph "Pago de Productos"
            Pay1[Usuario completa carrito]
            Pay2[Calcular total]
            Pay3[Transferir tokens]
            Pay4[Crear factura]
            Pay5[Actualizar inventario]
        end
        
        subgraph "Retiro de Tokens"
            Withdraw1[Usuario solicita retiro]
            Withdraw2[Validar balance]
            Withdraw3[Burn tokens]
            Withdraw4[Transferir euros via Stripe]
        end
        
        Start --> Buy1
        Buy1 --> Buy2
        Buy2 --> Buy3
        Buy3 --> Buy4
        Buy4 --> Buy5
        Buy5 --> Pay1
        
        Pay1 --> Pay2
        Pay2 --> Pay3
        Pay3 --> Pay4
        Pay4 --> Pay5
        
        Pay5 --> Withdraw1
        Withdraw1 --> Withdraw2
        Withdraw2 --> Withdraw3
        Withdraw3 --> Withdraw4
    end
    
    classDef buy fill:#c8e6c9
    classDef pay fill:#bbdefb
    classDef withdraw fill:#ffcdd2
    
    class Buy1,Buy2,Buy3,Buy4,Buy5 buy
    class Pay1,Pay2,Pay3,Pay4,Pay5 pay
    class Withdraw1,Withdraw2,Withdraw3,Withdraw4 withdraw
```

## 7. INTEGRACIÓN CON SERVICIOS EXTERNOS

```mermaid
graph TB
    subgraph "External Integrations"
        subgraph "IPFS (Pinata)"
            IPFS_Upload[Upload Images]
            IPFS_Retrieve[Retrieve Images]
            IPFS_Pin[Pin Management]
        end
        
        subgraph "Stripe"
            Stripe_Checkout[Checkout Sessions]
            Stripe_Webhooks[Webhooks]
            Stripe_Transfers[Bank Transfers]
        end
        
        subgraph "Blockchain Infrastructure"
            Infura[Infura RPC]
            Alchemy[Alchemy RPC]
            Tenderly[Monitoring]
        end
    end
    
    subgraph "Our System"
        Frontend[Next.js Frontend]
        Contracts[Smart Contracts]
        Backend[Node.js Backend]
    end
    
    Frontend --> IPFS_Upload
    Frontend --> IPFS_Retrieve
    Contracts --> IPFS_Pin
    
    Frontend --> Stripe_Checkout
    Backend --> Stripe_Webhooks
    Backend --> Stripe_Transfers
    
    Frontend --> Infura
    Contracts --> Alchemy
    Contracts --> Tenderly
    
    classDef external fill:#e8f5e8
    classDef system fill:#e3f2fd
    
    class IPFS_Upload,IPFS_Retrieve,IPFS_Pin,Stripe_Checkout,Stripe_Webhooks,Stripe_Transfers,Infura,Alchemy,Tenderly external
    class Frontend,Contracts,Backend system
```

## 8. SECURITY & GAS OPTIMIZATION

```mermaid
graph TB
    subgraph "Security Measures"
        Access[Access Control]
        Validation[Input Validation]
        Reentrancy[Reentrancy Guards]
        Pausable[Pausable Contracts]
    end
    
    subgraph "Gas Optimization"
        Packing[Struct Packing]
        Batch[Batch Operations]
        Events[Event Logging]
        View[View Functions]
    end
    
    subgraph "Monitoring"
        Tenderly[Tenderly Monitoring]
        Logs[Event Logs]
        Alerts[Gas Alerts]
        Analytics[Usage Analytics]
    end
    
    Access --> Validation
    Validation --> Reentrancy
    Reentrancy --> Pausable
    
    Packing --> Batch
    Batch --> Events
    Events --> View
    
    Pausable --> Tenderly
    View --> Logs
    Logs --> Alerts
    Alerts --> Analytics
    
    classDef security fill:#ffcdd2
    classDef optimization fill:#c8e6c9
    classDef monitoring fill:#bbdefb
    
    class Access,Validation,Reentrancy,Pausable security
    class Packing,Batch,Events,View optimization
    class Tenderly,Logs,Alerts,Analytics monitoring
```
