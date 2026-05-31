import { DB_URL } from './config.js'

async function httpRequest(url, options = {}) {
  const res = await fetch(url, options)
  const data = await res.json()
  return { status: res.status, data }
}

export const handlers = {
  async CreatePersona({ request }, callback) {
    try {
      const { status, data } = await httpRequest(`${DB_URL}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (status === 201) {
        callback(null, { ok: true, persona: data, message: 'Persona created successfully' })
      } else {
        callback(null, { ok: false, message: data.error ?? 'Error creating persona' })
      }
    } catch (err) {
      callback(err)
    }
  },

  async ReadPersonas(_call, callback) {
    try {
      const { data } = await httpRequest(`${DB_URL}/personas`)
      callback(null, { personas: data })
    } catch (err) {
      callback(err)
    }
  },

  async UpdatePersona({ request }, callback) {
    try {
      const { status, data } = await httpRequest(`${DB_URL}/personas/${request.ci}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (status === 200) {
        callback(null, { ok: true, persona: data, message: 'Persona updated successfully' })
      } else {
        callback(null, { ok: false, message: data.error ?? 'Error updating persona' })
      }
    } catch (err) {
      callback(err)
    }
  },

  async DeletePersona({ request }, callback) {
    try {
      const { status, data } = await httpRequest(`${DB_URL}/personas/${request.ci}`, {
        method: 'DELETE'
      })

      if (status === 200) {
        callback(null, { ok: true, message: data.message ?? 'Persona deleted successfully' })
      } else {
        callback(null, { ok: false, message: data.error ?? 'Error deleting persona' })
      }
    } catch (err) {
      callback(err)
    }
  }
}