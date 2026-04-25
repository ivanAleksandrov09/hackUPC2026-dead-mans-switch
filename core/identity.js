import sodium from 'sodium-native'
import hyperCrypto from 'hypercore-crypto'
import b4a from 'b4a'
import fs from 'fs'
import path from 'path'

const SALT_BYTES = sodium.crypto_pwhash_SALTBYTES
const SECRETBOX_KEYBYTES = sodium.crypto_secretbox_KEYBYTES
const SECRETBOX_NONCEBYTES = sodium.crypto_secretbox_NONCEBYTES
const MACBYTES = sodium.crypto_secretbox_MACBYTES
const OPSLIMIT = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE
const MEMLIMIT = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE
const ALG = sodium.crypto_pwhash_ALG_ARGON2ID13

function deriveKey (passphrase, salt) {
  const key = b4a.alloc(SECRETBOX_KEYBYTES)
  const pw = b4a.from(passphrase, 'utf8')
  sodium.crypto_pwhash(key, pw, salt, OPSLIMIT, MEMLIMIT, ALG)
  return key
}

export function createKeypair () {
  return hyperCrypto.keyPair()
}

// Derive an X25519 box keypair from the ed25519 sign keypair so the same
// identity can both sign (reconstruction announces) and seal/unseal shards.
// `crypto_box_seal` and friends operate on curve25519; libsodium ships the
// canonical conversion.
export function deriveBoxKeyPair (signKeyPair) {
  const publicKey = b4a.alloc(sodium.crypto_box_PUBLICKEYBYTES)
  const secretKey = b4a.alloc(sodium.crypto_box_SECRETKEYBYTES)
  sodium.crypto_sign_ed25519_pk_to_curve25519(publicKey, signKeyPair.publicKey)
  sodium.crypto_sign_ed25519_sk_to_curve25519(secretKey, signKeyPair.secretKey)
  return { publicKey, secretKey }
}

export function sign (message, secretKey) {
  return hyperCrypto.sign(message, secretKey)
}

export function verify (message, signature, publicKey) {
  return hyperCrypto.verify(message, signature, publicKey)
}

export function saveIdentity (filePath, keypair, passphrase) {
  const salt = b4a.alloc(SALT_BYTES)
  sodium.randombytes_buf(salt)
  const key = deriveKey(passphrase, salt)

  const plaintext = b4a.concat([keypair.publicKey, keypair.secretKey])
  const nonce = b4a.alloc(SECRETBOX_NONCEBYTES)
  sodium.randombytes_buf(nonce)
  const ciphertext = b4a.alloc(plaintext.length + MACBYTES)
  sodium.crypto_secretbox_easy(ciphertext, plaintext, nonce, key)

  const blob = {
    version: 1,
    salt: salt.toString('hex'),
    nonce: nonce.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    publicKey: keypair.publicKey.toString('hex')
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(blob, null, 2))
}

export function loadIdentity (filePath, passphrase) {
  if (!fs.existsSync(filePath)) return null
  const blob = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const salt = b4a.from(blob.salt, 'hex')
  const nonce = b4a.from(blob.nonce, 'hex')
  const ciphertext = b4a.from(blob.ciphertext, 'hex')
  const key = deriveKey(passphrase, salt)
  const plaintext = b4a.alloc(ciphertext.length - MACBYTES)
  const ok = sodium.crypto_secretbox_open_easy(plaintext, ciphertext, nonce, key)
  if (!ok) throw new Error('bad passphrase')
  return {
    publicKey: plaintext.subarray(0, 32),
    secretKey: plaintext.subarray(32)
  }
}

export function loadOrCreate (filePath, passphrase) {
  const existing = loadIdentity(filePath, passphrase)
  if (existing) return existing
  const kp = createKeypair()
  saveIdentity(filePath, kp, passphrase)
  return kp
}
