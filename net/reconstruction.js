import Hyperswarm from 'hyperswarm'
import { EventEmitter } from 'events'
import b4a from 'b4a'
import { reconstructionTopic } from './transport.js'
import { schemas, encode, decode } from '../protocol/schemas.js'
import * as identity from '../core/identity.js'

// Guardians join a topic derived from the owner's pubkey when their local
// deadline elapses. Each one announces (with a signed timestamp), discovers
// peers, exchanges shards, and emits 'quorum' when M shards have been seen.
//
// The stream protocol per pairwise connection is the simplest possible:
//   1. Both peers send a single length-prefixed `ReconstructionAnnounce`.
//   2. Both peers send a single length-prefixed `ShardExchange` with their shard.
// We frame messages with a 4-byte big-endian length prefix to keep the stream
// reader trivial.

export function joinReconstruction ({
  ownerPubKey,
  ourKeyPair,
  ourGuardianIndex,
  ourShard,
  lastSeenAt,
  M,
  swarm
}) {
  const ev = new EventEmitter()
  const topic = reconstructionTopic(ownerPubKey)
  const sw = swarm || new Hyperswarm({ keyPair: ourKeyPair })
  const ownsSwarm = !swarm

  const collected = new Map() // guardianIndex -> shard
  collected.set(ourGuardianIndex, ourShard)

  const onConnection = (conn) => {
    handlePeer(conn, {
      ownerPubKey,
      ourKeyPair,
      ourGuardianIndex,
      ourShard,
      lastSeenAt,
      onAnnounce: (announce) => ev.emit('peer', announce),
      onShard: ({ guardianIndex, shard }) => {
        if (collected.has(guardianIndex)) return
        collected.set(guardianIndex, shard)
        ev.emit('shard', { guardianIndex, shard, total: collected.size })
        if (collected.size >= M) {
          ev.emit('quorum', { shards: [...collected.values()], indices: [...collected.keys()] })
        }
      },
      onError: (err) => ev.emit('error', err)
    }).catch((err) => ev.emit('error', err))
  }
  sw.on('connection', onConnection)
  const discovery = sw.join(topic, { server: true, client: true })

  ev.stop = async () => {
    sw.off('connection', onConnection)
    await discovery.destroy().catch(() => {})
    if (ownsSwarm) await sw.destroy().catch(() => {})
  }
  ev.topic = topic
  return ev
}

async function handlePeer (conn, ctx) {
  conn.on('error', () => {})
  const { ownerPubKey, ourKeyPair, ourGuardianIndex, ourShard, lastSeenAt } = ctx

  // Sign our announce so peers can verify the timestamp came from a key
  // belonging to one of the guardians of this owner.
  const announceBody = b4a.concat([
    ownerPubKey,
    ourKeyPair.publicKey,
    encodeUint32(ourGuardianIndex),
    encodeUint64(lastSeenAt)
  ])
  const signature = identity.sign(announceBody, ourKeyPair.secretKey)
  const announce = encode(schemas.ReconstructionAnnounce, {
    ownerPubKey,
    guardianPubKey: ourKeyPair.publicKey,
    guardianIndex: ourGuardianIndex,
    lastSeenAt,
    signature
  })
  await writeFramed(conn, announce)

  const shardMsg = encode(schemas.ShardExchange, {
    guardianIndex: ourGuardianIndex,
    shard: ourShard
  })
  await writeFramed(conn, shardMsg)

  const reader = framedReader(conn)
  const peerAnnounceBuf = await reader.next()
  if (!peerAnnounceBuf) return
  const peerAnnounce = decode(schemas.ReconstructionAnnounce, peerAnnounceBuf)

  const peerBody = b4a.concat([
    peerAnnounce.ownerPubKey,
    peerAnnounce.guardianPubKey,
    encodeUint32(peerAnnounce.guardianIndex),
    encodeUint64(peerAnnounce.lastSeenAt)
  ])
  const ok = identity.verify(peerBody, peerAnnounce.signature, peerAnnounce.guardianPubKey)
  if (!ok) {
    ctx.onError(new Error('peer announce signature failed'))
    try { conn.end() } catch {}
    return
  }
  ctx.onAnnounce(peerAnnounce)

  const peerShardBuf = await reader.next()
  if (!peerShardBuf) return
  const peerShard = decode(schemas.ShardExchange, peerShardBuf)
  ctx.onShard({ guardianIndex: peerShard.guardianIndex, shard: peerShard.shard })

  try { conn.end() } catch {}
}

function writeFramed (stream, payload) {
  return new Promise((resolve, reject) => {
    const len = b4a.alloc(4)
    len.writeUInt32BE(payload.length, 0)
    stream.write(len)
    stream.write(payload, (err) => err ? reject(err) : resolve())
  })
}

function framedReader (stream) {
  let buf = b4a.alloc(0)
  const queue = []
  let waiting = null
  let ended = false

  const tryDeliver = () => {
    while (buf.length >= 4) {
      const len = buf.readUInt32BE(0)
      if (buf.length < 4 + len) return
      const msg = buf.subarray(4, 4 + len)
      buf = buf.subarray(4 + len)
      if (waiting) {
        const w = waiting
        waiting = null
        w(msg)
      } else {
        queue.push(msg)
      }
    }
  }

  stream.on('data', (chunk) => {
    buf = b4a.concat([buf, chunk])
    tryDeliver()
  })
  stream.on('end', () => { ended = true; if (waiting) { waiting(null); waiting = null } })
  stream.on('close', () => { ended = true; if (waiting) { waiting(null); waiting = null } })

  return {
    next () {
      if (queue.length) return Promise.resolve(queue.shift())
      if (ended) return Promise.resolve(null)
      return new Promise((res) => { waiting = res })
    }
  }
}

function encodeUint32 (n) {
  const b = b4a.alloc(4)
  b.writeUInt32BE(n >>> 0, 0)
  return b
}

function encodeUint64 (n) {
  const b = b4a.alloc(8)
  // Safe up to 2^53.
  const hi = Math.floor(n / 2 ** 32)
  const lo = n >>> 0
  b.writeUInt32BE(hi, 0)
  b.writeUInt32BE(lo, 4)
  return b
}
