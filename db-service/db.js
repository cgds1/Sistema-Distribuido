// db-service/db.js

class Database {
  constructor() {
    this.personas = new Map();
    this._cargarMockData();
  }

  _cargarMockData() {
    const mockData = [
      { ci: "25111222", nombre: "Ana", apellido: "Rodríguez" },
      { ci: "26333444", nombre: "Luis", apellido: "González" },
      { ci: "27555666", nombre: "Sofía", apellido: "Martínez" },
      { ci: "28777888", nombre: "Carlos", apellido: "Pérez" },
      { ci: "29999000", nombre: "María", apellido: "López" }
    ];

    mockData.forEach(persona => {
      this.personas.set(persona.ci, persona);
    });
  }

  getAll() {
    return Array.from(this.personas.values());
  }

  get(ci) {
    return this.personas.get(ci);
  }

  exists(ci) {
    return this.personas.has(ci);
  }

  create(persona) {
    this.personas.set(persona.ci, persona);
    return persona;
  }

  update(ci, datos) {
    const persona = this.personas.get(ci);
    if (!persona) return null;

    const personaActualizada = { ...persona, ...datos };
    this.personas.set(ci, personaActualizada);
    return personaActualizada;
  }

  delete(ci) {
    return this.personas.delete(ci);
  }
}

export const db = new Database();