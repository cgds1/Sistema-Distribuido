# run-web.ps1 — arranca el web-server / balanceador (corre en M_A).
# Editar NODES con las IPs reales de las 3 máquinas antes de ejecutar.
$ErrorActionPreference = "Stop"

# --- Config (EDITAR) ---
$env:PORT  = "3000"
$env:NODES = "IP_A:50051,IP_B:50052,IP_C:50053"  # IPs LAN de las 3 máquinas
# ------------------------

# Ubicarse en la raíz del proyecto (carpeta padre de este script)
Set-Location (Split-Path -Parent $PSScriptRoot)

node web-server/index.js
