# 📕 Manual de Uso General: Plataforma BARLO-VENTAS E-Commerce Web3

**Plataforma BARLO-VENTAS**  
**Versión:** 2.0 (Custodia Escrow On-Chain & Pagos en EuroToken EURT)

---

## 📖 1. Bienvenido al Ecosistema BARLO-VENTAS

**BARLO-VENTAS** es una plataforma de comercio electrónico descentralizada de última generación basada en tecnología **Web3 y Smart Contracts**. Garantiza transacciones 100% transparentes, inmutables y protegidas mediante **Custodia Escrow On-Chain**.

### 💡 Conceptos Clave para el Usuario:
1. **Stablecoin EuroToken (`EURT`):**  
   Es la moneda digital de la plataforma equivalente al Euro (€1.00 EURT = €1.00 EUR). Con ella se pagan las compras en la tienda.
2. **Custodia Escrow On-Chain:**  
   Cuando un comprador realiza un pago, **el dinero NO va inmediatamente a la billetera de la empresa vendedora**, sino que queda bloqueado y protegido dentro del contrato inteligente de la plataforma. Los fondos sólo se transfieren al vendedor cuando el cliente o el administrador confirman la recepción satisfactoria del producto.
3. **Billetera Web3 (MetaMask):**  
   Es la herramienta que permite identificarse, firmar transacciones de compra de forma segura y almacenar el saldo en EURT.

---

## 🗺️ 2. Mapa del Ecosistema y Accesos Rápidos

| Módulo / Portal | Dirección URL Local | Perfil de Usuario Objetivo | Descripción |
| :--- | :---: | :--- | :--- |
| **🛍️ Portal del Cliente (Web Customer)** | `http://localhost:3001` | Compradores / Clientes | Explorar productos, recargar EURT, pagar compras y confirmar entregas. |
| **🖥️ Consola de Administración (Web Admin)** | `http://localhost:3000` | Administradores y Vendedores | Gestionar despachos, ver Ficha Financiera de Usuarios y controlar stock. |
| **💳 Pasarela Web3 Escrow Independiente** | `http://localhost:3002` | Comercios e Integradores | Pasarela de cobro Web3 para compras en comercios aliados. |
| **💶 Recarga FIAT-EURT (Stripe)** | `http://localhost:3003` | Compradores | Compra de tokens EURT con tarjeta de crédito/débito. |

---

## 🚀 3. Guía de Inicio Rápido para Encender la Plataforma

Para arrancar el sistema en una máquina local:

1. Abra una terminal PowerShell en la carpeta raíz del proyecto.
2. Ejecute el comando del orquestador:
   ```powershell
   .\manage-platform.ps1 -Action start
   ```
3. El script iniciará automáticamente los 5 microservicios en segundo plano.

Para apagar la plataforma al finalizar la jornada:
```powershell
.\manage-platform.ps1 -Action stop
```

---

## 📄 4. Índice de Manuales de Uso Específicos por Servicio

Para consultar el manual de uso detallado de cada servicio, revise las siguientes guías:

- 📕 [`sc-ecommerce/MANUAL_DE_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce/MANUAL_DE_USO.md) — Manual del Nodo Blockchain y Smart Contracts.
- 📕 [`web-admin/MANUAL_DE_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-admin/MANUAL_DE_USO.md) — Manual del Administrador y Operador Logístico.
- 📕 [`web-customer/MANUAL_DE_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/web-customer/MANUAL_DE_USO.md) — Manual del Comprador y Portal de Cliente.
- 📕 [`stablecoin/pasarela-de-pago/MANUAL_DE_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/pasarela-de-pago/MANUAL_DE_USO.md) — Manual de Integración de Pasarela Escrow.
- 📕 [`stablecoin/compra-stablecoin/MANUAL_DE_USO.md`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/ecomerce/stablecoin/compra-stablecoin/MANUAL_DE_USO.md) — Manual de Compra de EURT con Tarjeta Stripe.
