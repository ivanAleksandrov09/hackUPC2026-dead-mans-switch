import sss from 'shamirs-secret-sharing'
import b4a from 'b4a'

export function splitKey (ek, { M, N }) {
  if (M < 2) throw new Error('threshold M must be >= 2')
  if (N < M) throw new Error('share count N must be >= M')
  if (N > 255) throw new Error('share count N must be <= 255 (GF(256))')
  const shards = sss.split(ek, { shares: N, threshold: M })
  return shards.map((s) => b4a.from(s))
}

export function combineKey (shards) {
  if (!Array.isArray(shards) || shards.length < 2) {
    throw new Error('need at least 2 shards to combine')
  }
  const ek = sss.combine(shards.map((s) => b4a.isBuffer(s) ? s : b4a.from(s)))
  return b4a.from(ek)
}
