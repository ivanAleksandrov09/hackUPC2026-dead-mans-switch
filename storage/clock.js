// A monotonic-ish clock with a debug "fast-forward" toggle so we can compress
// a 1-year deadline into 30 seconds for the demo without scattering Date.now()
// calls. Single source of truth; everything that asks "what time is it?" goes
// through here.

let multiplier = 1
let anchorReal = Date.now()
let anchorVirtual = Date.now()

export const clock = {
  now () {
    const realDelta = Date.now() - anchorReal
    return anchorVirtual + realDelta * multiplier
  },

  setMultiplier (m) {
    if (!Number.isFinite(m) || m <= 0) throw new Error('multiplier must be positive')
    // Re-anchor so changing the multiplier doesn't time-travel.
    anchorVirtual = clock.now()
    anchorReal = Date.now()
    multiplier = m
  },

  reset () {
    multiplier = 1
    anchorReal = Date.now()
    anchorVirtual = anchorReal
  },

  get multiplier () { return multiplier }
}
