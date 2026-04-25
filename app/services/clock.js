// Demo clock with a fast-forward toggle. The real protocol uses /storage/clock.js;
// this is its UI-side mirror so countdown rings can compress a year into seconds
// without scattering Date.now() calls across screens.

let multiplier = 1
let anchorReal = Date.now()
let anchorVirtual = Date.now()

export const clock = {
  now () {
    return anchorVirtual + (Date.now() - anchorReal) * multiplier
  },
  setMultiplier (m) {
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

export function formatRemaining (msRemaining) {
  if (msRemaining <= 0) return '0s'
  const sec = Math.floor(msRemaining / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ${sec % 60}s`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ${min % 60}m`
  const days = Math.floor(hr / 24)
  if (days < 365) return `${days}d`
  const yr = (days / 365).toFixed(1)
  return `${yr}y`
}

export function formatRelative (msAgo) {
  if (msAgo < 0) return 'just now'
  const sec = Math.floor(msAgo / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  return `${days}d ago`
}
