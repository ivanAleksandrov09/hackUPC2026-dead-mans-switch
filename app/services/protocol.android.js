// Android-specific transport — uses the Bare worker thread via bare-bridge.
// Metro automatically picks this file over protocol.js on Android builds.
// Run `npm run bundle-worker` from the repo root before building the APK.

import { call, on, isConnected } from './bare-bridge.js'

export { isConnected }

const WORDS = [
  'amber','orchid','forest','river','ember','glacier','meadow','harbor',
  'thunder','pebble','lantern','quartz','falcon','maple','silver','tundra',
  'beacon','cinder','driftwood','echo','fjord','gypsum','horizon','ivory',
  'jasper','kelp','lichen','monsoon','nimbus','opal','prairie','quill',
  'raven','sequoia','tidal','umbra','vellum','willow','xenon','yarrow',
  'zenith','aurora','basalt','comet','dahlia','eddy','fennel','galaxy'
]

export function generateInviteCode () {
  return Array.from({ length: 6 }, () => WORDS[Math.floor(Math.random() * WORDS.length)]).join('-')
}

export async function generateEstateKey () {
  const { ekHex } = await call('generateEstateKey')
  return ekHex
}

export async function splitKey (ekHex, { M, N }) {
  const { shards } = await call('splitKey', { ekHex, M, N })
  return shards
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

export function startHeartbeat ({ ownerPubKey }) {
  call('startHeartbeat').catch(() => {})
  return {
    kick () { call('kick').catch(() => {}) },
    async stop () {}
  }
}

export function observeHeartbeat ({ ownerPubKey, onUpdate }) {
  call('observeHeartbeat', { ownerPubKey }).catch(() => {})
  const off = on('heartbeat', (msg) => onUpdate?.(msg.lastSeenAt))
  return { stop: off }
}

export async function openInvite (code, shardHex) {
  await call('openInvite', { code, shardHex })
}

export function acceptInvite (code, { onShard } = {}) {
  call('acceptInvite', { code }).catch(() => {})
  const off = on('shardReceived', (msg) => { onShard?.(msg.shardHex); off() })
  return { stop: off }
}

export function joinReconstruction ({ ownerPubKey, shardHex, guardianIndex, lastSeenAt, M, onPeer, onShard, onQuorum }) {
  call('joinReconstruction', { ownerPubKey, shardHex, guardianIndex, lastSeenAt, M }).catch(() => {})
  const offs = [
    on('peer',   d => onPeer?.(d)),
    on('shard',  d => onShard?.(d)),
    on('quorum', d => onQuorum?.(d))
  ]
  return { stop () { offs.forEach(f => f()) } }
}
