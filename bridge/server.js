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
import { startHeartbeat, observeHeartbeat } from '../net/heartbeat.js'
import { openInvite, acceptInvite } from '../net/invite.js'
import { joinReconstruction } from '../net/reconstruction.js'
import { generateInviteCode } from '../net/transport.js'

const PORT = parseInt(process.env.PORT || '3001')
const wss = new WebSocketServer({ port: PORT })

// Per-connection state.
function makeSession () {
  return {
    keypair: hyperCrypto.keyPair(),
    heartbeatHandle: null,
    observeHandle: null,
    reconstructHandle: null
  }
}

wss.on('connection', (ws) => {
  const session = makeSession()
  console.log('phone connected')

  const send = (msg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
  }

  // Reply to a request.
  const reply = (id, result) => send({ id, result })
  const error = (id, message) => send({ id, error: message })

  // Push an unsolicited event to the phone.
  const emit = (type, data) => send({ type, ...data })

  ws.on('message', async (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }
    const { id, method, params = {} } = msg

    try {
      if (method === 'generateEstateKey') {
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
        session.heartbeatHandle?.kick()
        reply(id, { ok: true })

      } else if (method === 'observeHeartbeat') {
        if (session.observeHandle) await session.observeHandle.stop()
        const ownerPubKey = b4a.from(params.ownerPubKey, 'hex')
        session.observeHandle = observeHeartbeat({
          ownerPubKey,
          onUpdate: (lastSeenAt) => emit('heartbeat', { lastSeenAt })
        })
        reply(id, { ok: true })

      } else if (method === 'openInvite') {
        // Owner side — opens a handoff channel, sends the shard, returns.
        const { stream, close } = await openInvite(params.code)
        const shard = b4a.from(params.shardHex, 'hex')
        stream.write(shard)
        stream.end()
        await close()
        reply(id, { ok: true })

      } else if (method === 'acceptInvite') {
        // Guardian side — waits for the owner to push a shard.
        const { stream, close } = await acceptInvite(params.code)
        const chunks = []
        stream.on('data', (c) => chunks.push(c))
        stream.on('end', async () => {
          const shardHex = b4a.concat(chunks).toString('hex')
          await close()
          emit('shardReceived', { shardHex })
        })
        reply(id, { ok: true, waiting: true })

      } else if (method === 'joinReconstruction') {
        if (session.reconstructHandle) session.reconstructHandle.stop()
        const ownerPubKey = b4a.from(params.ownerPubKey, 'hex')
        const ourShard = b4a.from(params.shardHex, 'hex')
        const ev = joinReconstruction({
          ownerPubKey,
          ourKeyPair: session.keypair,
          ourGuardianIndex: params.guardianIndex,
          ourShard,
          lastSeenAt: params.lastSeenAt || Date.now(),
          M: params.M
        })
        session.reconstructHandle = ev
        ev.on('peer',   (d) => emit('peer',   d))
        ev.on('shard',  (d) => emit('shard',  d))
        ev.on('quorum', async (d) => {
          const ek = core.combineKey(d.shards)
          emit('quorum', { ekHex: ek.toString('hex') })
        })
        reply(id, { ok: true })

      } else {
        error(id, `unknown method: ${method}`)
      }
    } catch (err) {
      error(id, err.message)
    }
  })

  ws.on('close', async () => {
    console.log('phone disconnected')
    await session.heartbeatHandle?.stop().catch(() => {})
    await session.observeHandle?.stop().catch(() => {})
    await session.reconstructHandle?.stop().catch(() => {})
  })
})

console.log(`bridge listening on ws://0.0.0.0:${PORT}`)
console.log('find your LAN IP and give it to the phone app:')
console.log('  Windows: ipconfig | findstr IPv4')
console.log('  Mac/Linux: ifconfig | grep "inet "')
