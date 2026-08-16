# Informe Técnico de Despliegue en Google Cloud Platform (GCP)
## Proyecto: `mcc-ecommerce` | Rama: `BarloVentas-GCP`
**Fecha de Despliegue:** 16 de Agosto de 2026  
**Organización / Cuenta SuperUser:** `anlucorporations@gmail.com`  
**Región GCP Predeterminada:** `europe-west1` (Madrid / Europa Occidental)  
**ID del Proyecto GCP:** `mcc-ecommerce` (`1095249147821`)

---

## 🌐 Resumen de Infraestructura Desplegada en GCP (Cloud Run)

| Microservicio / Recurso | Imagen Docker / Motor | Puerto | Acceso / Endpoint GCP URL | Visibilidad / Permisos |
| :--- | :--- | :--- | :--- | :--- |
| **Foundry Anvil RPC** (`mcc-foundry-anvil`) | `ghcr.io/foundry-rs/foundry:latest` | `8545` | `https://mcc-foundry-anvil-1095249147821.europe-west1.run.app` | 🔒 **Privado / Interno GCP** (Requiere Bearer Auth `gcloud auth print-identity-token`) |
| **PostgreSQL 16 Engine** (`mcc-postgres`) | `postgres:16-alpine` | `5432` | `https://mcc-postgres-1095249147821.europe-west1.run.app` | 🌐 **Acceso Público / Conector Multi-Proyecto** |
| **pgAdmin 4 Modeler UI** (`mcc-pgadmin`) | `dpage/pgadmin4:latest` | `80` | `https://mcc-pgadmin-1095249147821.europe-west1.run.app` | 🌐 **Modelador Web UI Interactivo** |
| **Web Admin Console** (`mcc-web-admin`) | `mcc-web-admin:latest` | `3000` | `https://mcc-web-admin-1095249147821.europe-west1.run.app` | 🌐 **Público (Stripe / Auditoría / Envíos / Facturas)** |
| **Web Customer Storefront** (`mcc-web-customer`) | `mcc-web-customer:latest` | `3001` | `https://mcc-web-customer-1095249147821.europe-west1.run.app` | 🌐 **Público (Tienda E-Commerce / Carrito / Pedidos)** |
| **Pasarela Escrow Web3** (`mcc-pasarela`) | `mcc-pasarela:latest` | `3002` | `https://mcc-pasarela-1095249147821.europe-west1.run.app` | 🌐 **Público (Pagos Escrow)** |
| **Compra Stablecoin Stripe** (`mcc-compra-stablecoin`) | `mcc-compra-stablecoin:latest` | `3003` | `https://mcc-compra-stablecoin-1095249147821.europe-west1.run.app` | 🌐 **Público (Pasarela FIAT EURT)** |

---

## 🔑 Credenciales & Modos de Acceso

### 1. Base de Datos PostgreSQL 16 (`mcc-postgres` & `mcc-pgadmin`)
- **Host / Endpoint URL:** `mcc-postgres-1095249147821.europe-west1.run.app`
- **Puerto:** `5432`
- **Base de Datos por Defecto:** `mcc_ecommerce_db`
- **Usuario Root SuperUser:** `anlucorporations`
- **Contraseña Root:** `KeLuDa.2324`
- **Cadena de Conexión (DATABASE_URL):**
  ```bash
  DATABASE_URL="postgresql://anlucorporations:KeLuDa.2324@mcc-postgres-1095249147821.europe-west1.run.app:5432/mcc_ecommerce_db?schema=public"
  ```

### 2. Consola Web pgAdmin 4 (Modelador de Base de Datos Multi-Proyecto)
- **URL de Acceso Web:** `https://mcc-pgadmin-1095249147821.europe-west1.run.app`
- **Email de Inicio de Sesión:** `anlucorporations@gmail.com`
- **Contraseña pgAdmin:** `KeLuDa.2324`
- **Instrucciones para Registrar Servidor en pgAdmin 4:**
  1. Abrir `https://mcc-pgadmin-1095249147821.europe-west1.run.app` e iniciar sesión.
  2. Hacer clic en **Add New Server**.
  3. En *Name*: Escribir `PostgreSQL GCP Multi-Proyecto`.
  4. En la pestaña *Connection*:
     - **Host name/address:** `mcc-postgres-1095249147821.europe-west1.run.app`
     - **Port:** `5432`
     - **Maintenance database:** `mcc_ecommerce_db`
     - **Username:** `anlucorporations`
     - **Password:** `KeLuDa.2324`
  5. Guardar. El modelador gráfico diagramará todas las tablas y esquemas en tiempo real.

### 3. Nodo Blockchain Foundry Anvil (`mcc-foundry-anvil`)
- **Endpoint RPC Privado:** `https://mcc-foundry-anvil-1095249147821.europe-west1.run.app`
- **Chain ID:** `31337`
- **Acceso Autorizado:** Únicamente desde microservicios e identidades de tu cuenta GCP.
- **Ejemplo de consulta por Terminal local (gcloud Bearer token):**
  ```bash
  curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
       -H "Content-Type: application/json" \
       -X POST \
       --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
       https://mcc-foundry-anvil-1095249147821.europe-west1.run.app
  ```

---

## 📑 Direcciones de Smart Contracts en GCP
- **Contrato Principal Ecommerce:** `0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650`
- **Contrato Stablecoin EuroToken (EURT):** `0x5FbDB2315678afecb367f032d93F642f64180aa3`

---

## 🎨 Registro de Contenedores Artifact Registry
- **URL del Repositorio:** `europe-west1-docker.pkg.dev/mcc-ecommerce/mcc-ecommerce-repo`
- **Formato:** Contenedores OCI / Docker
- **Imágenes Registradas:**
  - `mcc-foundry-anvil:latest`
  - `mcc-postgres:latest`
  - `mcc-pgadmin:latest`
  - `mcc-web-admin:latest`
  - `mcc-web-customer:latest`
  - `mcc-pasarela:latest`
  - `mcc-compra-stablecoin:latest`
