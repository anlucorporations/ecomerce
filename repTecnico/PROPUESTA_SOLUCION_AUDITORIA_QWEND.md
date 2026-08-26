# 🛠️ Propuesta de Solución Integral a la Auditoría de Seguridad (Qwend Report)

**Proyecto:** BARLO-VENTAS E-Commerce Web3  
**Documento de Auditoría Evaluado:** [`repTecnico/INFORME_TECNICO_ AUDITORÍA-qwend.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/repTecnico/INFORME_TECNICO_%20AUDITOR%C3%8DA-qwend.md)  
**Ubicación de esta Propuesta:** [`Docs/PROPUESTA_SOLUCION_AUDITORIA_QWEND.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/Docs/PROPUESTA_SOLUCION_AUDITORIA_QWEND.md)  
**Objetivo:** Eliminar el 100% de los hallazgos críticos, vulnerabilidades de reentrada, fallos de control de acceso y errores de sintaxis o lógica.

---

## 📋 1. Matriz de Hallazgos y Soluciones Propuestas

```text
=============================================================================================================
                           MATRIZ DE HALLAZGOS Y PLAN DE REMEDIACIÓN
=============================================================================================================
  ID  | Hallazgo / Vulnerabilidad               | Severidad  | Solución Técnica Propuesta
------+-----------------------------------------+------------+-----------------------------------------------
  3.1 | Reentrancy en processPayment           | 🔴 CRÍTICO | Patrón Checks-Effects-Interactions + nonReentrant
  3.2 | Control de Acceso (Unauthorized calls)   | 🔴 CRÍTICO | require(msg.sender == _customer, "Not owner")
  4.1 | Validación de Stock en Carrito         | 🟠 ALTO    | Validar stock >= stock_actual + _quantity
  4.2 | KYC "Placebo" en Autoregistro           | 🟠 ALTO    | Registro en estado 'Pending' + aprobación Admin
  4.3 | Review Bombing en rateCompany          | 🟠 MEDIO   | Verificar invoice.isPaid == true previa por cliente
  4.4 | Máquina de Estados / Lockup Escrow      | 🟠 MEDIO   | Función admin resolveDisputeReleaseEscrow
  5.1 | Sintaxis de Arrays Memory              | 🔴 CRÍTICO | Reemplazar new Type por new Type[](length)
  6.1 | Sync de Carrito Silencioso en Frontend  | 🟠 MEDIO   | Manejo atómico try/catch con notificaciones Toast
=============================================================================================================
```

---

## 🔒 2. Soluciones Detalladas por Componente (Smart Contracts)

---

### 🔴 2.1. Protección contra Reentrancy en `processPayment` y `confirmDelivery`
**Problema:** Transferencias externas ejecutadas antes de actualizar los estados de pago o custodia.  
**Solución Propuesta:**
1. Heredar de `@openzeppelin/contracts/utils/ReentrancyGuard.sol`.
2. Aplicar el modificador `nonReentrant` a todas las funciones financieras (`processPayment`, `confirmDelivery`, `resolveDisputeReleaseEscrow`).
3. Reordenar el código aplicando estrictamente el patrón **Checks-Effects-Interactions**:
   ```solidity
   function processPayment(address _customer, uint256 _amount, uint256 _invoiceId) 
       external 
       nonReentrant 
       returns (bool) 
   {
       require(msg.sender == _customer || msg.sender == owner(), "Unauthorized customer");
       Invoice storage invoice = invoices[_invoiceId];
       require(!invoice.isPaid, "Invoice already paid");
       require(invoice.totalAmount == _amount, "Incorrect payment amount");

       // EFFECTS (Actualización de Estado ANTES de la llamada externa)
       invoice.isPaid = true;
       invoice.paymentTxHash = bytes32(uint256(uint160(msg.sender)));

       // INTERACTIONS (Llamada Externa al final)
       require(euroToken.transferFrom(_customer, address(this), _amount), "Escrow transfer failed");
       
       emit PaymentProcessed(_invoiceId, _customer, _amount);
       return true;
   }
   ```

---

### 🔴 2.2. Control de Acceso Estricto (Access Control)
**Problema:** Cualquier dirección puede operar facturas o carritos ajenos enviando un `_customer` arbitrario.  
**Solución Propuesta:**
Insertar verificaciones explícitas de identidad en todas las funciones receptoras de `_customer`:
```solidity
modifier onlyCustomerOrAdmin(address _customer) {
    require(msg.sender == _customer || msg.sender == owner(), "AccessControl: Caller is not the customer nor admin");
    _;
}

function clearCart(address _customer) external onlyCustomerOrAdmin(_customer) {
    // Lógica segura de vaciado
}
```

---

### 🟠 2.3. Validación de Stock Acumulado en Carrito
**Problema:** Se verifica el stock individual sin considerar las unidades que el cliente ya agregó previamente.  
**Solución Propuesta:**
Modificar la librería del carrito para sumar la cantidad preexistente:
```solidity
uint256 currentInCart = getCartProductQuantity(_customer, _productId);
require(product.stock >= currentInCart + _quantity, "StockExceeded: Total in cart exceeds available stock");
```

---

### 🟠 2.4. Control de KYC y Reputación Anti Review-Bombing
**Problema:** Autoregistro otorga KYC verificado automático, y calificaciones sin compras previas.  
**Solución Propuesta:**
1. `registerCustomerSelf` establece `isKYCVerified = false` (Pendiente de Validación).
2. Se habilita la función administrativa `verifyKYC(address _user, bool _status)` para otorgar verificación.
3. `rateCompany` valida que el cliente tenga al menos 1 factura pagada (`isPaid == true`) con esa empresa:
   ```solidity
   function rateCompany(uint256 _companyId, uint8 _rating, string memory _comment) external {
       require(_rating >= 1 && _rating <= 5, "Rating must be between 1 and 5");
       require(hasPaidInvoiceWithCompany(msg.sender, _companyId), "ReviewDenied: Customer has no verified purchase with this company");
       // Almacenar review
   }
   ```

---

### 🟠 2.5. Resolución de Disputas y Liberación de Custodia Escrow (`resolveDisputeReleaseEscrow`)
**Problema:** Si el comprador no confirma la entrega, los fondos de la empresa quedan bloqueados en custodia permanentemente.  
**Solución Propuesta:**
Añadir una función de arbitraje resguardada por el Administrador de la Plataforma:
```solidity
function resolveDisputeReleaseEscrow(uint256 _invoiceId) external onlyOwner nonReentrant {
    Invoice storage invoice = invoices[_invoiceId];
    require(invoice.isPaid, "Invoice not paid");
    require(invoice.status == OrderStatus.Shipped, "Order must be shipped to resolve dispute");

    invoice.status = OrderStatus.Delivered;
    Company storage company = companies[invoice.companyId];
    
    require(euroToken.transfer(company.companyAddress, invoice.totalAmount), "Dispute release failed");
    emit DisputeResolved(_invoiceId, company.companyAddress, invoice.totalAmount);
}
```

---

### 🔴 2.6. Corrección de Sintaxis de Arrays Memory
**Problema:** Arrays instanciados en memoria sin especificar longitud (`new Company`).  
**Solución Propuesta:**
Reemplazar globalmente en todas las librerías por la sintaxis estricta de Solidity `new Type[](length)`:
```solidity
Company[] memory allCompanies = new Company[](totalCompanies);
```

---

## 💻 3. Soluciones en el Frontend (`web-customer` / `web-admin`)

1. **Manejo Atómico de Sincronización de Carrito (`syncGuestCartToContract`):**  
   Reemplazar la captura silenciosa `console.warn` por un flujo transaccional atómico. Si un ítem falla, se detiene la sincronización, se deshacen los cambios locales y se despliega una notificación Toast de error claro.
2. **Caché Local de Productos y Boteo RPC (`getProductsBatch`):**  
   Implementar un estado de caché `Map<productId, Product>` en React para evitar peticiones RPC redundantes por cada producto renderizado en el carrito o catálogo.

---

## 🚀 4. Plan de Ejecución y Hoja de Ruta

```text
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                     HOJA DE RUTA DE IMPLEMENTACIÓN Y VERIFICACIÓN                      │
 ├──────────────┬──────────────────────────────────────────┬──────────────────────────────┤
 │ FASE         │ ACCIONES PRINCIPALES                     │ ACTIVIDAD DE VERIFICACIÓN    │
 ├──────────────┼──────────────────────────────────────────┼──────────────────────────────┤
 │ Fase 1 (Día 1)│ Parche ReentrancyGuard, AccessControl y  │ `forge build` & `forge test` │
 │              │ corrección de arrays memory.             │                              │
 ├──────────────┼──────────────────────────────────────────┼──────────────────────────────┤
 │ Fase 2 (Día 2)│ Lógica Anti Review-Bombing, KYC seguro,  │ Pruebas Unitarias Foundry    │
 │              │ Stock acumulado y resolución de disputa. │ de límites de negocio.       │
 ├──────────────┼──────────────────────────────────────────┼──────────────────────────────┤
 │ Fase 3 (Día 3)│ Refactorización frontend `useCart` con   │ Pruebas de integración E2E   │
 │              │ Toasts de error y caché RPC.             │ en navegador local.          │
 └──────────────┴──────────────────────────────────────────┴──────────────────────────────┘
```
