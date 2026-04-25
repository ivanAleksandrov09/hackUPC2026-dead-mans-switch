// Polyfills (react-native-get-random-values, react-native-url-polyfill) must be
// imported at the very top of App.js before this module is loaded.
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { sha256 } from 'js-sha256';

const PROGRAM_ID = new PublicKey('6sGQwrJHRr6N3Gvt1ouS4kEP8zSjB5RckhgRr12ftgTj')
const RPC_URL    = 'https://api.devnet.solana.com'

const connection = new Connection(RPC_URL, 'confirmed')

// One fresh keypair per app session — acts as the "Demo Owner".
const owner = Keypair.generate()
console.log('[solana] demo owner pubkey:', owner.publicKey.toBase58())

// -- Internals ---------------------------------------------------------------

function disc (name) {
  // Anchor instruction discriminator: first 8 bytes of SHA-256("global:<name>")
  return new Uint8Array(sha256.arrayBuffer(`global:${name}`)).subarray(0, 8);
}

function concatBytes (...arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out   = new Uint8Array(total)
  let off = 0
  for (const a of arrays) { out.set(a, off); off += a.length }
  return out
}

function getPda () {
  const [pda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('switch'), owner.publicKey.toBytes()],
    PROGRAM_ID
  )
  return pda
}

async function sendTx (keys, data) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  const tx = new Transaction()
  tx.add(new TransactionInstruction({ programId: PROGRAM_ID, keys, data }))
  tx.recentBlockhash = blockhash
  tx.feePayer = owner.publicKey
  tx.sign(owner)
  const sig = await connection.sendRawTransaction(tx.serialize())
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight })
  return sig
}

// -- Setup (airdrop + initialize) --------------------------------------------

let _setup = null  // singleton Promise; null means not started or last run failed

async function doSetup () {
  // Airdrop 0.5 SOL if balance is below 0.01 SOL.
  const balance = await connection.getBalance(owner.publicKey)
  if (balance < 10_000_000) {
    console.log('[solana] requesting airdrop…')
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    const airdropSig = await connection.requestAirdrop(owner.publicKey, 500_000_000)
    await connection.confirmTransaction({ signature: airdropSig, blockhash, lastValidBlockHeight })
    console.log('[solana] airdrop confirmed')
  }

  // Create the switch PDA account if it doesn't exist yet.
  const pda = getPda()
  if (!(await connection.getAccountInfo(pda))) {
    console.log('[solana] initializing switch account…')
    // deadline_seconds = 10 secs encoded as a little-endian signed 64-bit integer.
    const deadline = new Uint8Array([0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    await sendTx(
      [
        { pubkey: pda,                   isSigner: false, isWritable: true  },
        { pubkey: owner.publicKey,        isSigner: true,  isWritable: true  },
        { pubkey: new PublicKey('11111111111111111111111111111111'),
                                          isSigner: false, isWritable: false },
      ],
      concatBytes(disc('initialize'), deadline)
    )
    console.log('[solana] switch initialized')
  }
}

function ensureReady () {
  if (!_setup) {
    _setup = doSetup().catch(err => {
      _setup = null  // allow the next call to retry
      throw err
    })
  }
  return _setup
}

// -- Public API --------------------------------------------------------------

/** Call on app/dashboard mount to begin airdrop + init in the background. */
export function warmUp () {
  ensureReady().catch(err => console.warn('[solana] warmup failed:', err.message))
}

/**
 * Send the Anchor `ping` instruction on-chain.
 * Waits for setup to finish first (airdrop + initialize if needed).
 * Returns the confirmed transaction signature string.
 */
export async function ping () {
  await ensureReady()
  const sig = await sendTx(
    [
      { pubkey: getPda(),        isSigner: false, isWritable: true  },
      { pubkey: owner.publicKey, isSigner: true,  isWritable: false },
    ],
    disc('ping')
  )
  console.log('[solana] ping confirmed:', sig)
  return sig
}

/** Returns the base-58 public key of the in-session demo owner. */
export function getOwnerPublicKey () {
  return owner.publicKey.toBase58()
}
