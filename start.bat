@echo off
title PiMusic - Local YouTube Downloader & Streamer
echo ======================================================================
echo          INICIANDO PIMUSIC - SAVEFROM LOCAL & REPRODUCTOR
echo ======================================================================
echo.

:: 1. Iniciar Servidor FastAPI en segundo plano en puerto 5000
echo [*] Iniciando Servidor API en puerto 5000...
start "PiMusic Backend (FastAPI)" cmd /k "python server\run_server.py"

:: 2. Iniciar Frontend Vite en puerto 3000
echo [*] Iniciando Frontend Web en puerto 3000...
start "PiMusic Frontend (Vite)" cmd /k "npm run dev"

echo.
echo ======================================================================
echo  Frontend disponible en:  http://localhost:3000
echo  Backend disponible en:   http://localhost:5000
echo.
echo  Para acceder desde tu movil o tablet en la red local:
echo  Usa http://[IP-DE-TU-PC]:3000
echo ======================================================================
pause
