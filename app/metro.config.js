const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Allow importing bare-pack output bundles as raw JS modules.
// bare-pack with -p android --linked produces a CJS wrapper; Metro
// handles it fine as a regular .js source file.
if (!config.resolver.sourceExts.includes('bundle')) {
  config.resolver.sourceExts.push('bundle')
}

// Buffer polyfill — needed because react-native-svg's fetchData utility
// imports Node's "buffer" module which doesn't exist in React Native.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer'),
}

// Stub out Node's "crypto" module — same trick PearPass uses. Some libs
// (like kdbxweb) require('crypto') at load time as a fallback when
// Web Crypto isn't available; returning empty lets Metro bundle without
// pulling in Node built-ins. Real crypto runs in the Bare worker.
const originalResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'crypto') {
    return { type: 'empty' }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
