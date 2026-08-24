# ============================================================================
# deploy-gcp.ps1 — Despliegue BARLO-VENTAS en GCP (Cloud Run + Secret Manager)
# Proyecto: mcc-ecommerce | Región: europe-west1
# Requiere: gcloud autenticado (anlucorporations@gmail.com) + Cloud Build habilitado
# Uso: powershell -File scripts/deploy-gcp.ps1 [-BuildOnly] [-DeployOnly]
# ============================================================================
param(
  [switch]$BuildOnly,
  [switch]$DeployOnly
)

$ErrorActionPreference = "Stop"
$PROJ = "mcc-ecommerce"
$REGION = "europe-west1"
$REPO = "europe-west1-docker.pkg.dev/$PROJ/mcc-ecommerce-repo"
$RPC = "https://mcc-foundry-anvil-1095249147821.europe-west1.run.app"
$ECOM = "0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0"
$EURO = "0xb7f8bc63bbcad18155201308c8f3540b07f84f5e"
$WEB_ADMIN = "https://mcc-web-admin-1095249147821.europe-west1.run.app"
$WEB_CUSTOMER = "https://mcc-web-customer-1095249147821.europe-west1.run.app"
$PASARELA = "https://mcc-pasarela-1095249147821.europe-west1.run.app"
$COMPRA = "https://mcc-compra-stablecoin-1095249147821.europe-west1.run.app"
$STRIPE_PUB = "pk_test_51U33mX3SsKtEjZCdpMF89LCgtK9HZkvxMZPoUtuuVRnwWbSuinuPRyp6xZvZWZBX9Sso9QPhM1cF9UR5BUKFQu0T00mGHzQ97f"

$SUBS = "_SERVICE={0},_RPC_URL={1},_ECOM={2},_EURO={3},_WEB_ADMIN={4},_WEB_CUSTOMER={5},_PASARELA={6},_COMPRA={7},_STRIPE_PUB={8}" -f "SVC",$RPC,$ECOM,$EURO,$WEB_ADMIN,$WEB_CUSTOMER,$PASARELA,$COMPRA,$STRIPE_PUB

function Build-App {
  param([string]$Name, [string]$Dir)
  Write-Host "`n[BUILD] $Name ..."
  $s = $SUBS.Replace("SVC", $Name)
  gcloud builds submit --config cloudbuild.yaml --project=$PROJ --substitutions=$s --timeout=20m $Dir 2>&1 | Select-Object -Last 2
  if ($LASTEXITCODE -ne 0) { throw "Build falló para $Name" }
}

if (-not $DeployOnly) {
  Build-App "mcc-web-admin" "web-admin"
  Build-App "mcc-web-customer" "web-customer"
  Build-App "mcc-pasarela" "stablecoin/pasarela-de-pago"
  Build-App "mcc-compra-stablecoin" "stablecoin/compra-stablecoin"
}

if ($BuildOnly) { Write-Host "`n[OK] Builds completados."; exit 0 }

# ============================================================================
# DEPLOY Cloud Run
# ============================================================================
Write-Host "`n[DEPLOY] Servicios Cloud Run ..."

# --- web-admin (público) ---
gcloud run deploy mcc-web-admin --project=$PROJ --region=$REGION --image="$REPO/mcc-web-admin:latest" `
  --allow-unauthenticated --port=3000 --cpu=1 --memory=512Mi --min-instances=0 --max-instances=10 2>&1 | Select-Object -Last 3
if ($LASTEXITCODE -ne 0) { throw "Deploy web-admin falló" }

# --- web-customer (público) + ADMIN_PRIVATE_KEY desde Secret Manager ---
gcloud run deploy mcc-web-customer --project=$PROJ --region=$REGION --image="$REPO/mcc-web-customer:latest" `
  --allow-unauthenticated --port=3001 --cpu=1 --memory=512Mi --min-instances=0 --max-instances=10 `
  --set-secrets="ADMIN_PRIVATE_KEY=ADMIN_PRIVATE_KEY:1" 2>&1 | Select-Object -Last 3
if ($LASTEXITCODE -ne 0) { throw "Deploy web-customer falló" }

# --- pasarela (público) ---
gcloud run deploy mcc-pasarela --project=$PROJ --region=$REGION --image="$REPO/mcc-pasarela:latest" `
  --allow-unauthenticated --port=3002 --cpu=1 --memory=512Mi --min-instances=0 --max-instances=10 2>&1 | Select-Object -Last 3
if ($LASTEXITCODE -ne 0) { throw "Deploy pasarela falló" }

# --- compra-stablecoin (público) + secretos Stripe/Relayer + CORS ---
$origins = "$WEB_ADMIN,$WEB_CUSTOMER,$COMPRA,http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003"
gcloud run deploy mcc-compra-stablecoin --project=$PROJ --region=$REGION --image="$REPO/mcc-compra-stablecoin:latest" `
  --allow-unauthenticated --port=3003 --cpu=1 --memory=512Mi --min-instances=0 --max-instances=10 `
  --set-secrets="STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:1,RELAYER_PRIVATE_KEY=RELAYER_PRIVATE_KEY:1" `
  --set-env-vars="ALLOWED_ORIGINS=$origins" 2>&1 | Select-Object -Last 3
if ($LASTEXITCODE -ne 0) { throw "Deploy compra falló" }

# --- postgres: contraseña desde Secret Manager (metodología GCP) ---
gcloud run deploy mcc-postgres --project=$PROJ --region=$REGION --image="$REPO/mcc-postgres:latest" `
  --port=5432 --cpu=1 --memory=512Mi --max-instances=1 `
  --set-secrets="POSTGRES_PASSWORD=POSTGRES_PASSWORD:1" 2>&1 | Select-Object -Last 2

# --- pgadmin: contraseña desde Secret Manager ---
gcloud run deploy mcc-pgadmin --project=$PROJ --region=$REGION --image="dpage/pgadmin4:latest" `
  --port=80 --cpu=1 --memory=512Mi --max-instances=1 `
  --set-env-vars="PGADMIN_DEFAULT_EMAIL=anlucorporations@gmail.com" `
  --set-secrets="PGADMIN_DEFAULT_PASSWORD=PGADMIN_PASSWORD:1" 2>&1 | Select-Object -Last 2

Write-Host "`n[DEPLOY] Completado."
