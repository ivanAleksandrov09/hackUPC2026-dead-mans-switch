import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Switch, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'

import { Card, GroupedList, GroupedRow } from '../../components/Card'
import { Button } from '../../components/Button'
import { AppIcon } from '../../components/AppIcon'
import { CountdownRing } from '../../components/CountdownRing'
import { StatusPill } from '../../components/StatusPill'
import { ScreenHeader, SectionHeader } from '../../components/Header'
import { colors, radii, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'
import { clock, formatRemaining, formatRelative } from '../../services/clock'

export default function OwnerDashboardScreen ({ navigation }) {
  const { state, dispatch } = useStore()
  const owner = state.owner || {}
  const guardians = owner.guardians || []
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const lastKick = owner.lastKick || clock.now()
  const deadlineMs = (owner.deadlineSeconds || 0) * 1000
  const elapsed = clock.now() - lastKick
  const remaining = Math.max(0, deadlineMs - elapsed)
  const progress = deadlineMs > 0 ? remaining / deadlineMs : 0

  const kick = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    dispatch({ type: 'setOwner', patch: { lastKick: clock.now() } })
  }

  const toggleFastForward = (value) => {
    dispatch({ type: 'setFastForward', value })
    clock.setMultiplier(value ? 60 : 1)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Vault"
          title={owner.estateLabel || 'My Vault'}
        />

        <View style={styles.ringWrap}>
          <CountdownRing
            progress={progress}
            primary={formatRemaining(remaining)}
            caption={remaining > 0 ? 'until reconstruction' : 'deadline reached'}
          />
        </View>

        <View style={styles.body}>
          <Pressable onPress={kick}>
            {({ pressed }) => (
              <View style={[styles.kickButton, pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }]}>
                <AppIcon glyph="💗" tint={colors.iconTint.heartbeat} size={44} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[typography.headline, { color: colors.text }]}>I'm alive</Text>
                  <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                    Last kick {formatRelative(clock.now() - lastKick)}
                  </Text>
                </View>
                <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>Tap →</Text>
              </View>
            )}
          </Pressable>

          <SectionHeader title="My Estate" />
          <Pressable onPress={() => navigation.navigate('EstateBrowser')}>
            {({ pressed }) => (
              <View style={[styles.estateButton, pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }]}>
                <AppIcon glyph="🏠" tint={colors.iconTint.estate} size={44} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[typography.headline, { color: colors.text }]}>View estate</Text>
                  <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                    {(owner.items || []).length} item{(owner.items || []).length !== 1 ? 's' : ''} stored
                  </Text>
                </View>
                <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>Open →</Text>
              </View>
            )}
          </Pressable>

          <SectionHeader
            title="Guardians"
            action={
              <Pressable onPress={() => navigation.navigate('GuardianRoster')}>
                <Text style={[typography.subhead, { color: colors.accent }]}>Manage</Text>
              </Pressable>
            }
          />
          <GroupedList>
            {guardians.map((g, i) => {
              const isLive = (clock.now() - (g.lastSeenAt || 0)) < 7 * 24 * 3600 * 1000
              return (
                <GroupedRow key={g.index} last={i === guardians.length - 1}>
                  <AppIcon
                    glyph="🛡️"
                    tint={isLive ? colors.iconTint.guardian : colors.textTertiary}
                    size={36}
                  />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.body, { color: colors.text }]}>{g.label}</Text>
                    <Text style={[typography.footnote, { color: colors.textTertiary }]}>
                      Shard #{g.index + 1} · {g.lastSeenAt ? `seen ${formatRelative(clock.now() - g.lastSeenAt)}` : 'never seen'}
                    </Text>
                  </View>
                  <StatusPill tone={isLive ? 'online' : 'pending'} label={isLive ? 'Online' : 'Idle'} />
                </GroupedRow>
              )
            })}
          </GroupedList>

          <SectionHeader title="Threshold" />
          <Card>
            <View style={styles.metricRow}>
              <Text style={[typography.body, { color: colors.text }]}>Required to unlock</Text>
              <Text style={[typography.headline, { color: colors.accent }]}>
                {owner.M}-of-{owner.N}
              </Text>
            </View>
            <View style={[styles.metricRow, { marginTop: spacing.md }]}>
              <Text style={[typography.body, { color: colors.text }]}>Inactivity deadline</Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                {formatRemaining(deadlineMs)}
              </Text>
            </View>
          </Card>

          <SectionHeader title="Demo controls" />
          <Card>
            <View style={styles.metricRow}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text }]}>Fast-forward time</Text>
                <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                  Compress your deadline by 60×.
                </Text>
              </View>
              <Switch value={state.fastForward} onValueChange={toggleFastForward} />
            </View>
          </Card>

          <View style={{ height: spacing.lg }} />
          <Button title="Sign out" variant="ghost" onPress={() => {
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
  ringWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg
  },
  body: { paddingHorizontal: spacing.lg },
  estateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    marginBottom: spacing.sm
  },
  kickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    marginBottom: spacing.sm
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
})
