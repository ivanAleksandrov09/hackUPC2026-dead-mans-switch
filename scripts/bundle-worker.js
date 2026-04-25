#!/usr/bin/env node
// Bundles app/bare/worker.js into a self-contained Bare bundle that
// react-native-bare-kit can load. Uses bare-pack with --linked so the
// bundle references prebuilt addons resolved at runtime (the same
// approach PearPass uses) rather than embedding host-arch prebuilds.
//
// Usage: node scripts/bundle-worker.js
// Or via npm: npm run bundle-worker

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const input  = path.join(root, 'app', 'bare', 'worker.js')
const output = path.join(root, 'app', 'bare', 'worker.bundle.js')

if (!existsSync(input)) {
  console.error(`worker.js not found at ${input}`)
  process.exit(1)
}

console.log('bundling bare worker for android…')
try {
  // -p android         : target the Android platform (resolves android-specific addons)
  // --linked           : reference linked addons (prebuilds resolved at runtime)
  //                      vs. file: prebuilds which embed host-arch binaries
  execSync(`npx bare-pack -p android --linked --out "${output}" "${input}"`, {
    cwd: root,
    stdio: 'inherit'
  })
  console.log(`output: ${output}`)
} catch {
  console.error('\nbare-pack failed. Check that bare-pack is installed:')
  console.error('  npm install --save-dev bare-pack@1.4.1')
  process.exit(1)
}
