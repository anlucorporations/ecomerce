@echo off
title Detener Plataforma - BARLO-VENTAS E-Commerce Web3
echo ======================================================================
echo    DETENIENDO TODOS LOS SERVICIOS DE BARLO-VENTAS
echo ======================================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0stop-local.ps1"

pause
