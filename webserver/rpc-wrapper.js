import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')

// 1. Cargar el proto resolviendo la ruta relativa a este archivo
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const PROTO_PATH = path.resolve(__dirname, '../proto/persona.proto')

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase:     true,
  longs:        String,
  enums:        String,
  defaults:     true,
  oneofs:       true,
})

const { PersonaService } = grpc.loadPackageDefinition(packageDef).persona

// 2. Cache de clientes por dirección
const cache = new Map()

// 3. Devuelve (o crea) el cliente gRPC para una dirección dada
function client(addr) {
  if (!cache.has(addr)) {
    cache.set(addr, new PersonaService(addr, grpc.credentials.createInsecure()))
  }
  return cache.get(addr)
}

// 4. Promisifica un método del cliente
function call(addr, method, payload = {}) {
  return new Promise((resolve, reject) => {
    client(addr)[method](payload, (err, response) => {
      if (err) reject(err)
      else     resolve(response)
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