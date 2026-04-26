import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
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
  const M = state.owner?.M || 2
  const N = state.owner?.N || 3

  const [invites] = useState(() =>
    Object.fromEntries(guardians.map((g) => [g.index, protocol.generateInviteCode()]))
  )
  // 'pending' | 'sending' | 'accepted' | 'error'
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(guardians.map((g) => [g.index, 'pending']))
  )
  const [shards, setShards] = useState(null)   // string[] — shard hexes
  const [preparing, setPreparing] = useState(true)
  const [prepError, setPrepError] = useState(null)

  // Generate estate key, encrypt items, split into shards — all via bridge.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const ekHex = await protocol.generateEstateKey()
        const items = state.owner?.items || []
        // Encrypt each note body; store ciphertexts so guardians can decrypt
        // them after reconstruction using the recovered estate key.
        const encryptedItems = await Promise.all(items.map(async (item) => {
          if (item.kind === 'note' && item.body) {
            const ctHex = await protocol.encryptEstate(item.body, ekHex)
            return { id: item.id, kind: item.kind, label: item.label, ctHex }
          }
          return { id: item.id, kind: item.kind, label: item.label }
        }))
        const shardHexes = await protocol.splitKey(ekHex, { M, N })
        if (!cancelled) {
          setShards(shardHexes)
          const patch = { estateKeyHash: ekHex.slice(0, 16), vaultCreatedAt: Date.now(), encryptedItems }
          dispatch({ type: 'setOwner', patch })
          setPreparing(false)
          // Auto-register every invite code immediately — 10-minute window.
          // Guardian just needs to enter the code; no owner tap required.
          guardians.forEach((g) => {
            protocol.openInvite(
              invites[g.index],
              shardHexes[g.index],
              {
                shardIndex:      g.index,
                M,
                N,
                deadlineSeconds: state.owner?.deadlineSeconds ?? 30,
                ownerGroupKey:   patch.estateKeyHash,
                vaultCreatedAt:  patch.vaultCreatedAt,
                encryptedItems:  patch.encryptedItems
              },
              {
                onDelivered: () => {
                  setStatuses((s) => ({ ...s, [g.index]: 'accepted' }))
                  dispatch({ type: 'updateGuardianRow', index: g.index, patch: { handoffStatus: 'accepted', lastSeenAt: Date.now() } })
                },
                onError: () => setStatuses((s) => ({ ...s, [g.index]: 'error' }))
              }
            )
          })
        }
      } catch (err) {
        if (!cancelled) setPrepError(err.message)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const acceptedCount = guardians.filter((g) => statuses[g.index] === 'accepted').length

  const copyCode = (index) => {
    Clipboard.setStringAsync(invites[index]).catch(() => {})
  }

  const finish = () => {
    const id = state.owner?.id || 'vault-' + Date.now().toString(36)
    dispatch({ type: 'setOwner', patch: { id, driveKey: 'stub-' + id, lastKick: Date.now() } })
    dispatch({ type: 'saveOwner' })
    navigation.reset({ index: 0, routes: [{ name: 'VaultArmed' }] })
  }

  if (prepError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <Text style={[typography.headline, { color: colors.danger }]}>Bridge error</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            {prepError}
          </Text>
          <Text style={[typography.footnote, { color: colors.textTertiary, marginTop: spacing.lg, textAlign: 'center' }]}>
            Make sure the bridge is running on the laptop:{'\n'}npm run bridge
          </Text>
          <Button title="Back" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl }} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Step 4 of 4"
          title="Hand off the shards"
          subtitle="Share each code with its Guardian. Codes are active for 10 minutes — tap to copy."
        />
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <StepIndicator total={5} current={4} />
        </View>

        {preparing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.lg }]}>
              Generating estate key and splitting shards…
            </Text>
          </View>
        ) : (
          <View style={styles.body}>
            <SectionHeader title={`Invites · ${acceptedCount}/${guardians.length} accepted`} />
            {guardians.map((g) => {
              const isDone = statuses[g.index] === 'accepted'
              return (
                <Card key={g.index} style={styles.inviteCard}>
                  <View style={styles.inviteHeader}>
                    <AppIcon
                      icon={isDone ? 'check' : 'shield'}
                      tint={isDone ? colors.success : colors.iconTint.guardian}
                      size={44}
                    />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={[typography.headline, { color: colors.text }]}>{g.label}</Text>
                      <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                        Shard #{g.index + 1}
                      </Text>
                    </View>
                    <StatusPill
                      tone={isDone ? 'active' : 'pending'}
                      label={isDone ? 'Accepted' : 'Waiting'}
                    />
                  </View>

                  <Pressable onPress={() => copyCode(g.index)}>
                    <View style={[styles.codeBox, isDone && { opacity: 0.5 }]}>
                      <Text selectable style={[typography.mono, { color: colors.text, textAlign: 'center' }]}>
                        {invites[g.index]}
                      </Text>
                      <Text style={[typography.footnote, { color: colors.accent, textAlign: 'center', marginTop: 4 }]}>
                        {isDone ? 'Shard delivered ✓' : 'Tap to copy · active 10 min'}
                      </Text>
                    </View>
                  </Pressable>
                </Card>
              )
            })}

            <Card style={{ backgroundColor: colors.accentMuted, marginTop: spacing.lg }}>
              <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>
                How it works
              </Text>
              <Text style={[typography.subhead, { color: colors.text, marginTop: 4 }]}>
                Share each code out-of-band (text, Signal, etc.). When the Guardian pastes it on their phone, the bridge connects and pushes their sealed shard automatically.
              </Text>
            </Card>
          </View>
        )}

        <View style={styles.footer}>
          <Button title="Finish setup" onPress={finish} disabled={preparing} />
          <Text style={[typography.caption1, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm }]}>
            {acceptedCount}/{guardians.length} confirmed · {M}-of-{N} threshold
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, minHeight: 300 },
  body: { paddingHorizontal: spacing.lg },
  inviteCard: { marginBottom: spacing.md },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  codeBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center'
  },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
})
