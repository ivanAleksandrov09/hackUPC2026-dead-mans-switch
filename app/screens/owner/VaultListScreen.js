import React from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card } from '../../components/Card'
import { AppIcon } from '../../components/AppIcon'
import { Button } from '../../components/Button'
import { ScreenHeader } from '../../components/Header'
import { colors, spacing, typography, shadows } from '../../theme'
import { useStore } from '../../services/store'

export default function VaultListScreen ({ navigation }) {
  const { state, dispatch } = useStore()
  const vaults = state.owners || []

  const open = (vault) => {
    dispatch({ type: 'selectOwner', id: vault.id })
    navigation.reset({ index: 0, routes: [{ name: 'OwnerDashboard' }] })
  }

  const addNew = () => {
    dispatch({ type: 'setMode', mode: 'owner' })
    dispatch({ type: 'clearOwner' })
    navigation.navigate('SetupWelcome')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.backRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={{ color: colors.accent, fontSize: 17 }}>‹ Back</Text>
          </Pressable>
        </View>

        <ScreenHeader
          eyebrow="Vault"
          title="My Vaults"
          subtitle={vaults.length === 0 ? 'No vaults yet.' : `${vaults.length} vault${vaults.length !== 1 ? 's' : ''} on this device.`}
        />

        <View style={styles.body}>
          {vaults.map((vault) => (
            <Pressable key={vault.id} onPress={() => open(vault)}>
              {({ pressed }) => (
                <Card style={[styles.vaultCard, pressed && styles.pressed]}>
                  <View style={styles.row}>
                    <AppIcon icon="lock" tint={colors.iconTint.estate} size={48} />
                    <View style={styles.info}>
                      <Text style={[typography.headline, { color: colors.text }]}>
                        {vault.estateLabel || 'My Vault'}
                      </Text>
                      {vault.name ? (
                        <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                          {vault.name}
                        </Text>
                      ) : null}
                      <Text style={[typography.footnote, { color: colors.textTertiary, marginTop: 2 }]}>
                        {(vault.guardians || []).length} guardian{(vault.guardians || []).length !== 1 ? 's' : ''} · {vault.M}-of-{vault.N}
                      </Text>
                    </View>
                    <Text style={[typography.title2, { color: colors.accent }]}>›</Text>
                  </View>
                </Card>
              )}
            </Pressable>
          ))}

          {vaults.length === 0 && (
            <Card style={{ backgroundColor: colors.accentMuted, marginBottom: spacing.lg }}>
              <Text style={[typography.subhead, { color: colors.text }]}>
                You haven't completed a vault setup yet. Tap below to get started.
              </Text>
            </Card>
          )}

          <Button title="+ Set up a new vault" onPress={addNew} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 60 },
  backRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  vaultCard: {
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.iconTint.estate,
    ...shadows.card
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginLeft: spacing.md },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 }
})
