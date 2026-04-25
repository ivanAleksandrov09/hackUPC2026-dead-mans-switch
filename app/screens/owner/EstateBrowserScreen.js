import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, GroupedList, GroupedRow } from '../../components/Card'
import { AppIcon } from '../../components/AppIcon'
import { Button } from '../../components/Button'
import { ScreenHeader } from '../../components/Header'
import { colors, radii, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'

export default function EstateBrowserScreen ({ navigation }) {
  const { state } = useStore()
  const items = state.owner?.items || []
  const [activeId, setActiveId] = useState(items[0]?.id)
  const active = items.find((i) => i.id === activeId)

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={{ color: colors.accent, fontSize: 17 }}>‹ Back</Text>
          </Pressable>
        </View>
        <ScreenHeader
          eyebrow="Vault contents"
          title="Estate"
          subtitle="What your Guardians will see when the threshold is met."
        />

        <View style={styles.body}>
          <GroupedList>
            {items.map((it, i) => (
              <GroupedRow key={it.id} last={i === items.length - 1} onPress={() => setActiveId(it.id)}>
                <AppIcon
                  icon={it.kind === 'file' ? 'file' : 'file-text'}
                  tint={it.kind === 'file' ? colors.iconTint.estate : colors.warning}
                  size={36}
                />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[typography.body, { color: colors.text }]}>{it.label}</Text>
                  <Text style={[typography.footnote, { color: colors.textTertiary }]}>
                    {it.kind === 'file' ? 'File' : 'Note'}
                  </Text>
                </View>
                {activeId === it.id ? <Text style={{ color: colors.accent, fontSize: 22 }}>•</Text> : null}
              </GroupedRow>
            ))}
          </GroupedList>

          {active ? (
            <Card style={{ marginTop: spacing.lg }}>
              <Text style={[typography.headline, { color: colors.text }]}>{active.label}</Text>
              {active.kind === 'note' ? (
                <Text style={[typography.body, { color: colors.text, marginTop: spacing.md, lineHeight: 24 }]}>
                  {active.body || <Text style={{ color: colors.textTertiary }}>(empty)</Text>}
                </Text>
              ) : (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={[typography.subhead, { color: colors.textSecondary }]}>
                    {active.mime || 'binary'}
                  </Text>
                  <Text style={[typography.footnote, { color: colors.textTertiary, marginTop: 4 }]}>
                    Stored encrypted in the Hyperdrive snapshot. Guardians can replicate but not read it without M-of-N.
                  </Text>
                </View>
              )}
            </Card>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Button title="Edit Vault contents" variant="secondary" onPress={() => navigation.navigate('SetupEstate')} />
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
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
})
