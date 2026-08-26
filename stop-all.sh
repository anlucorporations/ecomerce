#!/bin/bash

echo "======================================================================"
echo "   🛑 DETENIENDO TODOS LOS SERVICIOS DE BARLO-VENTAS (LINUX/WSL)     "
echo "======================================================================"

# Detener Anvil
pkill -f anvil 2>/dev/null || true

# Detener procesos Node.js
pkill -f node 2>/dev/null || true

# Liberar puertos por si quedan hilos huérfanos
fuser -k 8545/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 3002/tcp 2>/dev/null || true
fuser -k 3003/tcp 2>/dev/null || true

echo "✅ Todos los servicios han sido detenidos y los puertos liberados."
