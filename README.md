# Vault — a decentralized dead man's switch

A peer-to-peer "digital will" built on the Hyper stack, with a React Native (Expo) mobile UI inspired by iCloud.

> Set up a Vault. Choose people you trust. If you go silent past your deadline, your Guardians can come together to unlock everything you left them. No servers, no middlemen, just threshold cryptography over a public DHT.

---

## Repo layout

```
/protocol/      compact-encoding wire schemas + locked interface contracts
/core/          crypto primitives, Shamir secret sharing, identity keypairs
/net/           HyperDHT heartbeat, Hyperswarm invite + reconstruction swarms
/storage/       Hyperdrive wrapper, on-disk state store, clock with fast-forward
/scripts/       Phase 1 spike CLIs (heartbeat owner/watcher, shard handoff)
/test/          node:test fuzz tests for split/combine/encrypt/decrypt
/app/           React Native (Expo) mobile app — iCloud-inspired UX
```

The protocol modules in `core/`, `net/`, `storage/` are plain Node/Bare libraries.
The mobile app in `app/` consumes them via a `services/protocol.js` shim that
currently mocks every call so the screens are clickable end-to-end without the
P2P stack wired up. As you wire each real module, replace the mock function in
`app/services/protocol.js` and the screens just keep working.

---

## Quickstart

### 1. Install protocol deps
```bash
npm install
```

### 2. Run the test suite
```bash
npm test
```
Should print all-green for crypto roundtrips, the 3-of-5 Shamir exhaustive
combination check, and a 200-iteration fuzz pass.

### 3. Run the heartbeat spike across two machines
```bash
# Terminal A (owner laptop)
npm run spike:owner
# copy the printed pubkey

# Terminal B (other laptop, same Wi-Fi)
npm run spike:watch <owner-pubkey-hex>
```
You should see "heartbeat observed" within ~60 seconds. Kill terminal A and the
watcher will stop seeing kicks within ~5 minutes — that's the trustless
liveness signal we build the deadline on top of.

### 4. Run the mobile app
```bash
cd app
npm install
npx expo start
```
Open the Expo Go app on your phone and scan the QR code, or press `i` / `a` to
open the iOS / Android simulator. The app boots into the Mode Select screen
("Set up my Vault" / "Become a Guardian"). Two phones — or two simulators on
the same machine — gives you the full Owner ↔ Guardian demo.

---

## Architecture in one diagram

```
   OWNER PHONE                                          GUARDIAN PHONE
   ┌──────────────────┐                                ┌──────────────────┐
   │ Setup wizard     │                                │ Paste invite     │
   │ Estate Key gen   │ ── Hyperswarm invite ────►     │ Sealed shard     │
   │ Shamir M-of-N    │     (6-word topic)             │ stored locally   │
   │ Heartbeat ann.   │                                │                  │
   │ I'm-alive button │ ── HyperDHT heartbeat ──►      │ Heartbeat watch  │
   └──────────────────┘                                │ Deadline monitor │
            │                                          │                  │
            │ Hyperdrive (encrypted)                   │ ◄ ── reconstruct │
            ▼                                          │   swarm joins    │
   ┌──────────────────┐                                │   shards exch.   │
   │ Encrypted blobs  │ ── seeded by Owner devices ──► │ EK reassembled   │
   └──────────────────┘                                │ Estate decrypted │
                                                       └──────────────────┘
```

The opinionated bit: the network does **not** enforce the deadline. Guardians
do, locally and independently. Reconstruction is gated on M-of-N agreement,
not on any single clock — that's the whole trust model.

---

## What's mocked vs real

| Layer                      | Today                                 | Replace with                         |
|----------------------------|---------------------------------------|--------------------------------------|
| Crypto (encrypt, Shamir)   | Real (libsodium + GF(256))            | —                                    |
| Identity keypairs          | Real (Argon2id-protected disk store)  | —                                    |
| Wire schemas               | Real (compact-encoding)               | —                                    |
| Heartbeat / invite / recon | Real (Hyperswarm + custom framing)    | —                                    |
| Mobile UI                  | Real (Expo + RN)                      | —                                    |
| **App ↔ protocol bridge**  | **Mocked** (`app/services/protocol.js`) | Bare-on-mobile, or a local WS bridge |
| **Hyperdrive seeding**     | Stubbed                               | Wire `storage/drive.js` end-to-end   |
| Notifications              | In-app toasts only                    | Native push if shipping past hackathon|

---

## Demo controls

Both the Owner Dashboard and the Guardian Dashboard expose a **Fast-forward
time** switch in the "Demo controls" section. Flip it on and the clock
advances 60×, so a 30-day deadline elapses in 30 seconds — long enough to
narrate but short enough to hold attention. The Guardian Dashboard also has a
**Pause heartbeat watcher** toggle to simulate the Owner going silent without
actually killing the Owner app.

---

## Definition of done — demo checklist

- [ ] One Owner phone, two Guardian phones (or Expo simulators) on the same network.
- [ ] Owner finishes setup wizard with `M=2 / N=3`, drag-drops "Last Will & Testament" as a note.
- [ ] Both Guardians paste their invite codes; both reach the "Sealed and stored" state.
- [ ] Owner Dashboard shows two green Guardian dots and a fresh countdown ring.
- [ ] Owner taps "I'm alive"; both Guardian rings reset.
- [ ] Both Guardians flip on Fast-forward; both rings drain to "silent / past deadline".
- [ ] One Guardian taps "Begin reconstruction"; second Guardian appears on the topic; threshold bar fills to 2/3.
- [ ] Guardian's screen flips to "Vault opened" and renders the decrypted note.
- [ ] App survives a hard kill at any point and resumes (AsyncStorage hydration).

---

## Authors

Hackathon team — HackUPC 2026.
