import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, GroupedList, GroupedRow } from '../../components/Card'
import { AppIcon } from '../../components/AppIcon'
import { Button } from '../../components/Button'
import { ScreenHeader, SectionHeader } from '../../components/Header'
import { colors, radii, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'

// In a real run this is populated from the decrypted Hyperdrive (or inline
// ciphertext). For the demo we surface the items the Owner originally entered
// — both apps live in the same store on the demo laptop.
const DEMO_ITEMS = [
  { id: 'will',   kind: 'note', label: 'Last Will & Testament',
    body: 'To my dear Guardians,\n\nThe codes to the safe deposit box live in the second-to-last drawer of the desk in the study. Look behind the false back. Tell my mother I love her. — V.' },
  { id: 'pwd',    kind: 'note', label: 'Critical passwords',
    body: 'iCloud: example-keychain-recovery-phrase\nBank: see the printed note in the safety deposit box\n1Password emergency kit: in the green folder' },
  { id: 'wallet', kind: 'note', label: 'Crypto seed phrase',
    body: 'witch collapse practice feed shame open despair creek road again ice least' }
]

export default function EstateUnlockedScreen ({ navigation }) {
  const { state, dispatch } = useStore()
  const items = state.owner?.items?.length ? state.owner.items : DEMO_ITEMS
  const [activeId, setActiveId] = React.useState(items[0]?.id)
  const active = items.find((i) => i.id === activeId)

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Vault opened"
          title="Estate"
          subtitle="The Estate Key was reconstructed from the threshold shards. Contents are now decrypted on this device."
        />

        <View style={styles.banner}>
          <Card style={{ backgroundColor: colors.successMuted }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppIcon glyph="🔓" tint={colors.success} size={44} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.headline, { color: colors.success }]}>
                  {state.guardian?.M || 2}-of-{state.guardian?.N || 3} threshold satisfied
                </Text>
                <Text style={[typography.footnote, { color: colors.text, marginTop: 2 }]}>
                  Estate Key reconstructed locally · Vault decrypted
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.body}>
          <SectionHeader title="Contents" />
          <GroupedList>
            {items.map((it, i) => (
              <GroupedRow key={it.id} last={i === items.length - 1} onPress={() => setActiveId(it.id)}>
                <AppIcon
                  glyph={it.kind === 'file' ? '📄' : '📝'}
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
                <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.md }]}>
                  {active.mime || 'binary'} — file payload available locally.
                </Text>
              )}
            </Card>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Button title="Done" onPress={() => {
            dispatch({ type: 'reset' })
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
  banner: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  body: { paddingHorizontal: spacing.lg },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
})
