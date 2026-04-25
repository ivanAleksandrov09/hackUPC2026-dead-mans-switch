import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { AppIcon } from '../../components/AppIcon'
import { ScreenHeader } from '../../components/Header'
import { colors, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'
import { clock } from '../../services/clock'

const STAGES = [
  { id: 'connect',  label: 'Locating Owner on the network',     ms: 1500 },
  { id: 'noise',    label: 'Establishing encrypted channel',    ms: 1200 },
  { id: 'shard',    label: 'Receiving sealed shard',            ms: 1500 },
  { id: 'persist',  label: 'Sealing shard to this device',      ms: 1000 }
]

export default function GuardianAcceptingScreen ({ navigation }) {
  const { dispatch } = useStore()
  const [stageIdx, setStageIdx] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      for (let i = 0; i < STAGES.length; i++) {
        await new Promise((r) => setTimeout(r, STAGES[i].ms))
        if (cancelled) return
        setStageIdx(i + 1)
      }
      if (cancelled) return
      // Real impl: this is where /net/invite.acceptInvite resolves with the
      // ShardHandoff payload, and we decode + seal it locally.
      dispatch({
        type: 'setGuardian',
        patch: {
          ownerLabel: 'Anonymous Owner',
          ownerPubKey: 'mock-owner-pubkey',
          shardIndex: 1,
          M: 2, N: 3,
          deadlineSeconds: 30,           // demo: 30s to show the unlock
          lastSeenAt: clock.now(),
          sealedShard: 'mock-sealed-shard',
          driveKey: 'mock-drive-key',
          status: 'active'
        }
      })
      setDone(true)
    }
    run()
    return () => { cancelled = true }
  }, [])

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Becoming a Guardian"
          title={done ? "You're a Guardian" : 'Working…'}
          subtitle={done ? 'A sealed shard now lives on this device.' : 'This usually takes a few seconds.'}
        />

        <View style={styles.body}>
          <View style={styles.illustration}>
            <AppIcon
              glyph={done ? '✓' : '🔐'}
              tint={done ? colors.success : colors.iconTint.guardian}
              size={96}
            />
          </View>

          <Card padded={false} style={{ overflow: 'hidden' }}>
            {STAGES.map((s, i) => {
              const status = i < stageIdx ? 'done' : i === stageIdx ? 'active' : 'pending'
              return (
                <View
                  key={s.id}
                  style={[
                    styles.stageRow,
                    i !== STAGES.length - 1 && styles.stageDivider
                  ]}
                >
                  <View style={[styles.stageDot, status === 'done' && styles.stageDotDone, status === 'active' && styles.stageDotActive]}>
                    {status === 'done' ? (
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>✓</Text>
                    ) : status === 'active' ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : null}
                  </View>
                  <Text style={[
                    typography.body,
                    { color: status === 'pending' ? colors.textTertiary : colors.text }
                  ]}>
                    {s.label}
                  </Text>
                </View>
              )
            })}
          </Card>

          {done ? (
            <Card style={{ marginTop: spacing.lg, backgroundColor: colors.successMuted }}>
              <Text style={[typography.footnote, { color: colors.success, fontWeight: '600' }]}>What happens next</Text>
              <Text style={[typography.subhead, { color: colors.text, marginTop: 4 }]}>
                We'll quietly check the Vault Owner's heartbeat in the background. If they go silent past the deadline, your app will offer to start reconstruction together with the other Guardians.
              </Text>
            </Card>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Button
            title={done ? 'Open Guardian dashboard' : 'Working…'}
            disabled={!done}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'GuardianDashboard' }] })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  body: { paddingHorizontal: spacing.lg },
  illustration: { alignItems: 'center', paddingVertical: spacing.xl },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  stageDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator
  },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.separator,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md
  },
  stageDotActive: { backgroundColor: colors.accent },
  stageDotDone:   { backgroundColor: colors.success },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
})
