// WebSocket client — talks to bridge/server.js running on the laptop.
// Set BRIDGE_URL in app/services/config.js to point at your laptop's LAN IP.
// Falls back to mock mode if the bridge is unreachable.

import { BRIDGE_URL } from './config.js'
import { clock } from './clock.js'

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
      const r = pendingResolvers[msg.id]
      if (!r) return
      delete pendingResolvers[msg.id]
      if (msg.error) {
        console.log(`[bridge] ← error for id=${msg.id}: ${msg.error}`)
        r.reject(new Error(msg.error))
      } else {
        r.resolve(msg.result)
      }
    } else if (msg.type) {
      console.log(`[bridge] ← event: ${msg.type}`)
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
    if (method !== 'kick') console.log(`[bridge] → ${method} (id=${id})`)
    ws.send(JSON.stringify({ id, method, params }))
    setTimeout(() => {
      if (pendingResolvers[id]) {
        delete pendingResolvers[id]
        console.log(`[bridge] timeout: ${method} (id=${id})`)
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

export function startHeartbeat () {
  return {
    async kick () {
      // Send virtual clock time so guardians stay in sync under fast-forward.
      await call('kick', { lastSeenAt: clock.now() }).catch(() => {})
    },
    async stop () {},
  }
}

export function observeHeartbeat ({ onUpdate }) {
  // Heartbeats arrive via the bridge's kick broadcast — no P2P swarm needed.
  const off = on('heartbeat', (msg) => onUpdate?.(msg.lastSeenAt))
  return { stop () { off() } }
}

export function setFastForward (multiplier) {
  call('setFastForward', { multiplier }).catch(() => {})
}

export function onClockSync (cb) {
  return on('clockSync', (msg) => cb(msg.multiplier))
}

export function openInvite (code, shardHex, meta = {}, { onDelivered, onError } = {}) {
  console.log(`[protocol] openInvite: code ${code.slice(0, 12)}… shardIndex=${meta.shardIndex}`)
  call('openInvite', { code, shardHex, ...meta }).catch((err) => {
    console.log(`[protocol] openInvite call error: ${err.message}`)
  })
  const offDelivered = on('shardDelivered', (msg) => {
    if (msg.shardIndex === meta.shardIndex) {
      console.log(`[protocol] shardDelivered: shardIndex=${msg.shardIndex}`)
      onDelivered?.()
      offDelivered()
      offError()
    }
  })
  const offError = on('inviteError', (msg) => {
    if (msg.shardIndex === meta.shardIndex) {
      console.log(`[protocol] inviteError for shardIndex=${msg.shardIndex}: ${msg.message}`)
      onError?.(msg.message)
      offDelivered()
      offError()
    }
  })
  return { stop () { offDelivered(); offError() } }
}

export function acceptInvite (code, { onShard, onError } = {}) {
  console.log(`[protocol] acceptInvite: joining swarm for code ${code.slice(0, 12)}…`)
  call('acceptInvite', { code }).catch((err) => console.log(`[protocol] acceptInvite call error: ${err.message}`))
  const offShard = on('shardReceived', (msg) => {
    const { type: _t, shardHex, ...meta } = msg
    console.log(`[protocol] shardReceived: ${shardHex?.length / 2} bytes, shardIndex=${meta.shardIndex}, M=${meta.M}, deadline=${meta.deadlineSeconds}s`)
    onShard?.(shardHex, meta)
    offShard()
    offError()
  })
  const offError = on('inviteError', (msg) => {
    console.log(`[protocol] inviteError: ${msg.message}`)
    onError?.(msg.message)
    offShard()
    offError()
  })
  return { stop () { offShard(); offError() } }
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
