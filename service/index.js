import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { handlers } from './handlers.js'
import { counter, getMetricsHandler } from './metrics.js'

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

const PORT = process.env.PORT
if (!PORT) {
  console.error('ERROR: PORT environment variable is required')
  process.exit(1)
}

function wrap(handler) {
  return function (call, callback) {
    counter.active++
    counter.recordRequest()

    let finished = false
    const finishCounting = () => {
      if (finished) return
      finished = true
      counter.active--
      counter.handled = (counter.handled || 0) + 1
    }

    const wrappedCallback = (err, response) => {
      finishCounting()
      callback(err, response)
    }

    try {
      const maybePromise = handler(call, wrappedCallback)
      if (maybePromise && typeof maybePromise.finally === 'function') {
        maybePromise.finally(() => finishCounting())
      }
    } catch (err) {
      // ensure we count the request even on synchronous handler errors
      wrappedCallback(err)
    }
  }
}

const server = new grpc.Server()

server.addService(PersonaService.service, {
  CreatePersona: wrap(handlers.CreatePersona),
  ReadPersonas:  wrap(handlers.ReadPersonas),
  UpdatePersona: wrap(handlers.UpdatePersona),
  DeletePersona: wrap(handlers.DeletePersona),
  GetMetrics:    getMetricsHandler,
})

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error('Failed to bind server:', err)
    process.exit(1)
  }
  server.start()
  console.log(`gRPC service running on port ${port}`)
})
