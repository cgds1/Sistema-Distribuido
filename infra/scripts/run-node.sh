#!/usr/bin/env bash
# M_A → PORT=50051, DB_URL=http://IP_B:4000
# M_B → PORT=50052, DB_URL=http://localhost:4000
# M_C → PORT=50053, DB_URL=http://IP_B:4000

# --- Config por máquina (editar antes de ejecutar) ---
export PORT=50051
export DB_URL=http://IP_B:4000
# -----------------------------------------------------

node service/index.js