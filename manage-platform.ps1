[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "seed", "restart-service", "menu")]
    [string]$Action = "menu",

    [Parameter(Mandatory=$false)]
    [ValidateSet("admin", "customer", "pasarela", "compra", "rpc")]
    [string]$ServiceName = ""
)

$WorkspaceRoot = $PSScriptRoot

# Direcciones esperadas de un despliegue limpio (EuroTokenOptimized primero, Anvil con --code-size-limit)
$DEFAULT_EURO_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
$DEFAULT_ECOMMERCE_ADDRESS  = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"

function Write-Header {
    param ([string]$Text)
    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor Cyan
    Write-Host "   $Text" -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Cyan
}

function Stop-PortProcess {
    param ([int]$Port)
    $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            if ($conn.OwningProcess -and $conn.OwningProcess -gt 0) {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "  [+] Proceso $($conn.OwningProcess) en puerto $Port detenido." -ForegroundColor DarkGray
            }
        }
    }
}

# Health-check HTTP normal (apps Next.js)
function Test-PortOnline {
    param ([int]$Port)
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        return ($res.StatusCode -eq 200)
    } catch {
        return $false
    }
}

# Health-check JSON-RPC para Anvil (Anvil responde 400 a GET en /, por eso se usa eth_blockNumber POST)
function Test-RpcOnline {
    param ([int]$Port)
    try {
        $body = '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
        $res = Invoke-RestMethod -Uri "http://localhost:$Port" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 3 -ErrorAction Stop
        return ($null -ne $res.result)
    } catch {
        return $false
    }
}

function Stop-AllPlatform {
    Write-Header "DETENIENDO Y APAGANDO TODA LA PLATAFORMA"
    $ports = @(8545, 3000, 3001, 3002, 3003)
    foreach ($port in $ports) {
        Stop-PortProcess -Port $port
    }
    Start-Sleep -Seconds 2
    Write-Host ""
    Write-Host "[v] Apagado total completado. Todos los servicios han sido detenidos." -ForegroundColor Green
}

function Start-RPCNode {
    Write-Host ""
    Write-Host "[1/5] Iniciando Nodo Blockchain EVM (Foundry Anvil RPC - Puerto 8545)..." -ForegroundColor Cyan
    Stop-PortProcess -Port 8545

    # --code-size-limit 100000 es OBLIGATORIO: el bytecode de Ecommerce (28KB) supera el límite EIP-170 (24.576)
    $rpcScript = "anvil --port 8545 --chain-id 31337 --code-size-limit 100000"
    Start-Process powershell -ArgumentList "-NoWindow", "-Command", $rpcScript -WindowStyle Hidden

    $retries = 0
    while ($retries -lt 20) {
        Start-Sleep -Seconds 1
        if (Test-RpcOnline -Port 8545) {
            Write-Host "  [v] Nodo Foundry Anvil EVM activo en http://localhost:8545 (JSON-RPC OK)" -ForegroundColor Green
            return $true
        }
        $retries++
    }
    Write-Host "  [!] Advertencia: El nodo Anvil RPC esta iniciando en segundo plano..." -ForegroundColor Yellow
    return $false
}

function Extract-DeployedAddress {
    param ([string]$Output, [string]$Label)
    $match = [regex]::Match($Output, "$Label\s*(?:deployed at|Contract Address):\s*(0x[0-9a-fA-F]{40})")
    if ($match.Success) { return $match.Groups[1].Value }
    return ""
}

function Deploy-SmartContracts {
    Write-Host ""
    Write-Host "[2/5] Desplegando Smart Contracts (EuroTokenOptimized y Ecommerce)..." -ForegroundColor Cyan
    $privKey = $env:PRIVATE_KEY
    if ([string]::IsNullOrWhiteSpace($privKey)) {
        Write-Host "[ERROR] La variable de entorno PRIVATE_KEY no esta configurada." -ForegroundColor Red
        Write-Host "        Ejemplo: `$env:PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' (solo local)" -ForegroundColor DarkGray
        return
    }

    # 1. Deploy EuroTokenOptimized (el token REAL con MINTER_ROLE; nunca MockEuroToken)
    $euroTokenAddress = ""
    Push-Location "$WorkspaceRoot\stablecoin\sc"
    try {
        $outToken = forge script script/DeployEuroTokenOptimized.s.sol:DeployEuroTokenOptimized --rpc-url http://localhost:8545 --private-key $privKey --broadcast 2>&1 | Out-String
        $euroTokenAddress = Extract-DeployedAddress -Output $outToken -Label "EuroTokenOptimized"
        if ([string]::IsNullOrWhiteSpace($euroTokenAddress)) {
            $match2 = [regex]::Match($outToken, "(0x[0-9a-fA-F]{40})")
            if ($match2.Success) { $euroTokenAddress = $match2.Groups[1].Value }
        }
    } finally {
        Pop-Location
    }
    if ([string]::IsNullOrWhiteSpace($euroTokenAddress)) {
        Write-Host "  [!] No se pudo extraer la direccion del EuroToken; usando default $DEFAULT_EURO_TOKEN_ADDRESS" -ForegroundColor Yellow
        $euroTokenAddress = $DEFAULT_EURO_TOKEN_ADDRESS
    }

    # 2. Deploy Ecommerce pasando EURO_TOKEN_ADDRESS EXPLÍCITO (evita crear MockEuroToken)
    $ecommerceAddress = ""
    $env:EURO_TOKEN_ADDRESS = $euroTokenAddress
    Push-Location "$WorkspaceRoot\sc-ecommerce"
    try {
        $outEcom = forge script script/DeployEcommerce.s.sol:DeployEcommerceScript --rpc-url http://localhost:8545 --private-key $privKey --broadcast 2>&1 | Out-String
        $ecommerceAddress = Extract-DeployedAddress -Output $outEcom -Label "Ecommerce"
        if ([string]::IsNullOrWhiteSpace($ecommerceAddress)) {
            $match2 = [regex]::Match($outEcom, "(0x[0-9a-fA-F]{40})")
            if ($match2.Success) { $ecommerceAddress = $match2.Groups[1].Value }
        }
    } finally {
        Pop-Location
        Remove-Item Env:EURO_TOKEN_ADDRESS -ErrorAction SilentlyContinue
    }
    if ([string]::IsNullOrWhiteSpace($ecommerceAddress)) {
        Write-Host "  [!] No se pudo extraer la direccion de Ecommerce; usando default $DEFAULT_ECOMMERCE_ADDRESS" -ForegroundColor Yellow
        $ecommerceAddress = $DEFAULT_ECOMMERCE_ADDRESS
    }

    Write-Host "  [v] Contratos desplegados:" -ForegroundColor Green
    Write-Host "      - EuroTokenOptimized: $euroTokenAddress" -ForegroundColor Gray
    Write-Host "      - Ecommerce:          $ecommerceAddress" -ForegroundColor Gray

    # 3. Verificación post-deploy on-chain (recomendación M18)
    try {
        $verif = cast call $ecommerceAddress "euroTokenAddress()(address)" --rpc-url http://localhost:8545 2>&1 | Out-String
        Write-Host "      - Verificacion euroTokenAddress() => $($verif.Trim())" -ForegroundColor DarkGray
    } catch {
        Write-Host "  [!] No se pudo verificar euroTokenAddress() on-chain" -ForegroundColor Yellow
    }

    # 4. Escribir .env.local con las direcciones reales (M18)
    $envContent = @"
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS=$ecommerceAddress
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=$euroTokenAddress
"@
    foreach ($app in @("web-admin", "web-customer")) {
        try {
            Set-Content -Path "$WorkspaceRoot\$app\.env.local" -Value $envContent -Encoding UTF8
        } catch { Write-Host "  [!] No se pudo escribir .env.local de $app" -ForegroundColor Yellow }
    }
    $envCompra = @"
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS=$ecommerceAddress
NEXT_PUBLIC_EURO_TOKEN_ADDRESS=$euroTokenAddress
NEXT_PUBLIC_WEB_ADMIN_URL=http://localhost:3000
NEXT_PUBLIC_WEB_CUSTOMER_URL=http://localhost:3001
NEXT_PUBLIC_PASARELA_URL=http://localhost:3002
NEXT_PUBLIC_COMPRA_STABLECOIN_URL=http://localhost:3003
"@
    foreach ($app in @("stablecoin\pasarela-de-pago", "stablecoin\compra-stablecoin")) {
        try {
            Set-Content -Path "$WorkspaceRoot\$app\.env.local" -Value $envCompra -Encoding UTF8
        } catch { Write-Host "  [!] No se pudo escribir .env.local de $app" -ForegroundColor Yellow }
    }
}

function Start-Microservice {
    param (
        [string]$Name,
        [string]$Path,
        [int]$Port,
        [string]$Command
    )
    Write-Host ""
    Write-Host "[*] Iniciando $Name (Puerto $Port)..." -ForegroundColor Cyan
    Stop-PortProcess -Port $Port
    $fullPath = "$WorkspaceRoot\$Path"
    $msScript = "Set-Location '$fullPath'; $Command"
    Start-Process powershell -ArgumentList "-NoWindow", "-Command", $msScript -WindowStyle Hidden
}

function Get-PlatformStatus {
    Write-Header "ESTADO ACTUAL DE LA PLATAFORMA"
    $services = @(
        @{ Name="Nodo Ethereum EVM RPC (Foundry Anvil)"; Port=8545 },
        @{ Name="Web Admin Console"; Port=3000 },
        @{ Name="Web Customer Storefront"; Port=3001 },
        @{ Name="Pasarela Web3 Escrow"; Port=3002 },
        @{ Name="Compra EURT (Stripe)"; Port=3003 }
    )

    foreach ($s in $services) {
        $online = if ($s.Port -eq 8545) { Test-RpcOnline -Port $s.Port } else { Test-PortOnline -Port $s.Port }
        $sName = $s.Name
        $sPort = $s.Port
        if ($online) {
            Write-Host "  [v] $sName [Puerto $sPort] -> OPERATIVO" -ForegroundColor Green
        } else {
            Write-Host "  [x] $sName [Puerto $sPort] -> DETENIDO / INACTIVO" -ForegroundColor Red
        }
    }
}

function Start-AllPlatform {
    Write-Header "INICIALIZANDO TODA LA PLATAFORMA BARLO-VENTAS"

    $ports = @(8545, 3000, 3001, 3002, 3003)
    foreach ($port in $ports) { Stop-PortProcess -Port $port }

    Start-RPCNode | Out-Null
    Deploy-SmartContracts

    Start-Microservice -Name "Compra Stablecoin (Stripe)" -Path "stablecoin\compra-stablecoin" -Port 3003 -Command "npm run dev"
    Start-Microservice -Name "Pasarela Web3 Escrow" -Path "stablecoin\pasarela-de-pago" -Port 3002 -Command "npm run dev"
    Start-Microservice -Name "Web Admin Console" -Path "web-admin" -Port 3000 -Command "npm run dev"
    Start-Microservice -Name "Web Customer Storefront" -Path "web-customer" -Port 3001 -Command "npm run dev -- -p 3001"

    Write-Host ""
    Write-Host "[*] Verificando inicialización de endpoints..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Get-PlatformStatus
}

function Restart-SingleService {
    param ([string]$Service)
    Write-Header "REINICIANDO SERVICIO: $Service"
    switch ($Service) {
        "admin" {
            Start-Microservice -Name "Web Admin Console" -Path "web-admin" -Port 3000 -Command "npm run dev"
        }
        "customer" {
            Start-Microservice -Name "Web Customer Storefront" -Path "web-customer" -Port 3001 -Command "npm run dev -- -p 3001"
        }
        "pasarela" {
            Start-Microservice -Name "Pasarela Web3 Escrow" -Path "stablecoin\pasarela-de-pago" -Port 3002 -Command "npm run dev"
        }
        "compra" {
            Start-Microservice -Name "Compra Stablecoin (Stripe)" -Path "stablecoin\compra-stablecoin" -Port 3003 -Command "npm run dev"
        }
        "rpc" {
            Start-RPCNode | Out-Null
            Deploy-SmartContracts
        }
        default {
            Write-Host "[!] Servicio no valido. Opciones: admin, customer, pasarela, compra, rpc" -ForegroundColor Red
            return
        }
    }
    Start-Sleep -Seconds 6
    Get-PlatformStatus
}

function Seed-LocalData {
    Write-Header "INYECTANDO DATOS DE PRUEBA LOCALES (SEEDING TOOL)"
    Push-Location "$WorkspaceRoot\web-admin"
    try {
        node "$WorkspaceRoot\scripts\seed-local-data.cjs"
    } finally {
        Pop-Location
    }
}

function Show-Menu {
    while ($true) {
        Write-Header "GESTOR INTERACTIVO BARLO-VENTAS PLATFORM"
        Write-Host "  1) Inicializar toda la plataforma (Clean Start + Smart Contracts)" -ForegroundColor White
        Write-Host "  2) Reiniciar toda la plataforma por completo" -ForegroundColor White
        Write-Host "  3) Reiniciar un servicio individual" -ForegroundColor White
        Write-Host "  4) Inyectar datos de prueba locales (Seeding Tool - 2 Empresas, 10 Productos, 2 Clientes + 1000 EURT)" -ForegroundColor Yellow
        Write-Host "  5) Verificar estado de salud de todos los servicios" -ForegroundColor White
        Write-Host "  6) Detener y Apagado total de la plataforma" -ForegroundColor White
        Write-Host "  7) Salir del gestor" - ForegroundColor White
        Write-Host ""

        $choice = Read-Host " Seleccione una opcion (1-7)"
        switch ($choice) {
            "1" { Start-AllPlatform }
            "2" { Start-AllPlatform }
            "3" {
                Write-Host ""
                Write-Host "  Seleccione el servicio a reiniciar:" -ForegroundColor Yellow
                Write-Host "   a) Web Admin Console (3000)"
                Write-Host "   b) Web Customer Storefront (3001)"
                Write-Host "   c) Pasarela Web3 Escrow (3002)"
                Write-Host "   d) Compra EURT Stripe (3003)"
                Write-Host "   e) Nodo EVM RPC + Redeploy Contratos (8545)"
                $sChoice = Read-Host "  Opcion (a-e)"
                switch ($sChoice) {
                    "a" { Restart-SingleService -Service "admin" }
                    "b" { Restart-SingleService -Service "customer" }
                    "c" { Restart-SingleService -Service "pasarela" }
                    "d" { Restart-SingleService -Service "compra" }
                    "e" { Restart-SingleService -Service "rpc" }
                }
            }
            "4" { Seed-LocalData }
            "5" { Get-PlatformStatus }
            "6" { Stop-AllPlatform }
            "7" { Write-Host "Saliendo del gestor..." -ForegroundColor Gray; return }
            default { Write-Host "Opcion invalida." -ForegroundColor Red }
        }

        Write-Host ""
        Write-Host "Presione Enter para continuar..." -ForegroundColor DarkGray
        Read-Host | Out-Null
    }
}

# Main Execution Dispatcher
switch ($Action) {
    "start" { Start-AllPlatform }
    "restart" { Start-AllPlatform }
    "stop" { Stop-AllPlatform }
    "status" { Get-PlatformStatus }
    "seed" { Seed-LocalData }
    "restart-service" {
        if (-not $ServiceName) {
            Write-Host "[!] Especifique -ServiceName (admin, customer, pasarela, compra, rpc)" -ForegroundColor Red
        } else {
            Restart-SingleService -Service $ServiceName
        }
    }
    "menu" { Show-Menu }
}
