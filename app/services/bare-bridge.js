// Starts the Bare worklet and exposes call/on/isConnected used by protocol.js.
// The worker is loaded as a pre-built bundle (worker.bundle.js) produced by
// the `bundle-worker` npm script. See scripts/bundle-worker.js.

import { Worklet } from 'react-native-bare-kit'
import b4a from 'b4a'
import bundle from '../bare/worker.bundle.js'   // built by: npm run bundle-worker

let worklet = null
let connected = false
let _idCounter = 0
const pending = {}
const handlers = {}

const nextId = () => String(++_idCounter)

async function ensureStarted () {
  if (worklet) return
  worklet = new Worklet()

  const { IPC } = worklet

  let readBuf = b4a.alloc(0)
  IPC.on('data', (chunk) => {
    readBuf = b4a.concat([readBuf, chunk])
    while (readBuf.length >= 4) {
      const len = readBuf.readUInt32BE(0)
      if (readBuf.length < 4 + len) break
      const payload = readBuf.subarray(4, 4 + len)
      readBuf = readBuf.subarray(4 + len)
      try { dispatch(JSON.parse(payload.toString())) } catch {}
    }
  })

  // Extension must be .bundle for bare-kit to treat it as a bundle.
  worklet.start('/app.bundle', bundle)
  connected = true
}

function dispatch (msg) {
  if (msg.id !== undefined) {
    const r = pending[msg.id]; if (!r) return
    delete pending[msg.id]
    if (msg.error) r.reject(new Error(msg.error)); else r.resolve(msg.result)
  } else if (msg.type) {
    for (const cb of (handlers[msg.type] || [])) try { cb(msg) } catch {}
  }
}

function writeFrame (obj) {
  const { IPC } = worklet
  const payload = b4a.from(JSON.stringify(obj))
  const frame   = b4a.alloc(4 + payload.length)
  frame.writeUInt32BE(payload.length, 0)
  payload.copy(frame, 4)
  IPC.write(frame)
}

export function call (method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!connected) return reject(new Error('bare worker not ready'))
    const id = nextId()
    pending[id] = { resolve, reject }
    writeFrame({ id, method, params })
    setTimeout(() => {
      if (pending[id]) { delete pending[id]; reject(new Error(`timeout: ${method}`)) }
    }, 30000)
  })
}

export function on (type, cb) {
  if (!handlers[type]) handlers[type] = []
  handlers[type].push(cb)
  return () => { handlers[type] = handlers[type].filter(f => f !== cb) }
}

export function isConnected () { return connected }

ensureStarted().catch(err => console.error('[bare-bridge] start failed:', err))
