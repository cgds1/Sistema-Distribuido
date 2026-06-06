// web-server/index.js
import http from 'node:http'
import { handle } from './router.js'

const PORT = process.env.PORT ?? 3000

const server = http.createServer((req, res) => {
  handle(req, res)
})

server.listen(PORT, () => {
  console.log(`[web-server] API REST + UI corriendo en el puerto :${PORT}`)
})
