// db-service/router.js
import { db } from './db.js';

class Router {
  constructor() {
    this.personaUrlRegex = /^\/personas\/([a-zA-Z0-9]+)$/;
  }

  _parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(new Error('JSON inválido'));
        }
      });
      req.on('error', (err) => reject(err));
    });
  }

  _sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  async route(req, res) {
    const { method, url } = req;

    try {
      // GET /personas
      if (method === 'GET' && url === '/personas') {
        return this._sendJSON(res, 200, db.getAll());
      }

      // POST /personas
      if (method === 'POST' && url === '/personas') {
        const body = await this._parseBody(req);
        const { ci, nombre, apellido } = body;

        if (!ci || !nombre || !apellido) {
          return this._sendJSON(res, 400, { error: "Todos los campos (ci, nombre, apellido) son requeridos" });
        }

        if (db.exists(ci)) {
          return this._sendJSON(res, 409, { error: `La persona con CI ${ci} ya existe` });
        }

        const nuevaPersona = db.create({ ci, nombre, apellido });
        return this._sendJSON(res, 201, nuevaPersona);
      }

      const match = url.match(this.personaUrlRegex);
      if (match) {
        const ci = match[1];

        // PUT /personas/:ci
        if (method === 'PUT') {
          if (!db.exists(ci)) {
            return this._sendJSON(res, 404, { error: "Persona no encontrada" });
          }

          const body = await this._parseBody(req);
          const { nombre, apellido } = body;

          if (!nombre || !apellido) {
            return this._sendJSON(res, 400, { error: "Los campos nombre y apellido son requeridos" });
          }

          const personaActualizada = db.update(ci, { nombre, apellido });
          return this._sendJSON(res, 200, personaActualizada);
        }

        // DELETE /personas/:ci
        if (method === 'DELETE') {
          if (!db.exists(ci)) {
            return this._sendJSON(res, 404, { error: "Persona no encontrada" });
          }

          db.delete(ci);
          return this._sendJSON(res, 200, { message: `Persona con CI ${ci} eliminada exitosamente` });
        }
      }

      return this._sendJSON(res, 404, { error: "Ruta no encontrada" });

    } catch (error) {
      return this._sendJSON(res, 400, { error: error.message });
    }
  }
}

const routerInstance = new Router();
export const route = (req, res) => routerInstance.route(req, res);