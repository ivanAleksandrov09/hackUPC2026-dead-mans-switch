// Laptop bridge — runs the real Hyper/crypto stack and exposes it to the
// phone app over a local WebSocket connection.
//
// Usage:
//   npm run bridge          (port 3001 by default)
//   PORT=3002 npm run bridge
//
// The phone app connects to ws://<laptop-LAN-IP>:3001
// Find your LAN IP with: ipconfig (Windows) / ifconfig (Mac/Linux)

import { WebSocketServer } from 'ws'
import hyperCrypto from 'hypercore-crypto'
import b4a from 'b4a'
import * as core from '../core/index.js'
import { startHeartbeat } from '../net/heartbeat.js'
import { generateInviteCode } from '../net/transport.js'

const PORT = parseInt(process.env.PORT || '3001')
const wss = new WebSocketServer({ port: PORT })

const STARTED_AT = new Date().toISOString()
let connCount = 0
let liveSessions = 0

// In-memory invite registry. Both phones in this hackathon setup connect to
// the SAME bridge, so we pair owner and guardian sessions directly here instead
// of relying on Hyperswarm DHT to discover two peers running in the same Node
// process (which is unreliable when bootstrap nodes are slow or firewalled).
//
// code -> { type: 'owner', shardHex, onPaired, timer }
//      |  { type: 'guardian', emitShard, timer }
const localInvites = new Map()
const INVITE_TTL_MS = 10 * 60 * 1000

// Shard cache: if a guardian's WS drops right when the owner sends, the shard
// (plus its metadata) would be silently discarded. Store here so a reconnecting
// guardian gets it immediately on their next acceptInvite call.
const deliveredShards = new Map()  // code -> { shardHex, shardIndex, M, N, deadlineSeconds, ownerGroupKey }

function cacheDeliveredShard (code, meta) {
  deliveredShards.set(code, meta)
  setTimeout(() => deliveredShards.delete(code), INVITE_TTL_MS)
}

function snapshotInvites () {
  if (localInvites.size === 0) return '(none)'
  return [...localInvites.entries()]
    .map(([code, slot]) => `${code.slice(0, 12)}…/${slot.type}`)
    .join(', ')
}

const WS_STATES = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']

// In-memory reconstruction registry. Same rationale as localInvites.
// ownerGroupKey -> [{ sessionId, emit, guardianIndex, shardHex }]
const localReconstructions = new Map()

// All live sessions, for clock-sync broadcast.
const activeSessions = new Map()  // session.id -> { emit }
let globalMultiplier = 1

function makeSession () {
  return {
    id: ++connCount,
    keypair: hyperCrypto.keyPair(),
    heartbeatHandle: null,
    observeHandle: null
  }
}

function tag (session) { return `[bridge #${session.id}]` }

wss.on('connection', (ws) => {
  const session = makeSession()
  liveSessions++
  console.log(`${tag(session)} phone connected (${liveSessions} session(s) live, pending invites: ${snapshotInvites()})`)
  activeSessions.set(session.id, { emit: (...args) => emit(...args) })
  if (globalMultiplier !== 1) setImmediate(() => emit('clockSync', { multiplier: globalMultiplier }))

  const send = (msg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
  }

  const reply = (id, result) => send({ id, result })
  const error = (id, message) => send({ id, error: message })
  const emit = (type, data) => send({ type, ...data })

  ws.on('message', async (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }
    const { id, method, params = {} } = msg

    if (method !== 'kick') console.log(`${tag(session)} → ${method}`)

    try {
      if (method === 'setFastForward') {
        globalMultiplier = params.multiplier
        for (const [sid, s] of activeSessions) {
          if (sid !== session.id) s.emit('clockSync', { multiplier: params.multiplier })
        }
        console.log(`${tag(session)} [clockSync] broadcast multiplier=${params.multiplier} to ${activeSessions.size - 1} other session(s)`)
        reply(id, { ok: true })

      } else if (method === 'generateEstateKey') {
        const ek = core.generateEstateKey()
        reply(id, { ekHex: ek.toString('hex') })

      } else if (method === 'splitKey') {
        const ek = b4a.from(params.ekHex, 'hex')
        const shards = core.splitKey(ek, { M: params.M, N: params.N })
        reply(id, { shards: shards.map((s) => s.toString('hex')) })

      } else if (method === 'encryptEstate') {
        const ek = b4a.from(params.ekHex, 'hex')
        const plaintext = b4a.from(params.text, 'utf8')
        const ct = core.encryptEstate(plaintext, ek)
        reply(id, { ctHex: ct.toString('hex') })

      } else if (method === 'decryptEstate') {
        const ek = b4a.from(params.ekHex, 'hex')
        const ct = b4a.from(params.ctHex, 'hex')
        const pt = core.decryptEstate(ct, ek)
        reply(id, { text: pt.toString('utf8') })

      } else if (method === 'combineKey') {
        const shards = params.shards.map((h) => b4a.from(h, 'hex'))
        const ek = core.combineKey(shards)
        reply(id, { ekHex: ek.toString('hex') })

      } else if (method === 'generateInviteCode') {
        reply(id, { code: generateInviteCode() })

      } else if (method === 'startHeartbeat') {
        if (session.heartbeatHandle) await session.heartbeatHandle.stop()
        const ownerKeyPair = session.keypair
        session.heartbeatHandle = startHeartbeat({ ownerKeyPair })
        reply(id, { ownerPubKey: ownerKeyPair.publicKey.toString('hex') })

      } else if (method === 'kick') {
        // Use the virtual clock time sent by the owner's phone so guardian
        // lastSeenAt stays in sync under fast-forward (bridge runs real time).
        const lastSeenAt = params.lastSeenAt || Date.now()
        for (const [sid, s] of activeSessions) {
          if (sid !== session.id) s.emit('heartbeat', { lastSeenAt })
        }
        reply(id, { ok: true })

      } else if (method === 'observeHeartbeat') {
        // Heartbeats now arrive via the kick broadcast in activeSessions,
        // not via the P2P swarm. This is a no-op — just acknowledge.
        reply(id, { ok: true })

      } else if (method === 'openInvite') {
        const code = params.code
        // Full metadata from the owner — forwarded to the guardian via shardReceived.
        const shardMeta = {
          shardHex:        params.shardHex,
          shardIndex:      params.shardIndex ?? 0,
          M:               params.M,
          N:               params.N,
          deadlineSeconds: params.deadlineSeconds,
          ownerGroupKey:   params.ownerGroupKey,
          vaultCreatedAt:  params.vaultCreatedAt,
          encryptedItems:  params.encryptedItems ?? []
        }
        console.log(`${tag(session)} [openInvite] OWNER — code "${code}", shardIndex=${shardMeta.shardIndex}, M=${shardMeta.M}, N=${shardMeta.N}, deadline=${shardMeta.deadlineSeconds}s, pending: ${snapshotInvites()}`)
        // Reply immediately so the owner phone never times out waiting.
        // Delivery is confirmed via a shardDelivered event sent when the guardian pairs.
        reply(id, { ok: true, waiting: true })

        const notifyDelivered = () => {
          const wsState = WS_STATES[ws.readyState] ?? ws.readyState
          console.log(`${tag(session)} [openInvite] shardDelivered → owner (WS ${wsState}, shardIndex=${shardMeta.shardIndex})`)
          if (ws.readyState === ws.OPEN) emit('shardDelivered', { shardIndex: shardMeta.shardIndex })
        }

        const pending = localInvites.get(code)
        if (pending && pending.type === 'guardian') {
          console.log(`${tag(session)} [openInvite] guardian already waiting — delivering immediately`)
          clearTimeout(pending.timer)
          localInvites.delete(code)
          cacheDeliveredShard(code, shardMeta)
          pending.emitShard(shardMeta)
          notifyDelivered()
        } else {
          console.log(`${tag(session)} [openInvite] no guardian yet — registering owner slot`)
          const slot = { type: 'owner', ...shardMeta, notifyDelivered }
          slot.timer = setTimeout(() => {
            if (localInvites.get(code) === slot) {
              localInvites.delete(code)
              console.log(`${tag(session)} [openInvite] timeout — no guardian connected`)
              if (ws.readyState === ws.OPEN) emit('inviteError', { message: 'no guardian connected within 5 minutes', shardIndex: shardMeta.shardIndex })
            }
          }, INVITE_TTL_MS)
          localInvites.set(code, slot)
        }

      } else if (method === 'acceptInvite') {
        const code = params.code
        console.log(`${tag(session)} [acceptInvite] GUARDIAN — code "${code}", pending: ${snapshotInvites()}, cached: ${deliveredShards.has(code) ? 'YES' : 'no'}`)
        reply(id, { ok: true, waiting: true })

        const emitShard = (meta) => {
          const wsState = WS_STATES[ws.readyState] ?? ws.readyState
          console.log(`${tag(session)} [acceptInvite] emitShard — WS state: ${wsState}, shardIndex=${meta.shardIndex}, ${meta.shardHex?.length / 2} bytes`)
          if (ws.readyState !== ws.OPEN) {
            console.log(`${tag(session)} [acceptInvite] WS closed — shard cached, guardian must reconnect`)
            return
          }
          emit('shardReceived', meta)
        }

        if (deliveredShards.has(code)) {
          console.log(`${tag(session)} [acceptInvite] found cached shard — delivering to reconnected guardian`)
          emitShard(deliveredShards.get(code))
        } else {
          const pending = localInvites.get(code)
          if (pending && pending.type === 'owner') {
            console.log(`${tag(session)} [acceptInvite] owner already waiting — pairing immediately`)
            clearTimeout(pending.timer)
            localInvites.delete(code)
            const { notifyDelivered, timer: _t, type: _type, ...meta } = pending
            cacheDeliveredShard(code, meta)
            emitShard(meta)
            notifyDelivered?.()
          } else {
            console.log(`${tag(session)} [acceptInvite] no owner yet — registering guardian, waiting`)
            const slot = { type: 'guardian', emitShard }
            slot.timer = setTimeout(() => {
              if (localInvites.get(code) === slot) {
                localInvites.delete(code)
                console.log(`${tag(session)} [acceptInvite] timeout — owner never connected`)
                emit('inviteError', { message: 'invite timeout: owner did not connect within 5 minutes' })
              }
            }, INVITE_TTL_MS)
            localInvites.set(code, slot)
          }
        }

      } else if (method === 'joinReconstruction') {
        // In-memory reconstruction: all guardian sessions on this bridge that share
        // the same ownerGroupKey are paired directly, no Hyperswarm needed.
        const groupKey      = params.ownerPubKey   // ownerGroupKey set during invite handoff
        const guardianIndex = params.guardianIndex
        const shardHex      = params.shardHex
        const M             = params.M

        if (!localReconstructions.has(groupKey)) localReconstructions.set(groupKey, [])
        const group = localReconstructions.get(groupKey)

        const member = { sessionId: session.id, emit, guardianIndex, shardHex }
        group.push(member)
        const total = group.length   // each guardian already counts themselves as 1

        console.log(`${tag(session)} [reconstruction] guardian #${guardianIndex} joined group "${groupKey?.slice(0, 12)}…" (${total}/${M})`)

        // Cross-announce newcomer ↔ each existing member.
        for (const existing of group) {
          if (existing === member) continue
          // Tell newcomer about existing
          member.emit('peer',  { guardianIndex: existing.guardianIndex })
          member.emit('shard', { guardianIndex: existing.guardianIndex, total })
          // Tell existing about newcomer
          existing.emit('peer',  { guardianIndex: member.guardianIndex })
          existing.emit('shard', { guardianIndex: member.guardianIndex, total })
        }

        if (total >= M) {
          console.log(`${tag(session)} [reconstruction] quorum! combining ${total} shards`)
          try {
            const ek = core.combineKey(group.map(m => b4a.from(m.shardHex, 'hex')))
            const ekHex = ek.toString('hex')
            for (const m of group) m.emit('quorum', { ekHex })
            localReconstructions.delete(groupKey)
          } catch (err) {
            console.error(`${tag(session)} [reconstruction] combineKey failed: ${err.message}`)
          }
        }
        reply(id, { ok: true })

      } else {
        error(id, `unknown method: ${method}`)
      }
    } catch (err) {
      console.error(`${tag(session)} error in ${method}:`, err.message)
      error(id, err.message)
    }
  })

  ws.on('close', async () => {
    liveSessions--
    activeSessions.delete(session.id)
    console.log(`${tag(session)} phone disconnected (${liveSessions} session(s) live)`)
    await session.heartbeatHandle?.stop().catch(() => {})
    await session.observeHandle?.stop().catch(() => {})
    // Remove this session from any reconstruction group it was part of.
    for (const [key, group] of localReconstructions) {
      const filtered = group.filter(m => m.sessionId !== session.id)
      if (filtered.length === 0) localReconstructions.delete(key)
      else localReconstructions.set(key, filtered)
    }
  })
})

console.log(`================================================================`)
console.log(`bridge started at ${STARTED_AT}`)
console.log(`listening on ws://0.0.0.0:${PORT}`)
console.log(`mode: in-memory invite pairing (Hyperswarm bypassed for handoff)`)
console.log(`find your LAN IP and give it to the phone app:`)
console.log(`  Windows: ipconfig | findstr IPv4`)
console.log(`  Mac/Linux: ifconfig | grep "inet "`)
console.log(`================================================================`)

// Heartbeat status log every 15s so it's obvious whether anything is happening.
setInterval(() => {
  console.log(`[bridge] heartbeat: ${liveSessions} session(s) live, pending invites: ${snapshotInvites()}`)
}, 15000)
