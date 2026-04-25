import test from 'node:test'
import assert from 'node:assert/strict'
import b4a from 'b4a'
import * as core from '../core/index.js'

test('estate key roundtrip', () => {
  const ek = core.generateEstateKey()
  assert.equal(ek.length, 32)
  const plaintext = b4a.from('the meaning of life is 42 — and a sandwich')
  const ct = core.encryptEstate(plaintext, ek)
  const pt = core.decryptEstate(ct, ek)
  assert.ok(b4a.equals(pt, plaintext))
})

test('encryption with wrong key fails loudly', () => {
  const ek1 = core.generateEstateKey()
  const ek2 = core.generateEstateKey()
  const ct = core.encryptEstate(b4a.from('secret'), ek1)
  assert.throws(() => core.decryptEstate(ct, ek2))
})

test('shamir 3-of-5 roundtrip — every triple combination', () => {
  const ek = core.generateEstateKey()
  const shards = core.splitKey(ek, { M: 3, N: 5 })
  assert.equal(shards.length, 5)

  // Every 3-subset must reconstruct.
  const idxs = [0, 1, 2, 3, 4]
  for (let a = 0; a < 5; a++) {
    for (let b = a + 1; b < 5; b++) {
      for (let c = b + 1; c < 5; c++) {
        const subset = [shards[a], shards[b], shards[c]]
        const recovered = core.combineKey(subset)
        assert.ok(b4a.equals(recovered, ek), `failed for ${a},${b},${c}`)
      }
    }
  }
})

test('shamir fuzz — 200 random keys, 2-of-3', () => {
  for (let i = 0; i < 200; i++) {
    const ek = core.generateEstateKey()
    const shards = core.splitKey(ek, { M: 2, N: 3 })
    const recovered = core.combineKey([shards[0], shards[2]])
    assert.ok(b4a.equals(recovered, ek))
  }
})

test('seal/open shard roundtrip via derived box keypair', () => {
  const sign = core.identity.createKeypair()
  const box = core.identity.deriveBoxKeyPair(sign)
  const shard = b4a.from('top-secret-shard-bytes-32-bytes-x')
  const sealed = core.sealShard(shard, box.publicKey)
  const opened = core.openShard(sealed, box)
  assert.ok(b4a.equals(opened, shard))
})

test('encryption of empty plaintext', () => {
  const ek = core.generateEstateKey()
  const ct = core.encryptEstate(b4a.alloc(0), ek)
  const pt = core.decryptEstate(ct, ek)
  assert.equal(pt.length, 0)
})
