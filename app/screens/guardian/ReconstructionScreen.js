import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card } from '../../components/Card'
import { AppIcon } from '../../components/AppIcon'
import { Button } from '../../components/Button'
import { ScreenHeader } from '../../components/Header'
import { StatusPill } from '../../components/StatusPill'
import { colors, radii, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'
import * as protocol from '../../services/protocol'

export default function ReconstructionScreen ({ navigation }) {
  const { state, dispatch } = useStore()
  const guardian = state.guardian || {}
  const [peers, setPeers] = useState([])         // [{ guardianIndex, lastSeenAt, hasShard }]
  const [shardsCollected, setShardsCollected] = useState(1) // we count ourselves
  const [phase, setPhase] = useState('joining')  // joining | gathering | quorum | done
  const subRef = useRef(null)

  const M = guardian.M || 2
  const N = guardian.N || 3

  useEffect(() => {
    setPhase('gathering')
    subRef.current = protocol.joinReconstruction({
      ownerPubKey: guardian.ownerPubKey,
      guardianIndex: guardian.shardIndex || 0,
      shardHex: guardian.sealedShard,
      lastSeenAt: guardian.lastSeenAt || Date.now(),
      M,
      onPeer: (peer) => {
        setPeers((prev) => prev.find((p) => p.guardianIndex === peer.guardianIndex)
          ? prev
          : [...prev, { ...peer, hasShard: false }])
      },
      onShard: ({ guardianIndex, total }) => {
        setShardsCollected(total)
        setPeers((prev) => prev.map((p) =>
          p.guardianIndex === guardianIndex ? { ...p, hasShard: true } : p
        ))
      },
      onQuorum: ({ ekHex }) => {
        setPhase('quorum')
        setTimeout(() => {
          setPhase('done')
          dispatch({ type: 'setGuardian', patch: { status: 'unlocked', ekHex } })
          navigation.replace('EstateUnlocked')
        }, 1200)
      }
    })
    return () => { subRef.current?.stop() }
  }, [])

  const fillRatio = Math.min(1, shardsCollected / M)

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Reconstruction"
          title="Gathering Guardians"
          subtitle="Each Guardian who agrees the Owner has gone silent will appear here. Their shards will combine into the Estate Key."
          right={<StatusPill tone="reconstructing" label={phase === 'done' ? 'Unlocked' : phase === 'quorum' ? 'Quorum' : 'Live'} />}
        />

        <View style={styles.body}>
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <AppIcon
              icon={phase === 'done' ? 'check' : 'unlock'}
              tint={phase === 'done' ? colors.success : colors.iconTint.reconstruction}
              size={84}
            />
            <Text style={[typography.title2, { color: colors.text, marginTop: spacing.lg }]}>
              {shardsCollected}/{M} shards collected
            </Text>
            <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: 4 }]}>
              Threshold {M}-of-{N}. Reaching quorum unlocks the Vault.
            </Text>
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: `${fillRatio * 100}%` }]} />
            </View>
          </Card>

          <Text style={[typography.footnote, {
            color: colors.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            fontWeight: '600',
            paddingHorizontal: spacing.lg + 4,
            paddingTop: spacing.lg,
            paddingBottom: spacing.sm
          }]}>
            Guardians on the reconstruction topic
          </Text>

          <Card padded={false} style={{ overflow: 'hidden' }}>
            <View style={[styles.peerRow]}>
              <AppIcon icon="shield" tint={colors.iconTint.guardian} size={36} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.body, { color: colors.text }]}>You · Guardian #{(guardian.shardIndex || 0) + 1}</Text>
                <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                  Shard already in hand
                </Text>
              </View>
              <StatusPill tone="online" label="Held" showDot={false} />
            </View>
            {peers.map((p, i) => (
              <View
                key={p.guardianIndex}
                style={[
                  styles.peerRow,
                  styles.peerDivider
                ]}
              >
                <AppIcon icon="shield" tint={p.hasShard ? colors.iconTint.guardian : colors.textTertiary} size={36} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[typography.body, { color: colors.text }]}>Guardian #{p.guardianIndex + 1}</Text>
                  <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                    {p.hasShard ? 'Shard exchanged' : 'Connecting…'}
                  </Text>
                </View>
                <StatusPill
                  tone={p.hasShard ? 'online' : 'pending'}
                  label={p.hasShard ? 'Received' : 'Pending'}
                  showDot={!p.hasShard}
                />
              </View>
            ))}
          </Card>

          {phase === 'quorum' ? (
            <Card style={{ marginTop: spacing.lg, backgroundColor: colors.successMuted }}>
              <Text style={[typography.headline, { color: colors.success }]}>Quorum reached</Text>
              <Text style={[typography.subhead, { color: colors.text, marginTop: 4 }]}>
                Combining shards into the Estate Key…
              </Text>
            </Card>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  body: { paddingHorizontal: spacing.lg },
  progress: {
    width: '100%',
    height: 8,
    backgroundColor: colors.separator,
    borderRadius: 4,
    marginTop: spacing.lg,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4
  },
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  peerDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator
  },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
})
