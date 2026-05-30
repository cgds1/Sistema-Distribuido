// db-service/index.js
import http from 'node:http';
import { route } from './router.js';

const PORT = process.env.PORT ?? 4000;

const server = http.createServer((req, res) => {
  route(req, res);
});

server.listen(PORT, () => {
  console.log(`[db-service] Servidor de datos corriendo en el puerto :${PORT}`);
});