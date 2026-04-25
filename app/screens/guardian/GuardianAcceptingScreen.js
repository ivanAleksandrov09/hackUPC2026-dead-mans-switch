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
import * as protocol from '../../services/protocol'

// Stages advance as real events arrive. Stage 3 ("Receiving sealed shard")
// fires when the bridge emits shardReceived; the rest are time-gated so the
// UI feels alive while the Hyperswarm handshake is in progress.
const STAGE_LABELS = [
  'Locating Owner on the network',
  'Establishing encrypted channel',
  'Receiving sealed shard',
  'Sealing shard to this device'
]

export default function GuardianAcceptingScreen ({ route, navigation }) {
  const { code } = route.params || {}
  const { dispatch } = useStore()
  const [stageIdx, setStageIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!code) { setError('No invite code provided.'); return }

    // Advance through stages 0→1→2 on a timer while waiting for the shard.
    let stageTimer = null
    const advance = (to) => { stageTimer = setTimeout(() => setStageIdx(to), to * 800) }
    advance(1)
    advance(2)

    // Bridge joins the invite swarm and calls onShard when it receives the payload.
    const sub = protocol.acceptInvite(code, {
      onError: (msg) => {
        clearTimeout(timeout)
        setError(`Could not connect to Owner: ${msg}\nMake sure both apps are open and try again.`)
      },
      onShard: (shardHex, meta = {}) => {
        console.log('[guardian] onShard received —', shardHex?.length / 2, 'bytes, shardIndex=', meta.shardIndex, 'M=', meta.M, 'N=', meta.N, 'deadline=', meta.deadlineSeconds)
        clearTimeout(stageTimer)
        setStageIdx(3)
        setTimeout(() => {
          dispatch({
            type: 'setGuardian',
            patch: {
              ownerLabel: 'Anonymous Owner',
              ownerPubKey: meta.ownerGroupKey || code,
              shardIndex:      meta.shardIndex      ?? 0,
              M:               meta.M               ?? 2,
              N:               meta.N               ?? 3,
              deadlineSeconds: meta.deadlineSeconds ?? 30,
              lastSeenAt: meta.vaultCreatedAt ?? clock.now(),
              sealedShard: shardHex,
              driveKey: 'stub',
              status: 'active'
            }
          })
          setStageIdx(4)
          setDone(true)
        }, 900)
      }
    })

    // 2-minute timeout — show a useful error rather than hanging forever.
    const timeout = setTimeout(() => {
      sub.stop()
      setError('Timed out waiting for the Owner to send the shard.\nMake sure both apps are open and try again.')
    }, 2 * 60 * 1000)

    return () => {
      sub.stop()
      clearTimeout(timeout)
      clearTimeout(stageTimer)
    }
  }, [code])

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <AppIcon icon="alert-triangle" tint={colors.danger} size={72} />
          <Text style={[typography.headline, { color: colors.danger, marginTop: spacing.lg }]}>Handoff failed</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            {error}
          </Text>
          <Button title="Try again" onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl }} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Becoming a Guardian"
          title={done ? "You're a Guardian" : 'Working…'}
          subtitle={done ? 'A sealed shard now lives on this device.' : 'Connecting to the Owner…'}
        />

        <View style={styles.body}>
          <View style={styles.illustration}>
            <AppIcon
              icon={done ? 'check' : 'lock'}
              tint={done ? colors.success : colors.iconTint.guardian}
              size={96}
            />
          </View>

          <Card padded={false} style={{ overflow: 'hidden' }}>
            {STAGE_LABELS.map((label, i) => {
              const status = i < stageIdx ? 'done' : i === stageIdx ? 'active' : 'pending'
              return (
                <View key={i} style={[styles.stageRow, i < STAGE_LABELS.length - 1 && styles.stageDivider]}>
                  <View style={[styles.stageDot, status === 'done' && styles.stageDotDone, status === 'active' && styles.stageDotActive]}>
                    {status === 'done'
                      ? <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>✓</Text>
                      : status === 'active'
                        ? <ActivityIndicator size="small" color="white" />
                        : null}
                  </View>
                  <Text style={[typography.body, { color: status === 'pending' ? colors.textTertiary : colors.text }]}>
                    {label}
                  </Text>
                </View>
              )
            })}
          </Card>

          {done ? (
            <Card style={{ marginTop: spacing.lg, backgroundColor: colors.successMuted }}>
              <Text style={[typography.footnote, { color: colors.success, fontWeight: '600' }]}>What happens next</Text>
              <Text style={[typography.subhead, { color: colors.text, marginTop: 4 }]}>
                The bridge will quietly watch the Owner's heartbeat. If they go silent past the deadline, you can trigger reconstruction together with the other Guardians.
              </Text>
            </Card>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Button
            title={done ? 'Open Guardian dashboard' : 'Waiting for Owner…'}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, minHeight: 400 },
  body: { paddingHorizontal: spacing.lg },
  illustration: { alignItems: 'center', paddingVertical: spacing.xl },
  stageRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  stageDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  stageDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.separator, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  stageDotActive: { backgroundColor: colors.accent },
  stageDotDone: { backgroundColor: colors.success },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
})
