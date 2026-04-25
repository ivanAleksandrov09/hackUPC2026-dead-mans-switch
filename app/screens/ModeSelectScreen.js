import React from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'

import { Card } from '../components/Card'
import { AppIcon } from '../components/AppIcon'
import { colors, spacing, typography, shadows } from '../theme'
import { useStore } from '../services/store'

const NEW_MODES = [
  {
    id: 'owner',
    icon: 'lock',
    tint: colors.iconTint.estate,
    title: 'Create a Vault',
    subtitle: 'Encrypt your estate and appoint Guardians who can release it if you go silent.'
  },
  {
    id: 'guardian',
    icon: 'shield',
    tint: colors.iconTint.guardian,
    title: 'Become a Guardian',
    subtitle: 'Hold a sealed key shard for someone you trust. Their vault opens only when M Guardians agree.'
  }
]

export default function ModeSelectScreen ({ navigation }) {
  const { state, dispatch } = useStore()

  const vaults = state.owners || []
  const hasOwnerVaults = vaults.length > 0
  const hasGuardianVault = !!state.guardian?.sealedShard
  const showSaved = hasOwnerVaults || hasGuardianVault

  const returningName = vaults[0]?.name || null

  const resumeGuardian = () => {
    dispatch({ type: 'setMode', mode: 'guardian' })
    navigation.navigate('GuardianDashboard')
  }

  const select = (mode) => {
    dispatch({ type: 'setMode', mode })
    navigation.navigate(mode === 'owner' ? 'SetupWelcome' : 'GuardianOnboarding')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {showSaved ? (
          <>
            {returningName ? (
              <LinearGradient
                colors={['#E8EFFC', '#EDF2FB', '#EEE8FA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.welcomeBox}
              >
                <Image source={require('../assets/logo.png')} style={styles.wordmark} resizeMode="contain" />
                <Text style={[typography.largeTitle, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
                  Welcome back,{'\n'}{returningName}.
                </Text>
                <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
                  Good to see you're still with us.
                </Text>
              </LinearGradient>
            ) : (
              <View style={{ height: spacing.xxl }} />
            )}

            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>SAVED</Text>
            </View>

            {hasOwnerVaults && (
              <Pressable onPress={() => navigation.navigate('VaultList')}>
                {({ pressed }) => (
                  <Card style={[styles.savedCard, pressed && styles.pressed]}>
                    <View style={styles.row}>
                      <AppIcon icon="lock" tint={colors.iconTint.estate} size={48} />
                      <View style={styles.rowText}>
                        <Text style={[typography.headline, { color: colors.text }]}>My Vaults</Text>
                        <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                          {vaults.length} vault{vaults.length !== 1 ? 's' : ''} on this device
                        </Text>
                      </View>
                      <Text style={[typography.title2, { color: colors.accent }]}>›</Text>
                    </View>
                  </Card>
                )}
              </Pressable>
            )}

            {hasGuardianVault && (
              <Pressable onPress={resumeGuardian}>
                {({ pressed }) => (
                  <Card style={[styles.savedCard, pressed && styles.pressed]}>
                    <View style={styles.row}>
                      <AppIcon icon="shield" tint={colors.iconTint.guardian} size={48} />
                      <View style={styles.rowText}>
                        <Text style={[typography.headline, { color: colors.text }]}>
                          {state.guardian?.ownerLabel || 'Guardian role'}
                        </Text>
                        <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                          Guardian · tap to continue
                        </Text>
                      </View>
                      <Text style={[typography.title2, { color: colors.accent }]}>›</Text>
                    </View>
                  </Card>
                )}
              </Pressable>
            )}

            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>START FRESH</Text>
            </View>
          </>
        ) : (
          <LinearGradient
            colors={['#E8EFFC', '#EDF2FB', '#EEE8FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Image source={require('../assets/logo.png')} style={styles.heroLogo} resizeMode="contain" />
            <Text style={[typography.callout, styles.heroSubtitle]}>
              Decentralised inheritance.{'\n'}No servers. No middlemen. Threshold cryptography.
            </Text>
          </LinearGradient>
        )}

        {NEW_MODES.map((m) => (
          <Pressable key={m.id} onPress={() => select(m.id)}>
            {({ pressed }) => (
              <Card style={[styles.modeCard, pressed && styles.pressed]}>
                <View style={styles.row}>
                  <AppIcon icon={m.icon} tint={m.tint} size={56} />
                  <View style={styles.rowText}>
                    <Text style={[typography.headline, { color: colors.text }]}>{m.title}</Text>
                    <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: 2 }]}>
                      {m.subtitle}
                    </Text>
                  </View>
                  <Text style={[typography.title2, { color: colors.textTertiary }]}>›</Text>
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
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: 12,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg
  },
  heroLogo: {
    width: 220,
    height: 90
  },
  heroSubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md
  },
  welcomeBox: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: 12,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg
  },
  wordmark: {
    width: 150,
    height: 60
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 4
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textTertiary
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
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rowText: {
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
