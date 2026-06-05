import os from 'node:os'

const timestamps = []

export const counter = {
  active: 0,
  recordRequest() {
    timestamps.push(Date.now())
  },
  getRps() {
    const cutoff = Date.now() - 10_000
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift()
    }
    return timestamps.length / 10
  }
}

export function getMetricsHandler(_, callback) {
  const cpus = os.cpus()
  callback(null, {
    cpu_count:     cpus.length,
    cpu_speed_mhz: cpus[0].speed,
    free_mem_mb:   os.freemem() / 1024 / 1024,
    active_conns:  counter.active,
    avg_rps:       counter.getRps(),
  })
}
