@echo off
title Despliegue Local - BARLO-VENTAS E-Commerce Web3
echo ======================================================================
echo    INICIANDO DESPLIEGUE AUTOMATICO DE BARLO-VENTAS
echo ======================================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0deploy-local.ps1"

pause
