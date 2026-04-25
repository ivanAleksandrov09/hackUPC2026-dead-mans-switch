import sodium from 'sodium-native'
import b4a from 'b4a'

const KEY_BYTES = sodium.crypto_secretstream_xchacha20poly1305_KEYBYTES // 32
const HEADER_BYTES = sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES
const TAG_FINAL = sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
const ABYTES = sodium.crypto_secretstream_xchacha20poly1305_ABYTES
const CHUNK = 64 * 1024

export function generateEstateKey () {
  const ek = b4a.alloc(KEY_BYTES)
  sodium.randombytes_buf(ek)
  return ek
}

export function encryptEstate (plaintext, ek) {
  if (!b4a.isBuffer(plaintext)) plaintext = b4a.from(plaintext)
  if (ek.length !== KEY_BYTES) throw new Error('estate key must be 32 bytes')

  const state = b4a.alloc(sodium.crypto_secretstream_xchacha20poly1305_STATEBYTES)
  const header = b4a.alloc(HEADER_BYTES)
  sodium.crypto_secretstream_xchacha20poly1305_init_push(state, header, ek)

  const chunks = [header]
  let offset = 0
  while (offset < plaintext.length) {
    const end = Math.min(offset + CHUNK, plaintext.length)
    const slice = plaintext.subarray(offset, end)
    const tag = end === plaintext.length ? TAG_FINAL : 0
    const out = b4a.alloc(slice.length + ABYTES)
    sodium.crypto_secretstream_xchacha20poly1305_push(state, out, slice, null, tag)
    chunks.push(out)
    offset = end
  }
  if (plaintext.length === 0) {
    const out = b4a.alloc(ABYTES)
    sodium.crypto_secretstream_xchacha20poly1305_push(state, out, b4a.alloc(0), null, TAG_FINAL)
    chunks.push(out)
  }
  return b4a.concat(chunks)
}

export function decryptEstate (ciphertext, ek) {
  if (ek.length !== KEY_BYTES) throw new Error('estate key must be 32 bytes')
  if (ciphertext.length < HEADER_BYTES + ABYTES) throw new Error('ciphertext too short')

  const state = b4a.alloc(sodium.crypto_secretstream_xchacha20poly1305_STATEBYTES)
  const header = ciphertext.subarray(0, HEADER_BYTES)
  sodium.crypto_secretstream_xchacha20poly1305_init_pull(state, header, ek)

  const chunks = []
  let offset = HEADER_BYTES
  while (offset < ciphertext.length) {
    const end = Math.min(offset + CHUNK + ABYTES, ciphertext.length)
    const slice = ciphertext.subarray(offset, end)
    const out = b4a.alloc(slice.length - ABYTES)
    const tagOut = b4a.alloc(1)
    sodium.crypto_secretstream_xchacha20poly1305_pull(state, out, tagOut, slice, null)
    chunks.push(out)
    offset = end
  }
  return b4a.concat(chunks)
}

// Anonymous public-key sealing — recipient decrypts with their keypair.
export function sealShard (shard, recipientPubKey) {
  const sealed = b4a.alloc(shard.length + sodium.crypto_box_SEALBYTES)
  sodium.crypto_box_seal(sealed, shard, recipientPubKey)
  return sealed
}

export function openShard (sealedBuf, keypair) {
  const out = b4a.alloc(sealedBuf.length - sodium.crypto_box_SEALBYTES)
  const ok = sodium.crypto_box_seal_open(out, sealedBuf, keypair.publicKey, keypair.secretKey)
  if (!ok) throw new Error('failed to open sealed shard')
  return out
}
