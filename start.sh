#!/usr/bin/env bash
# Script para iniciar PiMusic en Raspberry Pi / Linux

echo "======================================================================"
echo "         INICIANDO PIMUSIC EN RASPBERRY PI / LINUX"
echo "======================================================================"

# Crear directorio de descargas si no existe
mkdir -p downloads

# Exportar variables de entorno si es necesario
export PORT=${PORT:-5000}
export DOWNLOADS_DIR=${DOWNLOADS_DIR:-"./downloads"}

echo "[*] Iniciando backend FastAPI en puerto $PORT..."
python3 server/run_server.py &
BACKEND_PID=$!

echo "[*] Iniciando frontend Vite en modo preview / dev..."
npm run dev -- --host 0.0.0.0 --port 3000 &
FRONT_PID=$!

echo "======================================================================"
echo " PiMusic Backend PID: $BACKEND_PID (http://0.0.0.0:$PORT)"
echo " PiMusic Frontend PID: $FRONT_PID (http://0.0.0.0:3000)"
echo "======================================================================"

# Manejo de parada limpia con Ctrl+C
trap "kill $BACKEND_PID $FRONT_PID; exit" SIGINT SIGTERM
wait
