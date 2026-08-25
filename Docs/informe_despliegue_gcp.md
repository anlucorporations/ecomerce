# Informe Técnico de Despliegue en Google Cloud Platform (GCP)
## Proyecto: `mcc-ecommerce` | Rama: `BarloVentas-deepseek` (adaptación GCP)
**Fecha de Actualización:** 2026-08-24
**Organización / Cuenta SuperUser:** `anlucorporations@gmail.com`
**Región GCP Predeterminada:** `europe-west1` (Madrid / Europa Occidental)
**ID del Proyecto GCP:** `mcc-ecommerce` (`1095249147821`)

---

## 🌐 Resumen de Infraestructura Desplegada en GCP (Cloud Run)

| Microservicio / Recurso | Imagen Docker | Puerto | Endpoint GCP URL | Visibilidad |
| :--- | :--- | :--- | :--- | :--- |
| **Foundry Anvil RPC** (`mcc-foundry-anvil`) | `mcc-foundry-anvil:latest` | `8545` | `https://mcc-foundry-anvil-1095249147821.europe-west1.run.app` | 🔒 Privado (Bearer `gcloud auth print-identity-token`) |
| **PostgreSQL 16 Engine** (`mcc-postgres`) | `mcc-postgres:latest` | `5432` | `https://mcc-postgres-1095249147821.europe-west1.run.app` | 🔒 Interno |
| **pgAdmin 4 Modeler UI** (`mcc-pgadmin`) | `dpage/pgadmin4:latest` | `80` | `https://mcc-pgadmin-1095249147821.europe-west1.run.app` | 🔒 Con auth |
| **Web Admin Console** (`mcc-web-admin`) | `mcc-web-admin:latest` | `3000` | `https://mcc-web-admin-1095249147821.europe-west1.run.app` | 🌐 Público |
| **Web Customer Storefront** (`mcc-web-customer`) | `mcc-web-customer:latest` | `3001` | `https://mcc-web-customer-1095249147821.europe-west1.run.app` | 🌐 Público |
| **Pasarela Escrow Web3** (`mcc-pasarela`) | `mcc-pasarela:latest` | `3002` | `https://mcc-pasarela-1095249147821.europe-west1.run.app` | 🌐 Público |
| **Compra Stablecoin Stripe** (`mcc-compra-stablecoin`) | `mcc-compra-stablecoin:latest` | `3003` | `https://mcc-compra-stablecoin-1095249147821.europe-west1.run.app` | 🌐 Público |

## 🔑 Credenciales — Metodología GCP (Secret Manager)

**Todos los secretos se gestionan en Secret Manager** del proyecto `mcc-ecommerce` y se inyectan a Cloud Run con `--set-secrets` (nunca en imágenes ni código):

| Secreto (Secret Manager) | Uso | Servicio |
| :--- | :--- | :--- |
| `STRIPE_SECRET_KEY` | Clave Stripe (test) para cobrar y mintear EURT | `mcc-compra-stablecoin` |
| `RELAYER_PRIVATE_KEY` | Wallet con `MINTER_ROLE` (relayer de mint) | `mcc-compra-stablecoin` |
| `ADMIN_PRIVATE_KEY` | Owner del contrato Ecommerce (firma `updateKYCStatus`) | `mcc-web-customer` |
| `POSTGRES_PASSWORD` | Contraseña root de PostgreSQL | `mcc-postgres` |
| `PGADMIN_PASSWORD` | Contraseña de pgAdmin | `mcc-pgadmin` |

- **CORS** del API de compra: `ALLOWED_ORIGINS` con los dominios `run.app` + localhost.
- **Variables NEXT_PUBLIC_*** (direcciones, URLs, chainId): inyectadas como `ARG` en el build (Cloud Build → Artifact Registry).

## 📑 Direcciones de Smart Contracts en GCP (desplegadas 2026-08-24)

- **Contrato Principal Ecommerce:** `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`
- **Stablecoin EuroTokenOptimized (EURT):** `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Chain ID:** `31337` · Nodo: `https://mcc-foundry-anvil-1095249147821.europe-west1.run.app` (lectura pública desde navegador)
- Estado: 2 empresas, 10 productos, 2 clientes KYC con 1.000 EURT (seedado).
- **Persistencia:** el estado de Anvil se vuelca cada 30 s a `gs://mcc-ecommerce-anvil-state/anvil-state.json` (GCS FUSE en `/data` con `--load-state`/`--dump-state`) — la cadena sobrevive reinicios.

## 🎨 Registro de Contenedores Artifact Registry
- **URL:** `europe-west1-docker.pkg.dev/mcc-ecommerce/mcc-ecommerce-repo`
- Imágenes: `mcc-web-admin`, `mcc-web-customer`, `mcc-pasarela`, `mcc-compra-stablecoin`, `mcc-foundry-anvil`, `mcc-postgres`, `mcc-pgadmin` (`:latest`).

## 🚀 Despliegue (reproducible)
```bash
# 1. Secretos (una vez)
gcloud secrets create STRIPE_SECRET_KEY --project=mcc-ecommerce --replication-policy=automatic
gcloud secrets versions add STRIPE_SECRET_KEY --data-file=secret.txt --project=mcc-ecommerce
# ... (RELAYER_PRIVATE_KEY, ADMIN_PRIVATE_KEY, POSTGRES_PASSWORD, PGADMIN_PASSWORD)

# 2. Builds (Cloud Build, 4 apps)
powershell -File scripts/deploy-gcp.ps1 -BuildOnly

# 3. Deploy Cloud Run + contratos + seed
powershell -File scripts/deploy-gcp.ps1
node scripts/deploy-gcp-ecommerce.cjs   # (despliega contratos si no existen)
node scripts/seed-local-data.cjs        # con RPC_URL/proxy + NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS
```

> ⚠️ El nodo Anvil de Cloud Run es efímero (sin volumen persistente): si el servicio se reinicia, la cadena se resetea y hay que re-desplegar contratos y seed. Para un nodo persistente, montar un bucket (Cloud Storage FUSE) con `--load-state`/`--dump-state`.
