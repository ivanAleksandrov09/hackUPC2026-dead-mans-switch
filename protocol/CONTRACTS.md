# Locked Interfaces — Hour 1

These signatures are **frozen**. Implementations may evolve, but the shapes below
are what every other dev codes against. If you need to change one, ping the
team in the channel before editing.

---

## `core/` (Dev A) — `import * as core from '../core/index.js'`

```js
core.generateEstateKey() -> Buffer(32)
core.encryptEstate(plaintext: Buffer, ek: Buffer) -> Buffer            // ciphertext
core.decryptEstate(ciphertext: Buffer, ek: Buffer) -> Buffer           // plaintext
core.splitKey(ek: Buffer, { M, N }) -> Buffer[]                         // shards
core.combineKey(shards: Buffer[]) -> Buffer                             // ek
core.sealShard(shard: Buffer, recipientPubKey: Buffer) -> Buffer
core.openShard(sealedBuf: Buffer, recipientKeyPair) -> Buffer
core.identity.load(passphrase) -> { publicKey, secretKey }
core.identity.create(passphrase) -> { publicKey, secretKey }
```

Wire schemas (compact-encoding) in `protocol/schemas.js`:
- `ShardHandoff` — `{ shard, driveKey, ownerPubKey, deadlineSeconds, M, N, guardianIndex, peerRoster, inlineCiphertext? }`
- `Heartbeat` — `{ ownerPubKey, sentAt, seq }`
- `ReconstructionAnnounce` — `{ ownerPubKey, guardianIndex, lastSeenAt, signature }`
- `ShardExchange` — `{ guardianIndex, sealedShard }`

---

## `net/` (Dev B) — `import * as net from '../net/index.js'`

```js
net.startHeartbeat(ownerKeyPair) -> { stop(), kick() }
net.observeHeartbeat(ownerPubKey, onUpdate(lastSeenAt)) -> { stop() }
net.openInvite(inviteCode) -> Promise<SecretStream>      // owner side
net.acceptInvite(inviteCode) -> Promise<SecretStream>    // guardian side
net.joinReconstruction(ownerPubKey, ourKeyPair) -> EventEmitter
                          // emits 'peer', 'shard', 'quorum'
```

```js
storage.createOwnerDrive(corestore) -> Hyperdrive             // writable
storage.replicateOwnerDrive(corestore, driveKey) -> Hyperdrive // readable
```

---

## Shared `state.json` shape (per-app, in user data dir)

```json
{
  "mode": "owner" | "guardian" | null,
  "identity": { "publicKey": "<hex>" },
  "owner": {
    "estateKeyHash": "<hex>",
    "driveKey": "<hex>",
    "deadlineSeconds": 3600,
    "guardians": [
      { "index": 0, "publicKey": "<hex>", "label": "Alice", "lastSeenAt": 1714000000 }
    ],
    "lastKick": 1714000000
  },
  "guardian": {
    "ownerPubKey": "<hex>",
    "shardIndex": 0,
    "M": 2, "N": 3,
    "deadlineSeconds": 3600,
    "lastSeenAt": 1714000000,
    "sealedShard": "<hex>",
    "inlineCiphertext": "<hex|null>",
    "driveKey": "<hex>",
    "status": "active" | "overdue" | "reconstructing" | "unlocked"
  }
}
```
