import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { balancer } from './balancer.js'
import { rpc } from './rpc-wrapper.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, 'public')

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico':  'image/x-icon',
}

class Router {
  constructor() {
    this.personaUrlRegex = /^\/personas\/([a-zA-Z0-9]+)$/
  }

  _readBody(req) {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        try { resolve(body ? JSON.parse(body) : {}) }
        catch { reject(new Error('JSON inválido')) }
      })
      req.on('error', reject)
    })
  }

  _sendJSON(res, status, data, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
    res.end(JSON.stringify(data))
  }

  // GET /health — estado de TODOS los nodos para el panel de la UI (Fase 07).
  // GET /personas solo golpea el nodo elegido; este endpoint consulta los 3.
  async _health(res) {
    const results = await Promise.allSettled(
      balancer.nodes.map(addr => rpc.metrics(addr).then(m => ({ addr, m })))
    )
    const nodes = balancer.nodes.map((addr, i) => {
      const r = results[i]
      if (r.status === 'fulfilled') {
        return { node: addr, up: true, score: +balancer._score(r.value.m).toFixed(3), metrics: r.value.m }
      }
      return { node: addr, up: false }
    })
    this._sendJSON(res, 200, { nodes })
  }

  // Sirve archivos estáticos desde public/ (lo crea la Fase 07).
  async _serveStatic(req, res) {
    const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0]
    const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath))
    // Evitar path traversal fuera de public/
    if (!filePath.startsWith(PUBLIC_DIR)) {
      return this._sendJSON(res, 403, { error: 'Prohibido' })
    }
    try {
      const content = await readFile(filePath)
      const type = CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': type })
      res.end(content)
    } catch {
      this._sendJSON(res, 404, { error: 'Ruta no encontrada' })
    }
  }

  async handle(req, res) {
    const { method } = req
    const pathname = req.url.split('?')[0]

    // Panel de nodos (no pasa por el balanceador: consulta a todos)
    if (method === 'GET' && pathname === '/health') {
      return this._health(res)
    }

    const isColl = pathname === '/personas'
    const match = pathname.match(this.personaUrlRegex)

    // Rutas de la API: requieren un nodo elegido por el balanceador
    if (isColl || match) {
      let picked
      try {
        picked = await balancer.pickNode()
      } catch (err) {
        // No hay nodos disponibles
        return this._sendJSON(res, 503, { error: err.message })
      }

      const { addr, score } = picked
      const headers = { 'X-Node': addr, 'X-Score': score.toFixed(3) }

      try {
        if (method === 'GET' && isColl) {
          const { personas } = await rpc.readAll(addr)
          return this._sendJSON(res, 200, personas, headers)
        }

        if (method === 'POST' && isColl) {
          const body = await this._readBody(req)
          const result = await rpc.create(addr, body)
          // ok:false => típicamente CI duplicado o campos faltantes
          return this._sendJSON(res, result.ok ? 201 : 409,
            result.ok ? result.persona : { error: result.message }, headers)
        }

        if (method === 'PUT' && match) {
          const ci = match[1]
          const body = await this._readBody(req)
          const result = await rpc.update(addr, { ...body, ci })
          return this._sendJSON(res, result.ok ? 200 : 404,
            result.ok ? result.persona : { error: result.message }, headers)
        }

        if (method === 'DELETE' && match) {
          const ci = match[1]
          const result = await rpc.remove(addr, { ci })
          return this._sendJSON(res, result.ok ? 200 : 404,
            result.ok ? { message: result.message } : { error: result.message }, headers)
        }

        return this._sendJSON(res, 405, { error: 'Método no permitido' }, headers)
      } catch (err) {
        // Error gRPC (p.ej. el nodo elegido cayó durante la operación)
        return this._sendJSON(res, 503, { error: err.message }, headers)
      }
    }

    // Frontend estático (solo GET)
    if (method === 'GET') {
      return this._serveStatic(req, res)
    }

    return this._sendJSON(res, 404, { error: 'Ruta no encontrada' })
  }
}

const router = new Router()
export const handle = (req, res) => router.handle(req, res)
