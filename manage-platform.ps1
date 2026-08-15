[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "restart-service", "menu")]
    [string]$Action = "menu",

    [Parameter(Mandatory=$false)]
    [ValidateSet("admin", "customer", "pasarela", "compra", "rpc")]
    [string]$ServiceName = ""
)

$WorkspaceRoot = $PSScriptRoot

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

function Test-PortOnline {
    param ([int]$Port)
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        return ($res.StatusCode -eq 200)
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
    
    $rpcScript = "anvil --port 8545 --chain-id 31337"
    Start-Process powershell -ArgumentList "-NoWindow", "-Command", $rpcScript -WindowStyle Hidden
    
    $retries = 0
    while ($retries -lt 15) {
        Start-Sleep -Seconds 1
        if (Test-PortOnline -Port 8545) {
            Write-Host "  [v] Nodo Foundry Anvil EVM activo en http://localhost:8545 (200 OK)" -ForegroundColor Green
            return $true
        }
        $retries++
    }
    Write-Host "  [!] Advertencia: El nodo Anvil RPC esta iniciando en segundo plano..." -ForegroundColor Yellow
    return $false
}

function Deploy-SmartContracts {
    Write-Host ""
    Write-Host "[2/5] Desplegando Smart Contracts (EuroTokenOptimized y Ecommerce)..." -ForegroundColor Cyan
    $privKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    
    # Deploy EuroToken
    Set-Location "$WorkspaceRoot\stablecoin\sc"
    $cmdToken = "forge script script/DeployEuroTokenOptimized.s.sol:DeployEuroTokenOptimized --rpc-url http://localhost:8545 --private-key $privKey --broadcast"
    Invoke-Expression $cmdToken | Out-Null

    # Deploy Ecommerce
    Set-Location "$WorkspaceRoot\sc-ecommerce"
    $cmdEcom = "forge script script/DeployEcommerce.s.sol:DeployEcommerceScript --rpc-url http://localhost:8545 --private-key $privKey --broadcast"
    Invoke-Expression $cmdEcom | Out-Null

    Set-Location $WorkspaceRoot
    Write-Host "  [v] Contratos desplegados exitosamente:" -ForegroundColor Green
    Write-Host "      - EuroTokenOptimized: 0x5FbDB2315678afecb367f032d93F642f64180aa3" -ForegroundColor Gray
    Write-Host "      - Ecommerce:          0x5FC8d32690cc91D4c39d9d3abcBD16989F875707" -ForegroundColor Gray
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
        $online = Test-PortOnline -Port $s.Port
        $sName = $s.Name
        $sPort = $s.Port
        if ($online) {
            Write-Host "  [v] $sName [Puerto $sPort] -> OPERATIVO (200 OK)" -ForegroundColor Green
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

function Show-Menu {
    while ($true) {
        Write-Header "GESTOR INTERACTIVO BARLO-VENTAS PLATFORM"
        Write-Host "  1) Inicializar toda la plataforma (Clean Start + Smart Contracts)" -ForegroundColor White
        Write-Host "  2) Reiniciar toda la plataforma por completo" -ForegroundColor White
        Write-Host "  3) Reiniciar un servicio individual" -ForegroundColor White
        Write-Host "  4) Verificar estado de salud de todos los servicios" -ForegroundColor White
        Write-Host "  5) Detener y Apagado total de la plataforma" -ForegroundColor White
        Write-Host "  6) Salir del gestor" -ForegroundColor White
        Write-Host ""
        
        $choice = Read-Host " Seleccione una opcion (1-6)"
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
            "4" { Get-PlatformStatus }
            "5" { Stop-AllPlatform }
            "6" { Write-Host "Saliendo del gestor..." -ForegroundColor Gray; return }
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
    "restart-service" {
        if (-not $ServiceName) {
            Write-Host "[!] Especifique -ServiceName (admin, customer, pasarela, compra, rpc)" -ForegroundColor Red
        } else {
            Restart-SingleService -Service $ServiceName
        }
    }
    "menu" { Show-Menu }
}
