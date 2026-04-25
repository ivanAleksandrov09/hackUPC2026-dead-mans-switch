// Phase 1 spike: announce on a heartbeat topic from this machine.
// Pair with `heartbeat-watcher.js` running on a second machine to confirm
// HyperDHT-based liveness signaling actually works across the venue Wi-Fi.
//
// Usage:
//   node scripts/heartbeat-owner.js [hex-pubkey]
// If no pubkey is provided, a random one is generated and printed; copy it
// into the watcher script.

import hyperCrypto from 'hypercore-crypto'
import b4a from 'b4a'
import { startHeartbeat } from '../net/heartbeat.js'

const arg = process.argv[2]
const keypair = hyperCrypto.keyPair(arg ? b4a.from(arg, 'hex').slice(0, 32) : undefined)

console.log('owner pubkey:', keypair.publicKey.toString('hex'))

const hb = startHeartbeat({ ownerKeyPair: keypair })

console.log('announcing on heartbeat topic:', hb.topic.toString('hex'))
console.log('press ctrl+c to stop (simulates owner death)')

let ticks = 0
setInterval(() => {
  ticks++
  console.log(`[${new Date().toISOString()}] alive · seq=${hb.seq} · ticks=${ticks}`)
}, 5000)

const shutdown = async () => {
  console.log('\nshutting down…')
  await hb.stop()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
