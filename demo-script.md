# Demo script — 90 seconds

> Three phones (or two simulators + a phone) on the same Wi-Fi.
> Pre-recorded screen capture queued up on the demo laptop in case the network
> flakes. **Open the recording app first, mirror, then practice.**

---

## Setup before going on stage (5 min)
1. Phone A: install the app, sign in to nothing, leave at the **Mode Select** screen.
2. Phone B: same.
3. Phone C: same.
4. Confirm all three are on the same Wi-Fi (or hotspot).
5. Pre-write a short "last will" so you don't fumble the typing on stage.

---

## On stage (90s)

**Phone A (Owner) — 25s**
> "I'm setting up a Vault. I encrypt my estate on this device, then split the
> key into three shards across three Guardians. Two of the three need to agree
> to ever release it."

- Tap **Set up my Vault**.
- Skip through the four-step explainer (one tap).
- Type a passphrase, confirm.
- Drop in a pre-made note: "Crypto seed phrase".
- Set threshold **2-of-3**, deadline **6 months**, name the Guardians "Alex / Priya / Sam".
- Generate three invite codes.

**Phones B & C (Guardians) — 20s**
> "Each Guardian gets a six-word invite. They paste it, the app pulls down a
> sealed shard, useless on its own."

- Tap **Become a Guardian**, paste the first invite. Watch the four-stage
  spinner finish; "You're a Guardian".
- Repeat on Phone C with the second invite.

**Phone A — 10s**
> "On the Owner Dashboard you can see your two Guardians online and a countdown
> ring. As long as I check in before the deadline, nothing happens."

- Tap **I'm alive**. Ring resets. Two green dots in the Guardian list.

**Demo trick — 10s**
> "Now imagine I get hit by a bus."

- Flip **Fast-forward** on the Owner Dashboard *and* on both Guardians.
- (Optional, on Phone A) flip **Pause heartbeat watcher** on the Guardians so
  they're sure to see the gap.
- Watch the Owner ring drain.

**Phones B & C — 20s**
> "Both Guardians independently see the deadline elapsed. One of them taps
> Begin reconstruction. The other appears on the same topic, exchanges shards,
> and the threshold meter fills."

- Phone B taps **Begin reconstruction**.
- Phone B's screen shows Phone C joining; meter fills 2/3.
- Phone B's screen flips to **Vault opened**, the seed phrase note visible.

**Closing — 5s**
> "No servers were involved. The Owner could have been offline for years. The
> network can't break the cryptography; only the Guardians, together, can
> open it. That's the dead man's switch."

---

## Fallbacks if the live demo fails

- **Wi-Fi flakes mid-handoff**: switch to the hotspot. We pre-tested both.
- **A Guardian's deadline doesn't fire**: toggle Fast-forward off and back on
  to re-anchor the clock.
- **Catastrophic failure**: kill the live demo, pivot to the recorded
  90-second screen capture saved on the demo laptop's desktop. No apologies,
  just narrate over it.

---

## What to emphasize in the talk track

- "Threshold cryptography" — say the words, it's the technical hook.
- "The network can't enforce the deadline; the Guardians do, by quorum." This
  is the opinionated stance and the most-asked question.
- "Pseudonymous by default" — Guardians don't see each other or the estate
  contents until reconstruction. That's a privacy story most digital-will
  competitors miss.
- "Open source, runs on Expo, no servers" — invite the audience to clone it.
