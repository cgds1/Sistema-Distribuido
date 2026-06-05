import { rpc } from './rpc-wrapper.js'

class Balancer {
  constructor() {
    this.nodes = (process.env.NODES ?? 'localhost:50051,localhost:50052,localhost:50053')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  }

  // Capacity metrics (cpu_count, cpu_speed_mhz, free_mem_mb) subtract | more capacity = better (lower score).
  // Load metrics (active_conns, avg_rps) add                          | more load = worse  (higher score).
  _score(m) {
    return (-0.3 * m.cpu_count)
         + (-0.2 * m.cpu_speed_mhz / 1000)
         + (-0.2 * m.free_mem_mb   / 1024)
         + (+0.5 * m.active_conns)
         + (+0.3 * m.avg_rps)
  }

  async pickNode() {
    const results = await Promise.allSettled(
      this.nodes.map(addr => rpc.metrics(addr).then(m => ({ addr, m })))
    )

    const candidates = results
      .filter(r => r.status === 'fulfilled')
      .map(r => ({ ...r.value, score: this._score(r.value.m) }))
      .sort((a, b) => a.score - b.score)

    if (candidates.length === 0) {
      throw new Error('No nodes available')
    }

    return candidates[0]
  }
}

export const balancer = new Balancer()