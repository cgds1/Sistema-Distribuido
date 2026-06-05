#!/usr/bin/env bash
# run-db.sh — construye y levanta el contenedor de la base de datos (corre en M_B).
# Requiere Docker. El puerto 4000 se publica a la LAN.
set -euo pipefail

# Ubicarse en la raíz del proyecto (carpeta padre de este script)
cd "$(dirname "$0")/.."

docker build -f Dockerfile.db -t db-service .
docker rm -f db-service 2>/dev/null || true
docker run -d --name db-service -p 4000:4000 db-service

echo "db-service corriendo en :4000 (accesible por la LAN como http://<IP_B>:4000)"
