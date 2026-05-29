# Sistema Distribuido — CRUD Persona

> gRPC · HTTP Vanilla · Load Balancer propio · Docker Compose · 5 contenedores · Node.js ES Modules

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
(`DB_URL`, `PORT`). Ningún componente contiene lógica ni referencias directas de
otro.

```
┌──────────────┐         HTTP/REST         ┌─────────────────────────────┐
│   Browser    │ ─────────────────────────▶ │   web-server   :3000        │
└──────────────┘                            │   node:http · sirve UI + API │
                                            └───────────────┬─────────────┘
                                                            │ elige nodo con menor score
                                                            │ (GetMetrics vía gRPC)
                                                            ▼
                                             ┌──────────────────────────┐
                                             │      balancer interno     │
                                             │   Promise.allSettled()    │
                                             └──┬─────────┬─────────┬───┘
                                                │ gRPC    │ gRPC    │ gRPC
                                                ▼         ▼         ▼
                                        ┌──────────┐ ┌──────────┐ ┌──────────┐
                                        │service-1 │ │service-2 │ │service-3 │
                                        │  :50051  │ │  :50052  │ │  :50053  │
                                        └────┬─────┘ └────┬─────┘ └────┬─────┘
                                             │             │             │
                                             └─────────────┼─────────────┘
                                                           │ HTTP interno (fetch)
                                                           ▼
                                                  ┌────────────────┐
                                                  │  db-service    │
                                                  │    :4000       │
                                                  │  Map in-memory │
                                                  └────────────────┘
```

**¿Por qué HTTP para `db-service` y gRPC para los nodos?**
Los service nodes son servidores gRPC. Para la capa de datos interna, `node:http`
con JSON es suficiente y deja claro el contraste de protocolos: gRPC para
comunicación de alta performance entre el balanceador y los nodos de servicio;
HTTP para la comunicación interna simple al microservicio de datos.

---

## Componentes

| Contenedor   | Puerto | Protocolo | Rol                                               |
|--------------|--------|-----------|---------------------------------------------------|
| `db-service` | 4000   | HTTP      | Dueño único de los datos. Map in-memory + mock data. |
| `service-1`  | 50051  | gRPC      | Nodo de servicio — CRUD + GetMetrics              |
| `service-2`  | 50052  | gRPC      | Nodo de servicio — CRUD + GetMetrics              |
| `service-3`  | 50053  | gRPC      | Nodo de servicio — CRUD + GetMetrics              |
| `web-server` | 3000   | HTTP      | Punto de entrada público. Sirve UI y API REST.    |

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
- **Contenedores**: Docker + Docker Compose

---

## Cómo ejecutar

```bash
docker compose up --build
```

Abrir `http://localhost:3000` en el browser.

---

## Tolerancia a fallos

Con el sistema corriendo, bajar un nodo en vivo:

```bash
# Bajar service-1
docker stop <nombre_proyecto>-service-1-1

# El sistema sigue respondiendo desde service-2 o service-3
# El header X-Node en las respuestas HTTP confirma qué nodo atendió

# Recuperar el nodo
docker start <nombre_proyecto>-service-1-1
```

---

## Equipo

Carlos · Abraham · Rainny
