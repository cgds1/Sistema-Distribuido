# run-node.ps1 — arranca UN nodo de servicio (proceso Node nativo).
# Editar las 2 líneas de config según la máquina antes de ejecutar.
$ErrorActionPreference = "Stop"

# --- Config por máquina (EDITAR) ---
$env:PORT   = "50051"             # M_A=50051, M_B=50052, M_C=50053
$env:DB_URL = "http://IP_B:4000"  # IP LAN de la máquina con la DB; en M_B usar http://localhost:4000
# -----------------------------------

# Ubicarse en la raíz del proyecto (carpeta padre de este script)
Set-Location (Split-Path -Parent $PSScriptRoot)

node service/index.js
