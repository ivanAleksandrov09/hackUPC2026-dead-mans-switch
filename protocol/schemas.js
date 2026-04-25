import cenc from 'compact-encoding'

const ShardHandoff = {
  preencode (state, m) {
    cenc.buffer.preencode(state, m.shard)
    cenc.buffer.preencode(state, m.driveKey)
    cenc.buffer.preencode(state, m.ownerPubKey)
    cenc.uint.preencode(state, m.deadlineSeconds)
    cenc.uint.preencode(state, m.M)
    cenc.uint.preencode(state, m.N)
    cenc.uint.preencode(state, m.guardianIndex)
    cenc.array(cenc.buffer).preencode(state, m.peerRoster || [])
    cenc.buffer.preencode(state, m.inlineCiphertext || Buffer.alloc(0))
    cenc.string.preencode(state, m.estateLabel || '')
  },
  encode (state, m) {
    cenc.buffer.encode(state, m.shard)
    cenc.buffer.encode(state, m.driveKey)
    cenc.buffer.encode(state, m.ownerPubKey)
    cenc.uint.encode(state, m.deadlineSeconds)
    cenc.uint.encode(state, m.M)
    cenc.uint.encode(state, m.N)
    cenc.uint.encode(state, m.guardianIndex)
    cenc.array(cenc.buffer).encode(state, m.peerRoster || [])
    cenc.buffer.encode(state, m.inlineCiphertext || Buffer.alloc(0))
    cenc.string.encode(state, m.estateLabel || '')
  },
  decode (state) {
    return {
      shard: cenc.buffer.decode(state),
      driveKey: cenc.buffer.decode(state),
      ownerPubKey: cenc.buffer.decode(state),
      deadlineSeconds: cenc.uint.decode(state),
      M: cenc.uint.decode(state),
      N: cenc.uint.decode(state),
      guardianIndex: cenc.uint.decode(state),
      peerRoster: cenc.array(cenc.buffer).decode(state),
      inlineCiphertext: cenc.buffer.decode(state),
      estateLabel: cenc.string.decode(state)
    }
  }
}

const Heartbeat = {
  preencode (state, m) {
    cenc.buffer.preencode(state, m.ownerPubKey)
    cenc.uint.preencode(state, m.sentAt)
    cenc.uint.preencode(state, m.seq)
  },
  encode (state, m) {
    cenc.buffer.encode(state, m.ownerPubKey)
    cenc.uint.encode(state, m.sentAt)
    cenc.uint.encode(state, m.seq)
  },
  decode (state) {
    return {
      ownerPubKey: cenc.buffer.decode(state),
      sentAt: cenc.uint.decode(state),
      seq: cenc.uint.decode(state)
    }
  }
}

const ReconstructionAnnounce = {
  preencode (state, m) {
    cenc.buffer.preencode(state, m.ownerPubKey)
    cenc.buffer.preencode(state, m.guardianPubKey)
    cenc.uint.preencode(state, m.guardianIndex)
    cenc.uint.preencode(state, m.lastSeenAt)
    cenc.buffer.preencode(state, m.signature)
  },
  encode (state, m) {
    cenc.buffer.encode(state, m.ownerPubKey)
    cenc.buffer.encode(state, m.guardianPubKey)
    cenc.uint.encode(state, m.guardianIndex)
    cenc.uint.encode(state, m.lastSeenAt)
    cenc.buffer.encode(state, m.signature)
  },
  decode (state) {
    return {
      ownerPubKey: cenc.buffer.decode(state),
      guardianPubKey: cenc.buffer.decode(state),
      guardianIndex: cenc.uint.decode(state),
      lastSeenAt: cenc.uint.decode(state),
      signature: cenc.buffer.decode(state)
    }
  }
}

const ShardExchange = {
  preencode (state, m) {
    cenc.uint.preencode(state, m.guardianIndex)
    cenc.buffer.preencode(state, m.shard)
  },
  encode (state, m) {
    cenc.uint.encode(state, m.guardianIndex)
    cenc.buffer.encode(state, m.shard)
  },
  decode (state) {
    return {
      guardianIndex: cenc.uint.decode(state),
      shard: cenc.buffer.decode(state)
    }
  }
}

export const schemas = { ShardHandoff, Heartbeat, ReconstructionAnnounce, ShardExchange }

export function encode (schema, message) {
  return cenc.encode(schema, message)
}

export function decode (schema, buffer) {
  return cenc.decode(schema, buffer)
}
