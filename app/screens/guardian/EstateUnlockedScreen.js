import React from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, GroupedList, GroupedRow } from '../../components/Card'
import { AppIcon } from '../../components/AppIcon'
import { Button } from '../../components/Button'
import { ScreenHeader, SectionHeader } from '../../components/Header'
import { colors, radii, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'
import * as protocol from '../../services/protocol'

export default function EstateUnlockedScreen ({ navigation }) {
  const { state, dispatch } = useStore()
  const [items, setItems] = React.useState(null)  // null = decrypting
  const [decryptError, setDecryptError] = React.useState(null)

  const ekHex = state.guardian?.ekHex
  React.useEffect(() => {
    const { encryptedItems } = state.guardian || {}
    if (!ekHex || !encryptedItems?.length) {
      if (ekHex !== undefined) setItems([])  // key present but no items
      return
    }
    setItems(null)  // show spinner while decrypting
    Promise.all(encryptedItems.map(async (item) => {
      if (item.ctHex) {
        try {
          const body = await protocol.decryptEstate(item.ctHex, ekHex)
          return { ...item, body, ctHex: undefined }
        } catch {
          return { ...item, body: '(decryption failed)', ctHex: undefined }
        }
      }
      return item
    })).then(setItems).catch((err) => setDecryptError(err.message))
  }, [ekHex])

  const [activeId, setActiveId] = React.useState(null)
  React.useEffect(() => { if (items?.length) setActiveId(items[0].id) }, [items])
  const active = items?.find((i) => i.id === activeId)

  if (items === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.lg }]}>
            Decrypting estate…
          </Text>
        </View>
      </SafeAreaView>
    )
  }

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
              <AppIcon icon="unlock" tint={colors.success} size={44} />
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
          {decryptError ? (
            <Text style={[typography.footnote, { color: colors.danger, padding: spacing.md }]}>
              Decryption error: {decryptError}
            </Text>
          ) : null}
          <GroupedList>
            {(items || []).map((it, i) => (
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
