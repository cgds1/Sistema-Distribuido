import os from 'node:os'

const timestamps = []

export const counter = {
  active: 0,
  received: 0,
  handled: 0, // total requests completed
  recordRequest() {
    timestamps.push(Date.now())
    this.received = (this.received || 0) + 1
  },
  getRps() {
    // Instantaneous-ish RPS: count requests in the last 1 second
    const windowMs = 1000
    const cutoff = Date.now() - windowMs
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift()
    }
    // timestamps.length equals requests in the last second
    return timestamps.length
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
    received:      counter.received,
    handled:       counter.handled,
  })
}
