# Plan de Remediación Integral — Auditoría Técnica Qwend (`INFORME_TECNICO_ AUDITORÍA-qwend.md`)

## 1. Resumen Ejecutivo y Diagnóstico Global

Tras analizar en profundidad la plataforma BARLO-VENTAS E-Commerce Web3 y el informe técnico de auditoría [`repTecnico/INFORME_TECNICO_ AUDITORÍA-qwend.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/repTecnico/INFORME_TECNICO_%20AUDITOR%C3%8DA-qwend.md), se constata la necesidad de corregir **3 errores sintácticos bloqueantes**, **2 vulnerabilidades críticas de seguridad** y **4 fallos de lógica de negocio** en los Smart Contracts (`sc-ecommerce`), así como **3 deficiencias de sincronización y rendimiento RPC** en el Frontend (`web-customer`).

El presente plan establece el diseño técnico detallado y las modificaciones específicas por archivo para garantizar la estabilidad, seguridad financiera y rendimiento optimizado del sistema antes de cualquier despliegue.

---

## 2. Matriz de Hallazgos y Plan de Remediación

| # | Vulnerabilidad / Hallazgo | Severidad | Estado Actual en Código | Solución Técnica Propuesta |
|---|---------------------------|-----------|-------------------------|----------------------------|
| **3.1** | **Reentrancy en `processPayment`** | 🔴 **Crítico (9.5)** | `euroToken.transferFrom` ejecutado antes de actualizar `invoice.isPaid = true`. | Aplicar patrón *Checks-Effects-Interactions* e importar `ReentrancyGuard` con modificador `nonReentrant`. |
| **3.2** | **Falta de Control de Acceso (Access Control)** | 🔴 **Crítico (9.0)** | `processPayment`, `clearCart`, `createInvoice` reciben `address _customer` sin validar `msg.sender`. | Añadir modificador `onlyCustomerOrAdmin(_customer)` (`msg.sender == _customer || msg.sender == owner`). |
| **4.1** | **Stock Defectuoso en Carrito** | 🟠 **Alto (8.0)** | `ShoppingCartLib.sol` valida `stock >= quantity` sin sumar la cantidad existente en el carrito. | Modificar a `require(product.stock >= currentInCart + _quantity, "StockExceeded")`. |
| **4.2** | **KYC "Placebo" en Autoregistro** | 🟠 **Alto (7.5)** | `registerCompanySelf` y `registerCustomerSelf` otorgan `isKYCVerified = true` de forma automática. | Inicializar `isKYCVerified = false` en autoregistro y requerir proceso de verificacion KYC. |
| **4.3** | **Manipulación de Reputación (Review Bombing)** | 🟠 **Medio (6.5)** | `rateCompany` permite calificar empresas sin verificar compras previas del emisor. | Exigir validación de al menos una factura pagada (`isPaid == true`) del cliente con dicha empresa. |
| **4.4** | **Bloqueo de Escrow / Máquina de Estados Incompleta** | 🟠 **Medio (6.0)** | Fondos en custodia quedan atrapados si el comprador no ejecuta `confirmDelivery`. | Implementar `resolveDisputeReleaseEscrow(_invoiceId)` para arbitraje administrativo del `owner`. |
| **5.1** | **Sintaxis de Arrays Memory Incorrecta** | 🔴 **Bloqueante** | Instanciación `new Company` o `new Product` sin especificar longitud `[](length)`. | Reemplazar globalmente por la sintaxis estricta `new Type[](length)` en todas las librerías. |
| **6.1** | **Sync de Carrito Silencioso** | 🟠 **Medio (6.0)** | `useCart.ts` ignora errores de sincronización blockchain con `console.warn` en bucle `for`. | Implementar manejo atómico con try/catch, notificaciones Toast de error y rollback de estado. |
| **6.2** | **Doble Persistencia y Conflicto LocalStorage** | 🟡 **Bajo (4.0)** | `addToCart` sobrescribe `guest_cart` y `wallet_cart_${address}` simultáneamente. | Aislar las claves de almacenamiento local según estado de conexión de la billetera. |
| **6.3** | **Ineficiencia en Llamadas RPC** | 🟡 **Bajo (4.0)** | `loadCart` ejecuta peticiones `getProduct` individuales en `Promise.all` por cada ítem. | Utilizar la función por lotes `getProductsBatch` e implementar caché `Map` de React. |

---

## 3. Propuesta de Cambios por Componente

---

### 🛡️ A. Smart Contracts (`sc-ecommerce`)

#### [MODIFY] [`Ecommerce.sol`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce/src/Ecommerce.sol)

1. **Protección contra Reentrancy (`nonReentrant`):**
   Heredar de `@openzeppelin/contracts/utils/ReentrancyGuard.sol` y proteger funciones financieras:
   ```solidity
   contract Ecommerce is ReentrancyGuard {
       // ...
       function processPayment(address _customer, uint256 _amount, uint256 _invoiceId) 
           external 
           nonReentrant 
           onlyCustomerOrAdmin(_customer) 
           returns (bool) 
       {
           Invoice storage invoice = invoices[_invoiceId];
           require(invoice.invoiceId != 0, "Invoice not found");
           require(!invoice.isPaid, "Invoice already paid");
           require(invoice.totalAmount == _amount, "Amount mismatch");

           // EFFECTS (Actualización de estado antes de interacción externa)
           invoice.isPaid = true;
           invoice.status = OrderStatus.Paid;

           // INTERACTIONS (Llamada externa al final)
           IERC20 euroToken = IERC20(euroTokenAddress);
           require(euroToken.transferFrom(_customer, address(this), _amount), "Escrow transfer failed");

           // Disminuir stock y actualizar estadísticas
           // ...
           emit PaymentProcessed(_invoiceId, _customer, _amount);
           return true;
       }
   }
   ```

2. **Control de Acceso Estricto (`onlyCustomerOrAdmin`):**
   ```solidity
   modifier onlyCustomerOrAdmin(address _customer) {
       require(msg.sender == _customer || msg.sender == owner, "AccessControl: Caller is not customer nor admin");
       _;
   }

   function clearCart(address _customer) external onlyCustomerOrAdmin(_customer) {
       cartStorage.clearCart(_customer);
   }

   function calculateTotal(address _customer) external view onlyCustomerOrAdmin(_customer) returns (uint256) {
       return cartStorage.calculateTotal(_customer);
   }
   ```

3. **Flujo de Verificación KYC:**
   ```solidity
   function registerCustomerSelf(
       string memory _name,
       string memory _contactEmail,
       string memory _shippingAddress
   ) external payable {
       require(bytes(_contactEmail).length > 0, "Email required");
       require(bytes(_shippingAddress).length > 0, "Shipping address required");

       isKYCVerified[msg.sender] = false; // Estado inicial no verificado, requiere completar proceso de verificación KYC
       emit KYCStatusUpdated(msg.sender, false);

       customerStorage.registerCustomerSelf(msg.sender, _name, _contactEmail, _shippingAddress);
       _logActivity(msg.sender, "REGISTER_CUSTOMER_SELF", _name);
   }

   function updateKYCStatus(address _account, bool _status) external onlyOwner {
       isKYCVerified[_account] = _status;
       emit KYCStatusUpdated(_account, _status);
   }
   ```

4. **Protección Anti Review-Bombing en `rateCompany`:**
   ```solidity
   function rateCompany(uint256 _companyId, uint8 _rating, string memory _comment) external {
       require(_rating >= 1 && _rating <= 5, "Rating 1-5");
       require(companyStorage.isCompanyActive(_companyId), "Company inactive");
       require(hasPaidInvoiceWithCompany(msg.sender, _companyId), "ReviewDenied: Purchase required to review");

       companyTotalRating[_companyId] += _rating;
       companyRatingCount[_companyId] += 1;
       // ...
   }

   function hasPaidInvoiceWithCompany(address _customer, uint256 _companyId) public view returns (bool) {
       uint256[] memory invIds = customerInvoices[_customer];
       for (uint256 i = 0; i < invIds.length; i++) {
           Invoice memory inv = invoices[invIds[i]];
           if (inv.companyId == _companyId && inv.isPaid) {
               return true;
           }
       }
       return false;
   }
   ```

5. **Resolución de Disputas en Escrow (`resolveDisputeReleaseEscrow`):**
   ```solidity
   function resolveDisputeReleaseEscrow(uint256 _invoiceId) external onlyOwner nonReentrant {
       Invoice storage invoice = invoices[_invoiceId];
       require(invoice.invoiceId != 0, "Invoice not found");
       require(invoice.isPaid, "Invoice not paid");
       require(invoice.status == OrderStatus.Shipped, "Order must be shipped to resolve dispute");

       CompanyLib.Company memory company = companyStorage.getCompany(invoice.companyId);
       IERC20 euroToken = IERC20(euroTokenAddress);

       invoice.status = OrderStatus.Delivered;
       invoice.deliveredTimestamp = block.timestamp;

       require(euroToken.transfer(company.companyAddress, invoice.totalAmount), "Dispute transfer failed");
       _logActivity(msg.sender, "DISPUTE_RESOLVED", "Escrow Released by Admin");
       emit OrderDelivered(_invoiceId, invoice.customerAddress);
   }
   ```

#### [MODIFY] [`ShoppingCartLib.sol`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce/src/libraries/ShoppingCartLib.sol)
- **Validación de Stock Acumulado:**
  ```solidity
  uint256 currentInCart = getProductQuantityInCart(self, _customer, _productId);
  require(product.stock >= currentInCart + _quantity, "StockExceeded: Cart total exceeds available stock");
  ```
- **Corrección de Sintaxis Memory Array:**
  Reemplazar inicializaciones incorrectas por `new CartItem[](count)`.

#### [MODIFY] [`CompanyLib.sol`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce/src/libraries/CompanyLib.sol), [`ProductLib.sol`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce/src/libraries/ProductLib.sol), [`CustomerLib.sol`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce/src/libraries/CustomerLib.sol)
- Reemplazar globalmente `new Type` por `new Type[](length)` para habilitar compilación limpia en Foundry (`forge build`).

---

### 🛍️ B. Frontend Web3 (`web-customer`)

#### [MODIFY] [`useCart.ts`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-customer/src/hooks/useCart.ts)

1. **Manejo Atómico de Sincronización de Carrito (`syncGuestCartToContract`):**
   ```typescript
   const syncGuestCartToContract = useCallback(
     async (activeSigner: JsonRpcSigner) => {
       if (typeof window === 'undefined') return;
       const cartKey = address ? `wallet_cart_${address.toLowerCase()}` : 'guest_cart';
       const saved = localStorage.getItem(cartKey);
       if (!saved) return;
       
       let guestItems: any[] = JSON.parse(saved);
       if (!Array.isArray(guestItems) || guestItems.length === 0) return;

       const contract = new ethers.Contract(
         ecommerceAddress,
         ["function addToCart(uint256 _productId, uint256 _quantity)"],
         activeSigner
       );

       try {
         for (const item of guestItems) {
           const tx = await contract.addToCart(BigInt(item.productId), BigInt(item.quantity));
           await tx.wait();
         }
         localStorage.removeItem(cartKey);
         localStorage.removeItem('guest_cart');
         await loadCart();
       } catch (syncError: any) {
         console.error("Atomic cart sync failed:", syncError);
         throw new Error("Error al sincronizar el carrito con la blockchain. Los cambios locales se han mantenido.");
       }
     },
     [ecommerceAddress, loadCart, address]
   );
   ```

2. **Optimización RPC Batch Query (`getProductsBatch`):**
   Reemplazar llamadas `getProduct` individuales en bucle `Promise.all` por la función optimizada de contrato `getProductsBatch(productIds)` en una sola consulta RPC.

---

## 4. Plan de Verificación y Pruebas

### 🧪 Automated Tests (Foundry)

```bash
cd sc-ecommerce
forge test --match-test testReentrancyProtection -v
forge test --match-test testAccessControlUnauthorizedCustomer -v
forge test --match-test testStockAccumulatedInCart -v
forge test --match-test testAntiReviewBombing -v
forge test --match-test testAdminDisputeResolution -v
```

### 🌐 Manual & Integration Verification
1. **Compilación:** Ejecutar `forge build` y asegurar 0 errores de sintaxis en arrays en memoria.
2. **Control de Acceso:** Intentar llamar a `clearCart` con una dirección distinta a `msg.sender` y verificar la reversión con `AccessControl: Caller is not customer nor admin`.
3. **Reseñas:** Calificar una empresa sin compras registradas y verificar que el contrato rechace la transacción con `ReviewDenied`.
4. **Sincronización Carrito:** Simular desconexión RPC durante la sincronización y verificar que `localStorage` retenga los artículos sin corromper el estado.

---

## 5. Cronograma de Ejecución

- **Día 1:** Corrección de sintaxis de arrays en librerías + `forge build` limpio + Implementación de `ReentrancyGuard` y `onlyCustomerOrAdmin` en `Ecommerce.sol`.
- **Día 2:** Lógica de Stock acumulado + Proceso de verificación KYC + Filtro Anti Review-Bombing + Función `resolveDisputeReleaseEscrow`.
- **Día 3:** Refactorización frontend `useCart.ts` (Sincronización atómica + RPC Batch Queries con `getProductsBatch`).
- **Día 4:** Ejecución de suite completa de pruebas Foundry y verificación E2E en navegador local.
