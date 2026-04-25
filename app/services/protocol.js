// WebSocket client — talks to bridge/server.js running on the laptop.
// Set BRIDGE_URL in app/services/config.js to point at your laptop's LAN IP.
// Falls back to mock mode if the bridge is unreachable.

import { BRIDGE_URL } from './config.js'
import { ping as solanaPing, warmUp as solanaWarmUp } from './solana.js'

// -- Connection ---------------------------------------------------------

let ws = null
let connected = false
let pendingResolvers = {}   // id -> { resolve, reject }
let eventHandlers = {}      // type -> [callback]
let reconnectTimer = null
let _idCounter = 0

function nextId () { return String(++_idCounter) }

function connect () {
  if (ws) return
  ws = new WebSocket(BRIDGE_URL)

  ws.onopen = () => {
    connected = true
    console.log('[bridge] connected')
    clearTimeout(reconnectTimer)
  }

  ws.onmessage = (e) => {
    let msg
    try { msg = JSON.parse(e.data) } catch { return }

    if (msg.id !== undefined) {
      // Reply to a pending request.
      const r = pendingResolvers[msg.id]
      if (!r) return
      delete pendingResolvers[msg.id]
      if (msg.error) r.reject(new Error(msg.error))
      else r.resolve(msg.result)
    } else if (msg.type) {
      // Unsolicited event.
      for (const cb of (eventHandlers[msg.type] || [])) {
        try { cb(msg) } catch {}
      }
    }
  }

  ws.onclose = () => {
    connected = false
    ws = null
    console.log('[bridge] disconnected — retrying in 3s')
    reconnectTimer = setTimeout(connect, 3000)
  }

  ws.onerror = () => {}
}

function call (method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!connected) return reject(new Error('bridge not connected'))
    const id = nextId()
    pendingResolvers[id] = { resolve, reject }
    ws.send(JSON.stringify({ id, method, params }))
    // 30s timeout per call.
    setTimeout(() => {
      if (pendingResolvers[id]) {
        delete pendingResolvers[id]
        reject(new Error(`timeout: ${method}`))
      }
    }, 30000)
  })
}

function on (type, cb) {
  if (!eventHandlers[type]) eventHandlers[type] = []
  eventHandlers[type].push(cb)
  return () => { eventHandlers[type] = eventHandlers[type].filter((f) => f !== cb) }
}

// Start connecting immediately when this module is imported.
connect()

export function isConnected () { return connected }

// -- API (mirrors the mock surface exactly) ----------------------------

export async function generateEstateKey () {
  const { ekHex } = await call('generateEstateKey')
  return ekHex
}

export async function splitKey (ekHex, { M, N }) {
  const { shards } = await call('splitKey', { ekHex, M, N })
  return shards   // string[]
}

export async function encryptEstate (text, ekHex) {
  const { ctHex } = await call('encryptEstate', { text, ekHex })
  return ctHex
}

export async function decryptEstate (ctHex, ekHex) {
  const { text } = await call('decryptEstate', { ctHex, ekHex })
  return text
}

export async function combineKey (shards) {
  const { ekHex } = await call('combineKey', { shards })
  return ekHex
}

export function generateInviteCode () {
  // Invite codes are generated locally (pure JS, no native deps).
  const WORDS = [
    'amber','orchid','forest','river','ember','glacier','meadow','harbor',
    'thunder','pebble','lantern','quartz','falcon','maple','silver','tundra',
    'beacon','cinder','driftwood','echo','fjord','gypsum','horizon','ivory',
    'jasper','kelp','lichen','monsoon','nimbus','opal','prairie','quill',
    'raven','sequoia','tidal','umbra','vellum','willow','xenon','yarrow',
    'zenith','aurora','basalt','comet','dahlia','eddy','fennel','galaxy'
  ]
  return Array.from({ length: 6 }, () => WORDS[Math.floor(Math.random() * WORDS.length)]).join('-')
}

export function startHeartbeat ({ ownerPubKey }) {
  // Kick off airdrop + switch-account init in the background so the first
  // real ping is fast.
  solanaWarmUp()
  return {
    async kick () {
      const sig = await solanaPing()
      return sig
    },
    async stop () {},
  }
}

export function observeHeartbeat ({ ownerPubKey, onUpdate }) {
  call('observeHeartbeat', { ownerPubKey }).catch(() => {})
  const off = on('heartbeat', (msg) => onUpdate?.(msg.lastSeenAt))
  return { stop () { off() } }
}

export async function openInvite (code, shardHex) {
  await call('openInvite', { code, shardHex })
}

export function acceptInvite (code, { onShard } = {}) {
  call('acceptInvite', { code }).catch(() => {})
  const off = on('shardReceived', (msg) => {
    onShard?.(msg.shardHex)
    off()
  })
  return { stop () { off() } }
}

export function joinReconstruction ({ ownerPubKey, shardHex, guardianIndex, lastSeenAt, M, onPeer, onShard, onQuorum }) {
  call('joinReconstruction', { ownerPubKey, shardHex, guardianIndex, lastSeenAt, M }).catch(() => {})
  const offs = [
    on('peer',   (d) => onPeer?.(d)),
    on('shard',  (d) => onShard?.(d)),
    on('quorum', (d) => onQuorum?.(d))
  ]
  return { stop () { offs.forEach((f) => f()) } }
}
