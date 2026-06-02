# Sistema Distribuido — CRUD Persona

> gRPC · HTTP Vanilla · Load Balancer propio · Despliegue en 3 máquinas (LAN) · 1 contenedor (DB) · Node.js ES Modules

Sistema distribuido que implementa operaciones CRUD sobre una entidad **Persona**
(`ci`, `nombre`, `apellido`). Cada operación es enrutada dinámicamente por un
balanceador de carga propio que selecciona el nodo de servicio con menor carga en
tiempo real. El sistema es tolerante a fallos: si un nodo cae, el balanceador lo
excluye automáticamente y las operaciones siguen siendo procesadas por los nodos
disponibles.

---

## Arquitectura desacoplada

Cada componente es **independiente y reemplazable**. La comunicación entre capas
se define exclusivamente por contrato (`.proto`) o por variables de entorno
(`DB_URL`, `PORT`, `NODES`). Ningún componente contiene lógica ni referencias directas
de otro.

El sistema se despliega en **3 máquinas físicas reales** en la misma red LAN. Cada
máquina corre un nodo de servicio; el balanceador vive en una de ellas y reparte las
operaciones entre los 3 nodos por la red. La **única pieza contenerizada es la base de
datos** (`db-service`): corre en Docker en una máquina y las 3 la acceden por su IP.

```
        M_A (IP_A)                         M_B (IP_B)                  M_C (IP_C)
┌──────────────────────────┐      ┌──────────────────────────┐   ┌──────────────┐
│  Browser                  │      │  db-service (DOCKER)     │   │              │
│     │ HTTP                 │      │     :4000  Map in-memory │   │              │
│     ▼                      │      │        ▲                 │   │              │
│  web-server  :3000         │      │        │ HTTP (fetch)    │   │              │
│  balanceador interno       │      │        │                 │   │              │
│  Promise.allSettled()      │      │  service-2  :50052 ──────┘   │  service-3   │
│        │  gRPC GetMetrics  │      └──────────────────────────┘   │   :50053     │
│        │  elige menor score│                                     └──────┬───────┘
│        ├──────────────────────── gRPC ─────────────────────────────────┘
│        │                   │      (DB_URL = http://IP_B:4000 en cada nodo)
│        ▼                   │      NODES = IP_A:50051,IP_B:50052,IP_C:50053
│  service-1  :50051         │
└──────────────────────────┘
```

> Direcciones: el balanceador conoce a los nodos por la variable `NODES` (IPs LAN); cada
> nodo conoce a la DB por `DB_URL`. Nada se hardcodea: el mismo código corre en local
> (`localhost`) o distribuido (IPs reales) cambiando solo variables de entorno.

**¿Por qué HTTP para `db-service` y gRPC para los nodos?**
Los service nodes son servidores gRPC. Para la capa de datos interna, `node:http`
con JSON es suficiente y deja claro el contraste de protocolos: gRPC para
comunicación de alta performance entre el balanceador y los nodos de servicio;
HTTP para la comunicación interna simple al microservicio de datos.

---

## Componentes

| Componente   | Máquina | Puerto | Protocolo | Rol                                               |
|--------------|---------|--------|-----------|---------------------------------------------------|
| `db-service` | M_B     | 4000   | HTTP      | Dueño único de los datos. **Contenedor Docker** (Map in-memory + mock data). Accesible por las 3 máquinas. |
| `web-server` | M_A     | 3000   | HTTP      | Punto de entrada público + balanceador. Sirve UI y API REST. |
| `service-1`  | M_A     | 50051  | gRPC      | Nodo de servicio — CRUD + GetMetrics              |
| `service-2`  | M_B     | 50052  | gRPC      | Nodo de servicio — CRUD + GetMetrics              |
| `service-3`  | M_C     | 50053  | gRPC      | Nodo de servicio — CRUD + GetMetrics              |

---

## Contrato gRPC (`proto/persona.proto`)

```protobuf
service PersonaService {
  rpc CreatePersona  (PersonaInput) returns (PersonaResponse);
  rpc ReadPersonas   (Empty)        returns (PersonaList);
  rpc UpdatePersona  (PersonaInput) returns (PersonaResponse);
  rpc DeletePersona  (CiRequest)    returns (PersonaResponse);
  rpc GetMetrics     (Empty)        returns (Metrics);
}

message Metrics {
  int32  cpu_count     = 1;
  double cpu_speed_mhz = 2;
  double free_mem_mb   = 3;
  int32  active_conns  = 4;
  double avg_rps       = 5;
}
```

---

## Balanceador de carga

Consulta `GetMetrics` a los 3 nodos en paralelo con `Promise.allSettled()`.
Los nodos que no responden son excluidos automáticamente. El nodo ganador es el
de menor score ponderado:

| Métrica        | Efecto en score | Razonamiento                               |
|----------------|-----------------|---------------------------------------------|
| `cpu_count`    | resta (−)       | Más CPUs → mayor capacidad → preferible     |
| `cpu_speed_mhz`| resta (−)       | Mayor frecuencia → más rápido → preferible  |
| `free_mem_mb`  | resta (−)       | Más memoria libre → menos presión → preferible |
| `active_conns` | suma (+)        | Más conexiones → más ocupado → evitar       |
| `avg_rps`      | suma (+)        | Mayor req/seg → más cargado → evitar        |

La respuesta HTTP incluye los headers `X-Node` y `X-Score` para observabilidad.

---

## Stack técnico

- **Runtime**: Node.js 18+ — ES Modules (`import/export`, sin `require()`)
- **gRPC**: `@grpc/grpc-js` + `@grpc/proto-loader`
- **HTTP**: `node:http` nativo — sin Express ni ningún framework
- **Frontend**: HTML + `fetch()` vanilla — sin frameworks de front
- **Contenedor**: solo `db-service` (Docker). El resto corre como procesos Node nativos
  repartidos en 3 máquinas (LAN). Sin Docker Compose.

---

## Cómo ejecutar

Las 3 máquinas deben estar en la misma red LAN. Obtené la IP de cada una
(`ipconfig` en Windows / `ip addr` en Linux) y abrí los puertos en el firewall
(3000, 4000, 50051-50053). Detalle completo en `docs/fases/08-...md`.

Editá las IPs en los scripts de `scripts/` y ejecutá, en orden:

```bash
# 1) En M_B — base de datos (único contenedor) y su nodo
scripts/run-db.sh         # o scripts/run-db.ps1 en Windows
scripts/run-node.sh       # PORT=50052, DB_URL=http://localhost:4000

# 2) En M_C — nodo de servicio
scripts/run-node.sh       # PORT=50053, DB_URL=http://IP_B:4000

# 3) En M_A — nodo de servicio + web-server/balanceador
scripts/run-node.sh       # PORT=50051, DB_URL=http://IP_B:4000
scripts/run-web.sh        # PORT=3000, NODES=IP_A:50051,IP_B:50052,IP_C:50053
```

Abrir `http://localhost:3000` en M_A (o `http://IP_A:3000` desde otra máquina).

---

## Tolerancia a fallos

Con el sistema corriendo, bajar un nodo en vivo **matando su proceso** en la máquina
correspondiente (no hay Docker para los nodos):

```bash
# En M_C: Ctrl+C en la terminal del nodo, o:
#   Linux:    kill <pid_del_node>
#   Windows:  Stop-Process -Name node   (o por PID)

# El sistema sigue respondiendo desde service-1 o service-2.
# El header X-Node en las respuestas HTTP confirma qué nodo atendió.
# El panel de la UI marca el nodo caído en rojo en ~2s.

# Recuperar: relanzar el nodo en esa máquina
scripts/run-node.sh       # vuelve a verde y recibe requests de nuevo
```

---

## Equipo

Carlos · Abraham · Rainny
