import Hyperswarm from 'hyperswarm'
import { heartbeatTopic } from './transport.js'
import b4a from 'b4a'

const ANNOUNCE_INTERVAL_MS = 5 * 1000   // 5s in dev; 60 * 60 * 1000 in prod

export function startHeartbeat ({ ownerKeyPair, swarm, clock }) {
  const topic = heartbeatTopic(ownerKeyPair.publicKey)
  const sw = swarm || new Hyperswarm({ keyPair: ownerKeyPair })
  const ownsSwarm = !swarm
  let seq = 0
  const openConns = new Set()

  const buildPayload = () => b4a.from(JSON.stringify({
    sentAt: clock ? clock.now() : Date.now(),
    seq,
    ownerPubKey: ownerKeyPair.publicKey.toString('hex')
  }))

  const broadcast = () => {
    seq++
    const payload = buildPayload()
    for (const conn of openConns) {
      try { conn.write(payload) } catch {}
    }
  }

  sw.on('connection', (conn) => {
    openConns.add(conn)
    conn.on('close', () => openConns.delete(conn))
    conn.on('error', () => openConns.delete(conn))
    // Drain incoming bytes so the stream doesn't stall.
    conn.resume()
    // Send immediately so the watcher sees us right after connecting.
    seq++
    try { conn.write(buildPayload()) } catch {}
  })

  // Both server + client so we can find each other regardless of NAT side.
  const discovery = sw.join(topic, { server: true, client: true })
  const interval = setInterval(broadcast, ANNOUNCE_INTERVAL_MS)

  const kick = () => {
    broadcast()
    discovery.refresh().catch(() => {})
  }

  return {
    topic,
    kick,
    get seq () { return seq },
    async stop () {
      clearInterval(interval)
      await discovery.destroy().catch(() => {})
      if (ownsSwarm) await sw.destroy().catch(() => {})
    }
  }
}

export function observeHeartbeat ({ ownerPubKey, swarm, onUpdate, clock }) {
  const topic = heartbeatTopic(ownerPubKey)
  const sw = swarm || new Hyperswarm()
  const ownsSwarm = !swarm
  let lastSeenAt = 0
  let stopped = false

  sw.on('connection', (conn) => {
    conn.on('data', () => {
      lastSeenAt = clock ? clock.now() : Date.now()
      try { onUpdate?.(lastSeenAt) } catch {}
    })
    conn.on('error', () => {})
  })

  const discovery = sw.join(topic, { server: true, client: true })

  // Kick off lookup immediately, then refresh periodically in case of drops.
  discovery.flushed().catch(() => {})
  const interval = setInterval(() => {
    if (!stopped) discovery.refresh().catch(() => {})
  }, 30 * 1000)

  return {
    topic,
    get lastSeenAt () { return lastSeenAt },
    async stop () {
      stopped = true
      clearInterval(interval)
      await discovery.destroy().catch(() => {})
      if (ownsSwarm) await sw.destroy().catch(() => {})
    }
  }
}
