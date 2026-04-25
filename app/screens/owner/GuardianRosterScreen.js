import React from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, GroupedList, GroupedRow } from '../../components/Card'
import { AppIcon } from '../../components/AppIcon'
import { StatusPill } from '../../components/StatusPill'
import { ScreenHeader, SectionHeader } from '../../components/Header'
import { GuardianGraph } from '../../components/GuardianGraph'
import { colors, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'
import { clock, formatRelative } from '../../services/clock'

export default function GuardianRosterScreen ({ navigation }) {
  const { state } = useStore()
  const guardians = state.owner?.guardians || []
  const { width } = useWindowDimensions()
  const graphWidth = width - spacing.lg * 2

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={{ color: colors.accent, fontSize: 17 }}>‹ Back</Text>
          </Pressable>
        </View>
        <ScreenHeader
          eyebrow="Roster"
          title="Your Guardians"
          subtitle={`Threshold ${state.owner?.M}-of-${state.owner?.N}`}
        />

        <View style={styles.body}>
          <Card style={styles.graphCard}>
            <GuardianGraph
              guardians={guardians}
              M={state.owner?.M || 2}
              width={graphWidth}
              height={220}
            />
          </Card>

          <SectionHeader title="Status" />
          <GroupedList>
            {guardians.map((g, i) => {
              const isLive = (clock.now() - (g.lastSeenAt || 0)) < 7 * 24 * 3600 * 1000
              return (
                <GroupedRow key={g.index} last={i === guardians.length - 1}>
                  <AppIcon
                    icon="shield"
                    tint={isLive ? colors.iconTint.guardian : colors.textTertiary}
                    size={40}
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

          <Card style={{ marginTop: spacing.lg, backgroundColor: colors.warningMuted }}>
            <Text style={[typography.footnote, { color: colors.warning, fontWeight: '600' }]}>
              If a Guardian goes silent
            </Text>
            <Text style={[typography.subhead, { color: colors.text, marginTop: 4 }]}>
              You'll get a banner here if any Guardian hasn't checked in for 30 days. Re-issue with a replacement to keep your safety margin intact.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  headerRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  body: { paddingHorizontal: spacing.lg },
  graphCard: { marginBottom: spacing.lg, padding: spacing.md, alignItems: 'center' }
})
