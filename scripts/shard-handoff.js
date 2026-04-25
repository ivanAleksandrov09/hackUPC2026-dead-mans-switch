// Phase 1 spike: split a 32-byte estate key 3-of-5, ship shards via Hyperswarm
// invite topics to 5 listening processes, and reconstruct from any 3.
//
// Quickstart (in five terminals):
//   node scripts/shard-handoff.js owner          # prints 5 invite codes
//   node scripts/shard-handoff.js guardian <code>  # for each invite code
// The owner waits until all 5 guardians have connected, sends each one their
// shard, and then exits. Any 3 guardians can rerun with --combine to confirm
// the original key is recovered.

import b4a from 'b4a'
import sodium from 'sodium-native'
import * as core from '../core/index.js'
import { generateInviteCode } from '../net/transport.js'
import { openInvite, acceptInvite } from '../net/invite.js'

const role = process.argv[2]

if (role === 'owner') {
  const ek = core.generateEstateKey()
  console.log('estate key:', ek.toString('hex'))

  const M = 3, N = 5
  const shards = core.splitKey(ek, { M, N })
  const codes = Array.from({ length: N }, generateInviteCode)
  codes.forEach((c, i) => console.log(`guardian ${i + 1}: ${c}`))

  for (let i = 0; i < N; i++) {
    const { stream, close } = await openInvite(codes[i])
    stream.write(shards[i])
    stream.end()
    console.log(`shipped shard ${i + 1} via ${codes[i]}`)
    await close()
  }
  console.log('done.')
  process.exit(0)
}

if (role === 'guardian') {
  const code = process.argv[3]
  if (!code) {
    console.error('usage: shard-handoff.js guardian <invite-code>')
    process.exit(1)
  }
  const { stream, close } = await acceptInvite(code)
  const chunks = []
  stream.on('data', (c) => chunks.push(c))
  stream.on('end', async () => {
    const shard = b4a.concat(chunks)
    console.log('received shard (hex):', shard.toString('hex'))
    await close()
    process.exit(0)
  })
  return
}

if (role === '--combine') {
  // Pass shards as hex args after `--combine`.
  const hexes = process.argv.slice(3)
  if (hexes.length < 2) {
    console.error('usage: shard-handoff.js --combine <hex1> <hex2> [<hex3> …]')
    process.exit(1)
  }
  const ek = core.combineKey(hexes.map((h) => b4a.from(h, 'hex')))
  console.log('reconstructed estate key:', ek.toString('hex'))
  process.exit(0)
}

console.error('usage: shard-handoff.js owner | guardian <code> | --combine <hex>...')
process.exit(1)
