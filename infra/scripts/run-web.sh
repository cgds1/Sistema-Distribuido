#!/usr/bin/env bash
# run-web.sh — arranca el web-server / balanceador (corre en M_A).
# Editar NODES con las IPs reales de las 3 máquinas antes de ejecutar.
set -euo pipefail

# --- Config (EDITAR) ---
export PORT=3000
export NODES=IP_A:50051,IP_B:50052,IP_C:50053   # IPs LAN de las 3 máquinas
# ------------------------

# Ubicarse en la raíz del proyecto (este script vive en infra/scripts/)
cd "$(dirname "$0")/../.."

node web-server/index.js
