import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Switch, Pressable, Animated, ActionSheetIOS } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'

import { Card, GroupedList, GroupedRow } from '../../components/Card'

import { AppIcon } from '../../components/AppIcon'
import { CountdownRing } from '../../components/CountdownRing'
import { Feather } from '@expo/vector-icons'
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

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current
  const kickScale = useRef(new Animated.Value(1)).current
  const flashOpacity = useRef(new Animated.Value(0)).current
  const ringFlash = useRef(new Animated.Value(0)).current

  // Continuous heartbeat pulse on the icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.22, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.delay(15000)
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const lastKick = owner.lastKick || clock.now()
  const deadlineMs = (owner.deadlineSeconds || 0) * 1000
  const elapsed = clock.now() - lastKick
  const remaining = Math.max(0, deadlineMs - elapsed)
  const progress = deadlineMs > 0 ? remaining / deadlineMs : 0

  const ringColor = progress > 0.4 ? colors.accent
    : progress > 0.15 ? colors.warning
    : colors.danger

  const kick = async () => {
    // Haptics: impact + success notification for satisfying double-feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {})
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), 120)

    dispatch({ type: 'setOwner', patch: { lastKick: clock.now() } })

    // Button: pop up then spring back
    Animated.sequence([
      Animated.spring(kickScale, { toValue: 1.04, useNativeDriver: true, speed: 40, bounciness: 8 }),
      Animated.spring(kickScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 })
    ]).start()

    // Green flash overlay on the button
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 600, useNativeDriver: true })
    ]).start()

    // Ring briefly flashes green
    Animated.sequence([
      Animated.timing(ringFlash, { toValue: 1, duration: 60, useNativeDriver: false }),
      Animated.timing(ringFlash, { toValue: 0, duration: 900, useNativeDriver: false })
    ]).start()
  }

  const toggleFastForward = (value) => {
    dispatch({ type: 'setFastForward', value })
    clock.setMultiplier(value ? 60 : 1)
  }

  const openSettings = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Cancel', 'Sign out'], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
      (i) => {
        if (i === 1) {
          dispatch({ type: 'setMode', mode: null })
          navigation.reset({ index: 0, routes: [{ name: 'ModeSelect' }] })
        }
      }
    )
  }

  // Interpolate ring color: flash green then settle back to real color
  const animatedRingColor = ringFlash.interpolate({
    inputRange: [0, 1],
    outputRange: [ringColor, colors.success]
  })

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Vault"
          title={owner.estateLabel || 'My Vault'}
          right={
            <Pressable onPress={openSettings} hitSlop={12}>
              <Feather name="settings" size={22} color={colors.textTertiary} />
            </Pressable>
          }
        />

        <View style={styles.ringWrap}>
          <CountdownRing
            progress={progress}
            primary={formatRemaining(remaining)}
            caption={remaining > 0 ? 'until reconstruction' : 'deadline reached'}
            tint={animatedRingColor}
          />
        </View>

        <View style={styles.body}>
          {progress < 0.15 && remaining > 0 && (
            <View style={styles.dangerBanner}>
              <Text style={[typography.footnote, { color: colors.danger, fontWeight: '700' }]}>
                ⚠️  Deadline critical — tap now or your Guardians can unlock your vault.
              </Text>
            </View>
          )}
          {progress >= 0.15 && progress < 0.4 && remaining > 0 && (
            <View style={styles.warningBanner}>
              <Text style={[typography.footnote, { color: colors.warning, fontWeight: '600' }]}>
                Your deadline is approaching. Tap to reset the clock.
              </Text>
            </View>
          )}

          <Pressable onPress={kick}>
            <Animated.View style={[
              styles.kickButton,
              { transform: [{ scale: kickScale }] },
              progress < 0.15 && remaining > 0 && styles.kickButtonDanger,
              progress >= 0.15 && progress < 0.4 && remaining > 0 && styles.kickButtonWarning
            ]}>
              {/* Green flash overlay */}
              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, styles.flashOverlay, { opacity: flashOpacity }]}
              />
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <AppIcon glyph="💗" tint={colors.iconTint.heartbeat} size={44} />
              </Animated.View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.headline, { color: colors.text }]}>I'm alive</Text>
                <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                  Last kick {formatRelative(clock.now() - lastKick)}
                </Text>
              </View>
              <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>Tap →</Text>
            </Animated.View>
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
            <View style={styles.shieldRow}>
              {Array.from({ length: owner.N || 0 }).map((_, i) => {
                const filled = i < (owner.M || 0)
                return (
                  <View key={i} style={[styles.shieldWrap, { opacity: filled ? 1 : 0.3 }]}>
                    <AppIcon
                      glyph="🛡️"
                      tint={filled ? colors.iconTint.guardian : colors.textTertiary}
                      size={40}
                    />
                  </View>
                )
              })}
            </View>
            <Text style={[typography.footnote, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
              {owner.M}-of-{owner.N} guardians needed to unlock
            </Text>
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
  warningBanner: {
    backgroundColor: colors.warningMuted,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md
  },
  dangerBanner: {
    backgroundColor: colors.dangerMuted,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md
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
    marginBottom: spacing.sm,
    overflow: 'hidden'
  },
  kickButtonWarning: {
    borderWidth: 1.5,
    borderColor: colors.warning
  },
  kickButtonDanger: {
    borderWidth: 1.5,
    borderColor: colors.danger
  },
  flashOverlay: {
    backgroundColor: colors.success,
    borderRadius: radii.lg,
    opacity: 0
  },
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
  shieldRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  shieldWrap: {
    alignItems: 'center'
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
})
