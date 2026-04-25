import fs from 'fs'
import path from 'path'

// Tiny JSON-on-disk state store. We do NOT put secrets in here directly —
// identity keys live in their own passphrase-protected file (see core/identity.js)
// and sealed shards are stored as hex which is opaque without the guardian
// keypair. Anything else goes here.

export function createStateStore (filePath) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })

  function read () {
    if (!fs.existsSync(filePath)) return defaultState()
    try {
      return { ...defaultState(), ...JSON.parse(fs.readFileSync(filePath, 'utf8')) }
    } catch {
      return defaultState()
    }
  }

  function write (state) {
    const tmp = filePath + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2))
    fs.renameSync(tmp, filePath)
  }

  function update (mutator) {
    const s = read()
    const next = mutator(s) || s
    write(next)
    return next
  }

  return { read, write, update, filePath }
}

function defaultState () {
  return {
    mode: null,
    identity: null,
    owner: null,
    guardian: null
  }
}
