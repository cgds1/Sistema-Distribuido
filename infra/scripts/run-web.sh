#!/usr/bin/env bash

# --- Config (editar con las IPs LAN reales antes de ejecutar) ---
export PORT=3000
export NODES=IP_A:50051,IP_B:50052,IP_C:50053
# ----------------------------------------------------------------

node web-server/index.js