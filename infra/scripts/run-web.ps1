# --- Config (editar con las IPs LAN reales antes de ejecutar) ---
$env:PORT  = "3000"
$env:NODES = "IP_A:50051,IP_B:50052,IP_C:50053"
# ----------------------------------------------------------------

node web-server/index.js