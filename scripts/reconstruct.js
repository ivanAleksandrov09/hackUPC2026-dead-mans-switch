// Reconstruction swarm spike — simulates multiple guardian processes
// discovering each other and exchanging shards on the reconstruction topic.
//
// Run one process per "guardian" in separate terminals. Each one joins the
// reconstruction topic, announces itself, and exchanges shards with peers.
// When M shards are collected, the estate key is reconstructed and printed.
//
// Quickstart (3 terminals, same machine or across machines on same Wi-Fi):
//   node scripts/reconstruct.js <guardianIndex> <ownerPubKeyHex> <shardHex> <M> <N>
//
// To generate test inputs, run shard-handoff.js first:
//   node scripts/shard-handoff.js owner   → prints ownerPubKey + shards
//   Then pass each shard to a separate reconstruct.js process.

import b4a from 'b4a'
import hyperCrypto from 'hypercore-crypto'
import { joinReconstruction } from '../net/reconstruction.js'
import { combineKey } from '../core/shamir.js'

const [guardianIndex, ownerPubKeyHex, shardHex, Mstr, Nstr] = process.argv.slice(2)

if (!guardianIndex || !ownerPubKeyHex || !shardHex) {
  console.error('usage: reconstruct.js <guardianIndex> <ownerPubKeyHex> <shardHex> <M> <N>')
  console.error('example: reconstruct.js 0 aabbcc... deadbeef... 2 3')
  process.exit(1)
}

const M = parseInt(Mstr || '2')
const N = parseInt(Nstr || '3')
const ourKeyPair = hyperCrypto.keyPair()
const ownerPubKey = b4a.from(ownerPubKeyHex, 'hex')
const ourShard = b4a.from(shardHex, 'hex')
const idx = parseInt(guardianIndex)

console.log(`guardian #${idx} | M=${M} N=${N}`)
console.log(`own pubkey: ${ourKeyPair.publicKey.toString('hex')}`)
console.log('joining reconstruction topic…')

const collected = new Map()
collected.set(idx, ourShard)

const ev = joinReconstruction({
  ownerPubKey,
  ourKeyPair,
  ourGuardianIndex: idx,
  ourShard,
  lastSeenAt: Date.now() - 60 * 60 * 1000,  // simulate "saw owner 1h ago"
  M
})

ev.on('peer', (announce) => {
  console.log(`peer appeared: guardian #${announce.guardianIndex}`)
})

ev.on('shard', ({ guardianIndex: gi, shard, total }) => {
  console.log(`received shard #${gi} — total ${total}/${M}`)
  collected.set(gi, shard)
})

ev.on('quorum', ({ shards }) => {
  console.log('\nquorum reached! combining shards…')
  try {
    const ek = combineKey(shards)
    console.log('estate key:', ek.toString('hex'))
    console.log('\nsuccess — reconstruction complete.')
  } catch (err) {
    console.error('combine failed:', err.message)
  }
  ev.stop().then(() => process.exit(0))
})

ev.on('error', (err) => console.error('swarm error:', err.message))

console.log('waiting for other guardians… (ctrl+c to abort)\n')

process.on('SIGINT', async () => {
  console.log('\naborting…')
  await ev.stop()
  process.exit(0)
})
