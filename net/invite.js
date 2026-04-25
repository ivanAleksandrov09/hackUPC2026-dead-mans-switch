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
  const sw = swarm || new Hyperswarm()
  const ownsSwarm = !swarm

  return new Promise((resolve, reject) => {
    let settled = false
    const onConnection = async (conn, info) => {
      if (settled) {
        try { conn.end() } catch {}
        return
      }
      settled = true
      sw.off('connection', onConnection)

      const close = async () => {
        await discovery.destroy().catch(() => {})
        if (ownsSwarm) await sw.destroy().catch(() => {})
      }
      conn.on('close', close)
      conn.on('error', () => {})

      resolve({ stream: conn, info, role, close })
    }
    sw.on('connection', onConnection)

    const discovery = sw.join(topic, { server: true, client: true })

    // Nudge: ensure we're announcing/looking up.
    discovery.flushed().catch(() => {})

    setTimeout(() => {
      if (!settled) {
        settled = true
        sw.off('connection', onConnection)
        discovery.destroy().catch(() => {})
        if (ownsSwarm) sw.destroy().catch(() => {})
        reject(new Error('invite handshake timeout'))
      }
    }, 5 * 60 * 1000)
  })
}
