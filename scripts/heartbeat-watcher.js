// Phase 1 spike: lookup the owner's heartbeat topic and report when we last
// observed presence. Run on a second machine, or in another terminal locally.
//
// Usage:
//   node scripts/heartbeat-watcher.js <owner-pubkey-hex>

import b4a from 'b4a'
import { observeHeartbeat } from '../net/heartbeat.js'

const arg = process.argv[2]
if (!arg) {
  console.error('usage: heartbeat-watcher.js <owner-pubkey-hex>')
  process.exit(1)
}

const ownerPubKey = b4a.from(arg, 'hex')
console.log('watching pubkey:', ownerPubKey.toString('hex'))

const sub = observeHeartbeat({
  ownerPubKey,
  onUpdate: (lastSeenAt) => {
    console.log(`[${new Date(lastSeenAt).toISOString()}] heartbeat observed`)
  }
})

setInterval(() => {
  const ago = sub.lastSeenAt ? Date.now() - sub.lastSeenAt : null
  if (ago === null) console.log('no heartbeat yet…')
  else console.log(`last seen ${(ago / 1000).toFixed(1)}s ago`)
}, 10000)

const shutdown = async () => {
  console.log('\nshutting down…')
  await sub.stop()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
