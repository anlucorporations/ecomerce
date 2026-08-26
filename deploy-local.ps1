# ==============================================================================
# Script de Despliegue Automático Local: BARLO-VENTAS E-Commerce Web3 (Windows)
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   🚀 INICIANDO DESPLIEGUE AUTOMÁTICO DE LA PLATAFORMA BARLO-VENTAS   " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$RootPath = $PSScriptRoot
if (-not $RootPath) { $RootPath = Get-Location }

# 1. Detener instancias previas
Write-Host "[1/5] Limpiando procesos previos y liberando puertos..." -ForegroundColor Yellow
try {
    wsl pkill anvil 2>$null
} catch {}
Stop-Process -Name node -Force -ErrorAction SilentlyContinue 2>$null
Start-Sleep -Seconds 2

# 2. Iniciar Nodo Blockchain Local Anvil (WSL o Windows)
Write-Host "[2/5] Iniciando nodo Anvil (Chain ID: 31337 en http://127.0.0.1:8545)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "wsl /home/lucci/.foundry/bin/anvil --port 8545 --chain-id 31337 --disable-code-size-limit --host 0.0.0.0" -WindowStyle Minimized
Start-Sleep -Seconds 3

# 3. Desplegar Smart Contracts y Sembrar Datos
Write-Host "[3/5] Compilando contratos y sembrando datos iniciales en la blockchain..." -ForegroundColor Yellow
$DeployCmd = "cd '$RootPath\sc-ecommerce'; forge script script/DeployEcommerce.s.sol:DeployEcommerceScript --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
wsl bash -c "cd /mnt/c/Users/lucci/MasterCodeCripto/GitLab/ecomerce/sc-ecommerce && /home/lucci/.foundry/bin/forge script script/DeployEcommerce.s.sol:DeployEcommerceScript --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# Sembrar datos con Node
Set-Location $RootPath
node scripts/seed-local-data.cjs

# 4. Iniciar Aplicaciones Web (Microservicios)
Write-Host "[4/5] Levantando microservicios y aplicaciones web..." -ForegroundColor Yellow

# Web Admin (Puerto 3000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\web-admin'; Write-Host '--- WEB ADMIN (Puerto 3000) ---' -ForegroundColor Green; npm run dev"

# Web Customer (Puerto 3001)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\web-customer'; Write-Host '--- WEB CUSTOMER (Puerto 3001) ---' -ForegroundColor Green; npm run dev -- -p 3001"

# Pasarela de Pago Web3 (Puerto 3002)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\stablecoin\pasarela-de-pago'; Write-Host '--- PASARELA WEB3 (Puerto 3002) ---' -ForegroundColor Green; npm run dev"

# Compra Stablecoin Stripe (Puerto 3003)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\stablecoin\compra-stablecoin'; Write-Host '--- COMPRA STABLECOIN (Puerto 3003) ---' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "   ✅ PLATAFORMA DESPLEGADA EXITOSAMENTE EN LOCAL                     " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs de Acceso:" -ForegroundColor Cyan
Write-Host "   • Web Admin:             http://localhost:3000" -ForegroundColor White
Write-Host "   • Web Customer (Tienda): http://localhost:3001" -ForegroundColor White
Write-Host "   • Pasarela de Pago:      http://localhost:3002" -ForegroundColor White
Write-Host "   • Compra Stablecoin:     http://localhost:3003" -ForegroundColor White
Write-Host ""
