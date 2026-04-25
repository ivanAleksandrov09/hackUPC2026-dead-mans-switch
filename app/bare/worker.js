// Bare worker — runs inside the react-native-bare-kit Bare thread.
// BareKit is a global injected by the runtime.
// IPC is a Duplex stream: .on('data') to receive, .write() to send.

'use strict'

const { IPC } = BareKit   // global provided by react-native-bare-kit

const b4a         = require('b4a')
const hyperCrypto = require('hypercore-crypto')
// Import only the Bare-compatible modules — no fs, path, or other Node built-ins.
// identity.js and storage/ use fs so they stay on the phone side (AsyncStorage).
const { generateEstateKey, encryptEstate, decryptEstate, sealShard, openShard } = require('../../core/crypto.js')
const { splitKey, combineKey }             = require('../../core/shamir.js')
const { startHeartbeat, observeHeartbeat } = require('../../net/heartbeat.js')
const { openInvite, acceptInvite }         = require('../../net/invite.js')
const { joinReconstruction }               = require('../../net/reconstruction.js')
const { generateInviteCode }               = require('../../net/transport.js')
const core = { generateEstateKey, encryptEstate, decryptEstate, sealShard, openShard, splitKey, combineKey }

// -- Framed JSON IPC ---------------------------------------------------

let readBuf = b4a.alloc(0)

IPC.on('data', (chunk) => {
  readBuf = b4a.concat([readBuf, chunk])
  while (readBuf.length >= 4) {
    const len = readBuf.readUInt32BE(0)
    if (readBuf.length < 4 + len) break
    const payload = readBuf.subarray(4, 4 + len)
    readBuf = readBuf.subarray(4 + len)
    try { handleMessage(JSON.parse(payload.toString())) } catch {}
  }
})

function send (obj) {
  const payload = b4a.from(JSON.stringify(obj))
  const frame   = b4a.alloc(4 + payload.length)
  frame.writeUInt32BE(payload.length, 0)
  payload.copy(frame, 4)
  IPC.write(frame)
}

const reply = (id, result) => send({ id, result })
const error = (id, msg)    => send({ id, error: msg })
const emit  = (type, data) => send({ type, ...data })

// -- Session state -----------------------------------------------------

const session = {
  keypair:           hyperCrypto.keyPair(),
  heartbeatHandle:   null,
  observeHandle:     null,
  reconstructHandle: null
}

// -- Message handler ---------------------------------------------------

async function handleMessage ({ id, method, params = {} }) {
  try {
    if (method === 'generateEstateKey') {
      reply(id, { ekHex: core.generateEstateKey().toString('hex') })

    } else if (method === 'splitKey') {
      const ek = b4a.from(params.ekHex, 'hex')
      reply(id, { shards: core.splitKey(ek, { M: params.M, N: params.N }).map(s => s.toString('hex')) })

    } else if (method === 'encryptEstate') {
      const ek = b4a.from(params.ekHex, 'hex')
      reply(id, { ctHex: core.encryptEstate(b4a.from(params.text, 'utf8'), ek).toString('hex') })

    } else if (method === 'decryptEstate') {
      const ek = b4a.from(params.ekHex, 'hex')
      reply(id, { text: core.decryptEstate(b4a.from(params.ctHex, 'hex'), ek).toString('utf8') })

    } else if (method === 'combineKey') {
      reply(id, { ekHex: core.combineKey(params.shards.map(h => b4a.from(h, 'hex'))).toString('hex') })

    } else if (method === 'generateInviteCode') {
      reply(id, { code: generateInviteCode() })

    } else if (method === 'startHeartbeat') {
      if (session.heartbeatHandle) await session.heartbeatHandle.stop()
      session.heartbeatHandle = startHeartbeat({ ownerKeyPair: session.keypair })
      reply(id, { ownerPubKey: session.keypair.publicKey.toString('hex') })

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
      const { stream, close } = await openInvite(params.code)
      stream.write(b4a.from(params.shardHex, 'hex'))
      stream.end()
      await close()
      reply(id, { ok: true })

    } else if (method === 'acceptInvite') {
      const { stream, close } = await acceptInvite(params.code)
      const chunks = []
      stream.on('data', c => chunks.push(c))
      stream.on('end', async () => {
        emit('shardReceived', { shardHex: b4a.concat(chunks).toString('hex') })
        await close()
      })
      reply(id, { ok: true, waiting: true })

    } else if (method === 'joinReconstruction') {
      if (session.reconstructHandle) session.reconstructHandle.stop()
      const ev = joinReconstruction({
        ownerPubKey:      b4a.from(params.ownerPubKey, 'hex'),
        ourKeyPair:       session.keypair,
        ourGuardianIndex: params.guardianIndex,
        ourShard:         b4a.from(params.shardHex, 'hex'),
        lastSeenAt:       params.lastSeenAt || Date.now(),
        M:                params.M
      })
      session.reconstructHandle = ev
      ev.on('peer',   d => emit('peer',   d))
      ev.on('shard',  d => emit('shard',  d))
      ev.on('quorum', d => emit('quorum', { ekHex: core.combineKey(d.shards).toString('hex') }))
      reply(id, { ok: true })

    } else {
      error(id, `unknown method: ${method}`)
    }
  } catch (err) {
    error(id, err.message)
  }
}

console.log('[bare-worker] ready')
