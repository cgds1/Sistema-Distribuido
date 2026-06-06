# run-db.ps1 — construye y levanta el contenedor de la base de datos (corre en M_B).
# Requiere Docker Desktop. El puerto 4000 se publica a la LAN.
$ErrorActionPreference = "Stop"

# Ubicarse en la raíz del proyecto (este script vive en infra/scripts/)
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

docker build -f infra/Dockerfile.db -t db-service .
docker rm -f db-service 2>$null
docker run -d --name db-service -p 4000:4000 db-service

Write-Host "db-service corriendo en :4000 (accesible por la LAN como http://<IP_B>:4000)"
