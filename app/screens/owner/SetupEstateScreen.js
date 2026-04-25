import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'

import { Field, TextField } from '../../components/Field'
import { Card, GroupedList, GroupedRow } from '../../components/Card'
import { Button } from '../../components/Button'
import { AppIcon } from '../../components/AppIcon'
import { StepIndicator } from '../../components/StepIndicator'
import { ScreenHeader } from '../../components/Header'
import { colors, radii, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'

export default function SetupEstateScreen ({ navigation }) {
  const { state, dispatch } = useStore()
  const [items, setItems] = useState(state.owner?.items || [
    { id: 'will', kind: 'note', label: 'Last Will & Testament', body: '' }
  ])
  const [activeId, setActiveId] = useState(items[0]?.id)
  const active = items.find((i) => i.id === activeId)

  const addNote = () => {
    const id = 'note-' + Date.now()
    const next = [...items, { id, kind: 'note', label: 'New note', body: '' }]
    setItems(next)
    setActiveId(id)
  }

  const addFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true })
      if (res.canceled) return
      const file = res.assets?.[0]
      if (!file) return
      const id = 'file-' + Date.now()
      setItems([...items, { id, kind: 'file', label: file.name, uri: file.uri, size: file.size, mime: file.mimeType }])
      setActiveId(id)
    } catch {}
  }

  const removeActive = () => {
    if (!active) return
    const next = items.filter((i) => i.id !== active.id)
    setItems(next)
    setActiveId(next[0]?.id)
  }

  const updateActive = (patch) => {
    setItems(items.map((i) => i.id === active.id ? { ...i, ...patch } : i))
  }

  const next = () => {
    dispatch({ type: 'setOwner', patch: { items, estateLabel: 'My Vault' } })
    navigation.navigate('SetupGuardians')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          eyebrow="Step 2 of 4"
          title="What's in your Vault?"
          subtitle="Encrypted on this device before anything leaves it."
        />

        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <StepIndicator total={5} current={2} />
        </View>

        <View style={styles.body}>
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
                    {it.kind === 'file' ? formatBytes(it.size) : (it.body ? `${it.body.length} chars` : 'empty')}
                  </Text>
                </View>
                {activeId === it.id ? <Text style={{ color: colors.accent, fontSize: 22 }}>•</Text> : null}
              </GroupedRow>
            ))}
          </GroupedList>

          <View style={styles.actions}>
            <Pressable onPress={addNote} style={styles.miniBtn}>
              <Text style={[typography.subhead, { color: colors.accent }]}>+ Add note</Text>
            </Pressable>
            <Pressable onPress={addFile} style={styles.miniBtn}>
              <Text style={[typography.subhead, { color: colors.accent }]}>+ Add file</Text>
            </Pressable>
          </View>

          {active && active.kind === 'note' ? (
            <Card style={{ marginTop: spacing.lg }}>
              <Field label="Title">
                <TextField value={active.label} onChangeText={(v) => updateActive({ label: v })} />
              </Field>
              <Field label="Contents" hint="Plain text. Markdown is fine.">
                <TextField
                  value={active.body}
                  onChangeText={(v) => updateActive({ body: v })}
                  placeholder="Write here…"
                  multiline
                />
              </Field>
              {items.length > 1 ? (
                <Button title="Remove this entry" variant="ghost" onPress={removeActive} />
              ) : null}
            </Card>
          ) : null}

          {active && active.kind === 'file' ? (
            <Card style={{ marginTop: spacing.lg }}>
              <Text style={[typography.headline, { color: colors.text }]}>{active.label}</Text>
              <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 4 }]}>
                {active.mime || 'binary'} · {formatBytes(active.size)}
              </Text>
              <Button title="Remove from Vault" variant="ghost" onPress={removeActive} style={{ marginTop: spacing.md }} />
            </Card>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Button title={`Continue with ${items.length} item${items.length === 1 ? '' : 's'}`} onPress={next} />
          <Button title="Back" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function formatBytes (bytes) {
  if (!bytes && bytes !== 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  body: { paddingHorizontal: spacing.lg },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.md
  },
  miniBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
})
