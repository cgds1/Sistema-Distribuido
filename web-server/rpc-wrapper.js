import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// 1. Cargar el proto resolviendo la ruta relativa a este archivo
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROTO_PATH = path.resolve(__dirname, '../proto/persona.proto')

const def = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})

const { PersonaService } = grpc.loadPackageDefinition(def)

// 2. Cache de clientes por dirección
const cache = new Map()

// 3. Devuelve (o crea) el cliente gRPC para una dirección dada
function client(addr) {
  if (!cache.has(addr)) {
    cache.set(addr, new PersonaService(addr, grpc.credentials.createInsecure()))
  }
  return cache.get(addr)
}

// 4. Promisifica un método del cliente con deadline y limpieza de cache
function call(addr, method, payload = {}) {
  const deadline = new Date(Date.now() + 3000) // 3 s timeout
  return new Promise((resolve, reject) => {
    client(addr)[method](payload, { deadline }, (err, response) => {
      if (err) {
        // Conexión rota → borrar del cache para reconectar en el siguiente intento
        cache.delete(addr)
        reject(err)
      } else {
        resolve(response)
      }
    })
  })
}

// 5. API pública — ningún consumidor necesita saber que existe gRPC
export const rpc = {
  create:  (addr, data) => call(addr, 'CreatePersona', data),
  readAll: (addr)       => call(addr, 'ReadPersonas'),
  update:  (addr, data) => call(addr, 'UpdatePersona', data),
  remove:  (addr, data) => call(addr, 'DeletePersona', data),
  metrics: (addr)       => call(addr, 'GetMetrics'),
}
