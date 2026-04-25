import b4a from 'b4a'
import sodium from 'sodium-native'

// 6-word invite code -> 32-byte topic
const WORDLIST = [
  'amber', 'orchid', 'forest', 'river', 'ember', 'glacier', 'meadow', 'harbor',
  'thunder', 'pebble', 'lantern', 'quartz', 'falcon', 'maple', 'silver', 'tundra',
  'beacon', 'cinder', 'driftwood', 'echo', 'fjord', 'gypsum', 'horizon', 'ivory',
  'jasper', 'kelp', 'lichen', 'monsoon', 'nimbus', 'opal', 'prairie', 'quill',
  'raven', 'sequoia', 'tideline', 'umbra', 'vellum', 'willow', 'xenon', 'yarrow',
  'zenith', 'aurora', 'basalt', 'comet', 'dahlia', 'eddy', 'fennel', 'galaxy',
  'hemlock', 'iris', 'juniper', 'kestrel', 'larch', 'mosaic', 'nebula', 'obsidian',
  'plume', 'quasar', 'rune', 'sable', 'twilight', 'umber', 'verdant', 'whisper'
]

export function generateInviteCode () {
  // 6 words from a 64-word list -> 36 bits of entropy.
  // We expand via blake2b to a full 32-byte topic, so the *topic* has 256 bits;
  // 36 bits of guessable entropy is fine for short-lived (minutes) invites.
  const idx = b4a.alloc(6)
  sodium.randombytes_buf(idx)
  const words = []
  for (let i = 0; i < 6; i++) words.push(WORDLIST[idx[i] & 63])
  return words.join('-')
}

export function topicFromInvite (inviteCode) {
  const seed = b4a.from('dms-invite:' + inviteCode.trim().toLowerCase())
  const topic = b4a.alloc(32)
  sodium.crypto_generichash(topic, seed)
  return topic
}

export function heartbeatTopic (ownerPubKey) {
  const seed = b4a.concat([ownerPubKey, b4a.from(':heartbeat')])
  const topic = b4a.alloc(32)
  sodium.crypto_generichash(topic, seed)
  return topic
}

export function reconstructionTopic (ownerPubKey) {
  const seed = b4a.concat([ownerPubKey, b4a.from(':reconstruct')])
  const topic = b4a.alloc(32)
  sodium.crypto_generichash(topic, seed)
  return topic
}
