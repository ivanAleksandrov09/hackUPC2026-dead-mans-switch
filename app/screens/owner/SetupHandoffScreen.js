import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'

import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { AppIcon } from '../../components/AppIcon'
import { StatusPill } from '../../components/StatusPill'
import { StepIndicator } from '../../components/StepIndicator'
import { ScreenHeader, SectionHeader } from '../../components/Header'
import { colors, radii, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'
import * as protocol from '../../services/protocol'

export default function SetupHandoffScreen ({ navigation }) {
  const { state, dispatch } = useStore()
  const guardians = state.owner?.guardians || []
  const [invites, setInvites] = useState(() =>
    Object.fromEntries(guardians.map((g) => [g.index, protocol.generateInviteCode()]))
  )
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(guardians.map((g) => [g.index, 'live']))
  )

  const allAccepted = guardians.every((g) => statuses[g.index] === 'accepted')
  const acceptedCount = guardians.filter((g) => statuses[g.index] === 'accepted').length

  const copyInvite = async (index) => {
    await Clipboard.setStringAsync(invites[index])
    // Demo only: simulate the guardian accepting after we copy.
    // Remove this when wired to real net/invite.js — the real handoff completes
    // when the guardian's app pastes the code and the secret-stream connects.
    setTimeout(() => {
      setStatuses((s) => ({ ...s, [index]: 'accepted' }))
      dispatch({
        type: 'updateGuardianRow',
        index,
        patch: { handoffStatus: 'accepted', publicKeyHex: 'pubkey-' + index, lastSeenAt: Date.now() }
      })
    }, 1200)
  }

  const finish = async () => {
    // Real impl: generate EK, encrypt items into Hyperdrive, persist driveKey.
    const driveKey = 'mock-drive-key-' + Math.random().toString(36).slice(2)
    dispatch({
      type: 'setOwner',
      patch: {
        driveKey,
        estateKeyHash: 'mock-ek-hash-' + Date.now().toString(36),
        lastKick: Date.now()
      }
    })
    navigation.reset({ index: 0, routes: [{ name: 'OwnerDashboard' }] })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Step 4 of 4"
          title="Hand off the shards"
          subtitle="Send each invite code to its Guardian. Their app will pull a sealed shard the moment they paste it."
        />

        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <StepIndicator total={5} current={4} />
        </View>

        <View style={styles.body}>
          <SectionHeader title={`Invites · ${acceptedCount}/${guardians.length} accepted`} />
          {guardians.map((g) => {
            const status = statuses[g.index]
            return (
              <Card key={g.index} style={styles.inviteCard}>
                <View style={styles.inviteHeader}>
                  <AppIcon
                    glyph={status === 'accepted' ? '✓' : '🛡️'}
                    tint={status === 'accepted' ? colors.success : colors.iconTint.guardian}
                    size={44}
                  />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.headline, { color: colors.text }]}>{g.label}</Text>
                    <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                      Guardian {g.index + 1} · holds shard #{g.index + 1}
                    </Text>
                  </View>
                  <StatusPill
                    tone={status === 'accepted' ? 'active' : 'pending'}
                    label={status === 'accepted' ? 'Accepted' : 'Awaiting'}
                  />
                </View>

                <Pressable onPress={() => copyInvite(g.index)} disabled={status === 'accepted'}>
                  <View style={[styles.codeBox, status === 'accepted' && { opacity: 0.5 }]}>
                    <Text selectable style={[typography.mono, { color: colors.text, textAlign: 'center' }]}>
                      {invites[g.index]}
                    </Text>
                    <Text style={[typography.footnote, { color: colors.accent, textAlign: 'center', marginTop: 4 }]}>
                      {status === 'accepted' ? 'Sealed and stored' : 'Tap to copy'}
                    </Text>
                  </View>
                </Pressable>
              </Card>
            )
          })}

          <Card style={{ backgroundColor: colors.accentMuted, marginTop: spacing.lg }}>
            <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>
              Privacy note
            </Text>
            <Text style={[typography.subhead, { color: colors.text, marginTop: 4 }]}>
              Guardians don't see each other's identities or your estate. They only see a sealed shard, your public key, and the deadline.
            </Text>
          </Card>
        </View>

        <View style={styles.footer}>
          <Button title="Finish setup" onPress={finish} disabled={!allAccepted} />
          <Text style={[typography.caption1, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm }]}>
            {allAccepted ? 'All shards delivered. Vault is armed.' : 'Waiting for every Guardian to accept.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  body: { paddingHorizontal: spacing.lg },
  inviteCard: { marginBottom: spacing.md },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  codeBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md
  },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
})
