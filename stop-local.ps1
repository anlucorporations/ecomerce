# ==============================================================================
# Script para Detener toda la Plataforma: BARLO-VENTAS E-Commerce Web3 (Windows)
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Yellow
Write-Host "   🛑 DETENIENDO TODOS LOS SERVICIOS DE BARLO-VENTAS EN LOCAL         " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Yellow
Write-Host ""

# 1. Detener nodo Anvil en WSL
Write-Host "[1/3] Deteniendo nodo blockchain Anvil en WSL..." -ForegroundColor Cyan
try {
    wsl pkill anvil 2>$null
} catch {}

# 2. Detener procesos Node.js (Web Admin, Customer, Pasarela, Compra)
Write-Host "[2/3] Deteniendo servidores web Next.js y procesos Node..." -ForegroundColor Cyan
Stop-Process -Name node -Force -ErrorAction SilentlyContinue 2>$null

# 3. Liberar y verificar puertos (8545, 3000, 3001, 3002, 3003)
Write-Host "[3/3] Liberando puertos..." -ForegroundColor Cyan
$ports = @(8545, 3000, 3001, 3002, 3003)
foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($conn in $conns) {
                if ($conn.OwningProcess -gt 0) {
                    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue 2>$null
                }
            }
        }
    } catch {}
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "   ✅ TODOS LOS SERVICIOS HAN SIDO DETENIDOS Y PUERTOS LIBERADOS      " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
