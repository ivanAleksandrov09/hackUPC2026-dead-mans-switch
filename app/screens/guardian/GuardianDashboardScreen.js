import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, GroupedList, GroupedRow } from '../../components/Card'
import { Button } from '../../components/Button'
import { AppIcon } from '../../components/AppIcon'
import { CountdownRing } from '../../components/CountdownRing'
import { StatusPill } from '../../components/StatusPill'
import { ScreenHeader, SectionHeader } from '../../components/Header'
import { colors, radii, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'
import { clock, formatRemaining, formatRelative } from '../../services/clock'
import * as protocol from '../../services/protocol'

export default function GuardianDashboardScreen ({ navigation }) {
  const { state, dispatch } = useStore()
  const guardian = state.guardian || {}
  const [, setTick] = useState(0)
  const [observingPaused, setObservingPaused] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

// Real impl: hand this an actual onUpdate that writes to disk too.
  useEffect(() => {
    if (observingPaused) return
    const sub = protocol.observeHeartbeat({
      onUpdate: (lastSeenAt) => {
        dispatch({ type: 'setGuardian', patch: { lastSeenAt, status: 'active' } })
      }
    })
    return () => sub.stop()
  }, [observingPaused, guardian.ownerPubKey])

  const lastSeen = guardian.lastSeenAt || clock.now()
  const deadlineMs = (guardian.deadlineSeconds || 30) * 1000
  const elapsed = clock.now() - lastSeen
  const remaining = Math.max(0, deadlineMs - elapsed)
  const progress = deadlineMs > 0 ? remaining / deadlineMs : 0
  const overdue = remaining <= 0

  // Auto-flip status if overdue.
  useEffect(() => {
    if (overdue && guardian.status === 'active') {
      dispatch({ type: 'setGuardian', patch: { status: 'overdue' } })
    }
  }, [overdue, guardian.status])

  const beginReconstruction = () => {
    dispatch({ type: 'setGuardian', patch: { status: 'reconstructing' } })
    navigation.navigate('Reconstruction')
  }

  const toggleFastForward = (value) => {
    const multiplier = value ? 86400 : 1
    dispatch({ type: 'setFastForward', value })
    clock.setMultiplier(multiplier)
    protocol.setFastForward(multiplier)
  }

  const tone = overdue ? 'overdue' : guardian.status === 'reconstructing' ? 'reconstructing' : 'active'
  const toneLabel = overdue ? 'Overdue' : guardian.status === 'reconstructing' ? 'Reconstructing' : 'Active'

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Guardianship"
          title={guardian.ownerLabel || 'Anonymous Owner'}
          right={<StatusPill tone={tone} label={toneLabel} />}
        />

        <View style={styles.ringWrap}>
          <CountdownRing
            progress={progress}
            primary={overdue ? 'silent' : formatRemaining(remaining)}
            caption={overdue ? 'past deadline' : 'until trigger'}
            tint={colors.iconTint.guardian}
          />
        </View>

        <View style={styles.body}>
          {overdue ? (
            <Card style={{ backgroundColor: colors.dangerMuted }}>
              <Text style={[typography.headline, { color: colors.danger }]}>
                Owner has gone silent
              </Text>
              <Text style={[typography.subhead, { color: colors.text, marginTop: 4 }]}>
                The deadline has elapsed. You can join the other Guardians on the reconstruction topic and unlock the Vault together.
              </Text>
              <Button title="Begin reconstruction" variant="destructive" onPress={beginReconstruction} style={{ marginTop: spacing.md }} />
            </Card>
          ) : (
            <Card>
              <View style={styles.metricRow}>
                <Text style={[typography.body, { color: colors.text }]}>Last heartbeat</Text>
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  {formatRelative(clock.now() - lastSeen)}
                </Text>
              </View>
              <View style={[styles.metricRow, { marginTop: spacing.md }]}>
                <Text style={[typography.body, { color: colors.text }]}>Deadline</Text>
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  {formatRemaining(deadlineMs)}
                </Text>
              </View>
              <View style={[styles.metricRow, { marginTop: spacing.md }]}>
                <Text style={[typography.body, { color: colors.text }]}>Threshold</Text>
                <Text style={[typography.headline, { color: colors.accent }]}>
                  {guardian.M}-of-{guardian.N}
                </Text>
              </View>
            </Card>
          )}

          <SectionHeader title="Your shard" />
          <GroupedList>
            <GroupedRow>
              <AppIcon icon="key" tint={colors.iconTint.shard} size={36} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.body, { color: colors.text }]}>Shard #{(guardian.shardIndex || 0) + 1}</Text>
                <Text style={[typography.footnote, { color: colors.textTertiary }]}>
                  Sealed to this device with your keypair
                </Text>
              </View>
              <StatusPill tone="online" label="Sealed" showDot={false} />
            </GroupedRow>
            <GroupedRow last>
              <AppIcon icon="link" tint={colors.iconTint.estate} size={36} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.body, { color: colors.text }]}>Owner public key</Text>
                <Text numberOfLines={1} style={[typography.mono, { color: colors.textTertiary, fontSize: 12, marginTop: 2 }]}>
                  {guardian.ownerPubKey}
                </Text>
              </View>
            </GroupedRow>
          </GroupedList>

          <SectionHeader title="Demo controls" />
          <Card>
            <View style={styles.metricRow}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text }]}>Fast-forward time</Text>
                <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                  Compress the deadline by 60×.
                </Text>
              </View>
              <Switch value={state.fastForward} onValueChange={toggleFastForward} />
            </View>
            <View style={[styles.metricRow, { marginTop: spacing.md }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text }]}>Pause heartbeat watcher</Text>
                <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                  Simulates the Owner going silent.
                </Text>
              </View>
              <Switch value={observingPaused} onValueChange={setObservingPaused} />
            </View>
          </Card>

          <View style={{ height: spacing.lg }} />
          <Button title="Stop guarding" variant="ghost" onPress={() => {
            dispatch({ type: 'setMode', mode: null })
            navigation.reset({ index: 0, routes: [{ name: 'ModeSelect' }] })
          }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  ringWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  body: { paddingHorizontal: spacing.lg },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
})
