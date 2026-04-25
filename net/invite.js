import Hyperswarm from 'hyperswarm'
import { topicFromInvite } from './transport.js'

// Both sides join the same Hyperswarm topic derived from the invite code.
// First connection wins; we destroy the swarm immediately so the topic
// is short-lived and not reusable.

export function openInvite (inviteCode, { swarm } = {}) {
  return joinInviteSwarm(inviteCode, { swarm, role: 'owner' })
}

export function acceptInvite (inviteCode, { swarm } = {}) {
  return joinInviteSwarm(inviteCode, { swarm, role: 'guardian' })
}

function joinInviteSwarm (inviteCode, { swarm, role }) {
  const topic = topicFromInvite(inviteCode)
  const topicHex = topic.toString('hex').slice(0, 12)
  const sw = swarm || new Hyperswarm()
  const ownsSwarm = !swarm

  console.log(`[invite/${role}] joining swarm topic ${topicHex}…`)

  return new Promise((resolve, reject) => {
    let settled = false
    const onConnection = async (conn, info) => {
      if (settled) {
        console.log(`[invite/${role}] extra connection on topic ${topicHex} — discarding`)
        try { conn.end() } catch {}
        return
      }
      settled = true
      sw.off('connection', onConnection)
      console.log(`[invite/${role}] peer connected on topic ${topicHex}`)

      const close = async () => {
        await discovery.destroy().catch(() => {})
        if (ownsSwarm) await sw.destroy().catch(() => {})
      }
      conn.on('close', () => console.log(`[invite/${role}] connection closed topic ${topicHex}`))
      conn.on('error', (err) => console.log(`[invite/${role}] connection error topic ${topicHex}: ${err.message}`))
      conn.on('close', close)

      resolve({ stream: conn, info, role, close })
    }
    sw.on('connection', onConnection)

    const discovery = sw.join(topic, { server: true, client: true })

    discovery.flushed()
      .then(() => console.log(`[invite/${role}] DHT flush done for topic ${topicHex}`))
      .catch(() => {})

    setTimeout(() => {
      if (!settled) {
        settled = true
        sw.off('connection', onConnection)
        discovery.destroy().catch(() => {})
        if (ownsSwarm) sw.destroy().catch(() => {})
        console.log(`[invite/${role}] handshake timeout for topic ${topicHex}`)
        reject(new Error('invite handshake timeout'))
      }
    }, 5 * 60 * 1000)
  })
}
