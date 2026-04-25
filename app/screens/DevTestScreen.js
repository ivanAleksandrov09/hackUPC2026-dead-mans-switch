// Dev-only test screen — tap each button to verify the Bare worker is alive
// and each protocol call works end-to-end on the device.
// Add it to App.js temporarily: <Stack.Screen name="DevTest" component={DevTestScreen} />
// and navigate to it from ModeSelect: navigation.navigate('DevTest')

import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import * as protocol from '../services/protocol'
import { colors, spacing, typography } from '../theme'

const TESTS = [
  {
    label: 'Worker alive',
    run: () => protocol.isConnected() ? 'connected ✓' : 'NOT connected ✗'
  },
  {
    label: 'generateEstateKey',
    run: async () => {
      const ek = await protocol.generateEstateKey()
      return ek.slice(0, 16) + '… (' + ek.length / 2 + ' bytes)'
    }
  },
  {
    label: 'encryptEstate + decryptEstate',
    run: async () => {
      const ek  = await protocol.generateEstateKey()
      const ct  = await protocol.encryptEstate('hello vault', ek)
      const pt  = await protocol.decryptEstate(ct, ek)
      return pt === 'hello vault' ? 'roundtrip OK ✓' : `MISMATCH: got "${pt}" ✗`
    }
  },
  {
    label: 'splitKey + combineKey (2-of-3)',
    run: async () => {
      const ek     = await protocol.generateEstateKey()
      const shards = await protocol.splitKey(ek, { M: 2, N: 3 })
      const ek2    = await protocol.combineKey([shards[0], shards[2]])
      return ek === ek2 ? 'Shamir roundtrip OK ✓' : 'MISMATCH ✗'
    }
  },
  {
    label: 'generateInviteCode',
    run: () => protocol.generateInviteCode()
  },
  {
    label: 'startHeartbeat (announce)',
    run: async () => {
      const hb = protocol.startHeartbeat({ ownerPubKey: 'test' })
      hb.kick()
      await new Promise(r => setTimeout(r, 500))
      hb.stop()
      return 'heartbeat started, kick sent ✓'
    }
  }
]

export default function DevTestScreen ({ navigation }) {
  const [results, setResults] = useState({})
  const [running, setRunning] = useState({})

  const run = async (label, fn) => {
    setRunning(r => ({ ...r, [label]: true }))
    const start = Date.now()
    try {
      const res = await fn()
      setResults(r => ({ ...r, [label]: { ok: true, msg: String(res), ms: Date.now() - start } }))
    } catch (err) {
      setResults(r => ({ ...r, [label]: { ok: false, msg: err.message, ms: Date.now() - start } }))
    } finally {
      setRunning(r => ({ ...r, [label]: false }))
    }
  }

  const runAll = () => TESTS.forEach(t => run(t.label, t.run))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={[typography.title2, { color: colors.text, marginBottom: spacing.lg }]}>
          Bare Protocol Tests
        </Text>

        <Pressable onPress={runAll} style={styles.runAll}>
          <Text style={[typography.headline, { color: '#fff' }]}>Run all</Text>
        </Pressable>

        {TESTS.map(t => {
          const r = results[t.label]
          const busy = running[t.label]
          return (
            <Pressable key={t.label} onPress={() => run(t.label, t.run)} style={styles.row}>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{t.label}</Text>
              {busy
                ? <Text style={styles.pending}>…</Text>
                : r
                  ? <Text style={[styles.result, { color: r.ok ? colors.success : colors.danger }]}>
                      {r.msg}{'\n'}<Text style={styles.ms}>{r.ms}ms</Text>
                    </Text>
                  : <Text style={styles.pending}>tap</Text>}
            </Pressable>
          )
        })}

        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl }}>
          <Text style={[typography.body, { color: colors.accent, textAlign: 'center' }]}>← Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  runAll: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  result: { flex: 1, ...StyleSheet.flatten({ fontSize: 13 }) },
  ms: { color: colors.textTertiary, fontSize: 11 },
  pending: { color: colors.textTertiary, fontSize: 13 }
})
