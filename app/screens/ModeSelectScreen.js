import React from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card } from '../components/Card'
import { AppIcon } from '../components/AppIcon'
import { colors, radii, spacing, typography, shadows } from '../theme'
import { useStore } from '../services/store'

const NEW_MODES = [
  {
    id: 'owner',
    glyph: '🔒',
    tint: colors.iconTint.estate,
    title: 'Set up my Vault',
    subtitle: 'Encrypt your estate and choose Guardians who will release it if you go silent.'
  },
  {
    id: 'guardian',
    glyph: '🛡️',
    tint: colors.iconTint.guardian,
    title: 'Become a Guardian',
    subtitle: 'Hold a sealed key shard for someone you care about. Their vault opens only with you.'
  }
]

export default function ModeSelectScreen ({ navigation }) {
  const { state, dispatch } = useStore()

  const hasOwnerVault = !!state.owner?.driveKey
  const hasGuardianVault = !!state.guardian?.sealedShard

  const resume = (mode) => {
    dispatch({ type: 'setMode', mode })
    navigation.navigate(mode === 'owner' ? 'OwnerDashboard' : 'GuardianDashboard')
  }

  const select = (mode) => {
    dispatch({ type: 'setMode', mode })
    navigation.navigate(mode === 'owner' ? 'SetupWelcome' : 'GuardianOnboarding')
  }

  const showSaved = hasOwnerVault || hasGuardianVault

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <AppIcon glyph="⚰️" tint={colors.accent} size={84} />
          <Text style={[typography.largeTitle, styles.title]}>Vault</Text>
          <Text style={[typography.callout, styles.subtitle]}>
            A decentralized inheritance system.{'\n'}No servers. No middlemen. Just you, your people, and a shared promise.
          </Text>
        </View>

        {showSaved ? (
          <>
            <View style={styles.sectionLabel}>
              <Text style={[typography.footnote, styles.sectionLabelText]}>SAVED VAULTS</Text>
            </View>

            {hasOwnerVault && (
              <Pressable onPress={() => resume('owner')}>
                {({ pressed }) => (
                  <Card style={[styles.savedCard, pressed && styles.pressed]}>
                    <View style={styles.modeRow}>
                      <AppIcon glyph="🔒" tint={colors.iconTint.estate} size={48} />
                      <View style={styles.modeText}>
                        <Text style={[typography.headline, { color: colors.text }]}>
                          {state.owner?.estateLabel || 'My Vault'}
                        </Text>
                        <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                          Owner · tap to unlock
                        </Text>
                      </View>
                      <Text style={[typography.title2, { color: colors.accent, marginLeft: spacing.sm }]}>›</Text>
                    </View>
                  </Card>
                )}
              </Pressable>
            )}

            {hasGuardianVault && (
              <Pressable onPress={() => resume('guardian')}>
                {({ pressed }) => (
                  <Card style={[styles.savedCard, pressed && styles.pressed]}>
                    <View style={styles.modeRow}>
                      <AppIcon glyph="🛡️" tint={colors.iconTint.guardian} size={48} />
                      <View style={styles.modeText}>
                        <Text style={[typography.headline, { color: colors.text }]}>
                          {state.guardian?.ownerLabel || 'Guardian role'}
                        </Text>
                        <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                          Guardian · tap to continue
                        </Text>
                      </View>
                      <Text style={[typography.title2, { color: colors.accent, marginLeft: spacing.sm }]}>›</Text>
                    </View>
                  </Card>
                )}
              </Pressable>
            )}

            <View style={styles.sectionLabel}>
              <Text style={[typography.footnote, styles.sectionLabelText]}>START FRESH</Text>
            </View>
          </>
        ) : (
          <View style={{ height: spacing.xl }} />
        )}

        {NEW_MODES.map((m) => (
          <Pressable key={m.id} onPress={() => select(m.id)}>
            {({ pressed }) => (
              <Card style={[styles.modeCard, pressed && styles.pressed]}>
                <View style={styles.modeRow}>
                  <AppIcon glyph={m.glyph} tint={m.tint} size={56} />
                  <View style={styles.modeText}>
                    <Text style={[typography.headline, { color: colors.text }]}>{m.title}</Text>
                    <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: 2 }]}>
                      {m.subtitle}
                    </Text>
                  </View>
                  <Text style={[typography.title2, { color: colors.textTertiary, marginLeft: spacing.sm }]}>›</Text>
                </View>
              </Card>
            )}
          </Pressable>
        ))}

        <View style={styles.footer}>
          <Text style={[typography.caption1, { color: colors.textTertiary, textAlign: 'center' }]}>
            Encrypted end-to-end with libsodium · Threshold cryptography (Shamir)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg
  },
  title: {
    color: colors.text,
    marginTop: spacing.lg
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 4
  },
  sectionLabelText: {
    color: colors.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.6
  },
  savedCard: {
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    ...shadows.card
  },
  modeCard: {
    marginBottom: spacing.md,
    ...shadows.card
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  modeText: {
    flex: 1,
    marginLeft: spacing.lg
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95
  },
  footer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg
  }
})
