// Mock protocol service. Mirrors the real API surface in /protocol/CONTRACTS.md
// so the screens code against real-shaped responses today, and the team can
// swap each function for a real implementation backed by /core, /net, /storage
// without touching the UI.
//
// When wiring real implementations:
//   - `generateInviteCode`, `acceptInvite`, `openInvite` -> /net/invite.js
//   - `splitKey`, `combineKey`                          -> /core/shamir.js
//   - `encryptEstate`, `decryptEstate`                  -> /core/crypto.js
//   - `startHeartbeat`, `observeHeartbeat`              -> /net/heartbeat.js
//   - `joinReconstruction`                              -> /net/reconstruction.js

const WORDS = [
  'amber','orchid','forest','river','ember','glacier','meadow','harbor',
  'thunder','pebble','lantern','quartz','falcon','maple','silver','tundra',
  'beacon','cinder','driftwood','echo','fjord','gypsum','horizon','ivory',
  'jasper','kelp','lichen','monsoon','nimbus','opal','prairie','quill',
  'raven','sequoia','tideline','umbra','vellum','willow','xenon','yarrow',
  'zenith','aurora','basalt','comet','dahlia','eddy','fennel','galaxy'
]

function pickWord () {
  return WORDS[Math.floor(Math.random() * WORDS.length)]
}

export function generateInviteCode () {
  return Array.from({ length: 6 }, pickWord).join('-')
}

let mockEstateKey = null

export async function generateEstateKey () {
  // 32 random bytes, presented as hex.
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256)
  mockEstateKey = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return mockEstateKey
}

export async function splitKey (ek, { M, N }) {
  // Mock shards: just numbered placeholders. Real impl uses GF(256) Shamir.
  return Array.from({ length: N }, (_, i) => `mock-shard-${i + 1}-of-${N}-thresh-${M}`)
}

export async function encryptEstate (plaintextBuf, ek) {
  // Mock: prepend a marker so we can "decrypt" later.
  return `enc:${ek.slice(0, 8)}:${plaintextBuf}`
}

export async function decryptEstate (ciphertext, ek) {
  if (!ciphertext.startsWith('enc:')) throw new Error('not a mock ciphertext')
  const [, , ...rest] = ciphertext.split(':')
  return rest.join(':')
}

// Returns a controller object. The real impl returns a network-backed handle.
export function startHeartbeat ({ ownerPubKey }) {
  let lastKick = Date.now()
  return {
    kick () { lastKick = Date.now() },
    get lastKick () { return lastKick },
    async stop () {}
  }
}

// Simulates a guardian observing the owner's heartbeat. In dev mode, we just
// fire a synthetic update every few seconds.
export function observeHeartbeat ({ ownerPubKey, onUpdate }) {
  let stopped = false
  const tick = () => {
    if (stopped) return
    onUpdate?.(Date.now())
    setTimeout(tick, 5000)
  }
  tick()
  return { stop () { stopped = true } }
}

// Simulates the reconstruction swarm gathering shards over time.
export function joinReconstruction ({ ownerPubKey, M, N, ourShard, ourGuardianIndex, onPeer, onShard, onQuorum }) {
  const collected = new Set([ourGuardianIndex])
  let stopped = false
  const others = Array.from({ length: N }, (_, i) => i).filter((i) => i !== ourGuardianIndex)

  const fakePeer = (i, delay) => {
    setTimeout(() => {
      if (stopped) return
      onPeer?.({ guardianIndex: i, lastSeenAt: Date.now() - 60000 })
      setTimeout(() => {
        if (stopped) return
        if (collected.has(i)) return
        collected.add(i)
        onShard?.({ guardianIndex: i, total: collected.size })
        if (collected.size >= M) onQuorum?.({ size: collected.size })
      }, 1200)
    }, delay)
  }
  others.slice(0, M).forEach((i, idx) => fakePeer(i, 2000 + idx * 2500))

  return { stop () { stopped = true } }
}
