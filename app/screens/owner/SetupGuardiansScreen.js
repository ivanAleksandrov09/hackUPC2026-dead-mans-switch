import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Field, TextField, Stepper } from '../../components/Field'
import { StepIndicator } from '../../components/StepIndicator'
import { ScreenHeader, SectionHeader } from '../../components/Header'
import { colors, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'

const DEADLINE_PRESETS = [
  { id: '30d',  label: '30 days',  seconds: 30 * 24 * 3600 },
  { id: '90d',  label: '90 days',  seconds: 90 * 24 * 3600 },
  { id: '180d', label: '6 months', seconds: 180 * 24 * 3600 },
  { id: '365d', label: '1 year',   seconds: 365 * 24 * 3600 }
]

export default function SetupGuardiansScreen ({ navigation }) {
  const { state, dispatch } = useStore()
  const [N, setN] = useState(state.owner?.N || 3)
  const [M, setM] = useState(Math.min(state.owner?.M || 2, N))
  const [deadlineId, setDeadlineId] = useState(state.owner?.deadlinePresetId || '180d')
  const [rosterError, setRosterError] = useState(null)
  const [labels, setLabels] = useState(
    state.owner?.guardians?.map((g) => g.label) ||
    Array(N).fill('')
  )

  const setNSafe = (v) => { setN(v); if (M > v) setM(v) }
  const setMSafe = (v) => { setM(Math.min(v, N)) }
  const setLabelAt = (i, v) => {
    setRosterError(null)
    setLabels((prev) => { const next = [...prev]; next[i] = v; return next })
  }

  // Keep labels array length in sync with N.
  React.useEffect(() => {
    setLabels((prev) => {
      if (prev.length === N) return prev
      if (prev.length < N) return [...prev, ...Array(N - prev.length).fill('')]
      return prev.slice(0, N)
    })
  }, [N])

  const next = () => {
    const unnamed = labels.findIndex((l) => !l.trim())
    if (unnamed !== -1) {
      setRosterError(`Enter a name for Guardian ${unnamed + 1}.`)
      return
    }
    setRosterError(null)
    const preset = DEADLINE_PRESETS.find((p) => p.id === deadlineId) || DEADLINE_PRESETS[2]
    const guardians = labels.map((label, index) => ({
      index,
      label: label?.trim() || `Guardian ${index + 1}`,
      publicKeyHex: null,
      lastSeenAt: null,
      handoffStatus: 'pending'      // pending | live | accepted
    }))
    dispatch({
      type: 'setOwner',
      patch: {
        M, N,
        deadlineSeconds: preset.seconds,
        deadlinePresetId: preset.id,
        guardians
      }
    })
    navigation.navigate('SetupHandoff')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          eyebrow="Step 3 of 4"
          title="Choose your circle"
          subtitle="The threshold (M-of-N) decides how many of them must come together to release your Vault."
        />

        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <StepIndicator total={5} current={3} />
        </View>

        <View style={styles.body}>
          <SectionHeader title="Threshold" />
          <Card>
            <Stepper label="Total Guardians (N)" value={N} min={2} max={7} onChange={setNSafe} />
            <View style={{ height: spacing.sm }} />
            <Stepper label="Required to unlock (M)" value={M} min={2} max={N} onChange={setMSafe} />
            <Text style={[typography.footnote, { color: colors.textTertiary, marginTop: spacing.md }]}>
              {M}-of-{N} chosen. Any {N - M} Guardian{N - M === 1 ? '' : 's'} may lose their shard without consequence.
            </Text>
          </Card>

          <SectionHeader title="Inactivity deadline" />
          <Card padded={false}>
            {DEADLINE_PRESETS.map((p, i) => (
              <View key={p.id}>
                <View style={[styles.optionRow, i !== DEADLINE_PRESETS.length - 1 && styles.optionDivider]}>
                  <Text
                    onPress={() => setDeadlineId(p.id)}
                    style={[typography.body, { flex: 1, color: colors.text, paddingVertical: spacing.md, paddingHorizontal: spacing.lg }]}
                  >
                    {p.label}
                  </Text>
                  {deadlineId === p.id ? (
                    <Text style={{ color: colors.accent, fontSize: 18, paddingHorizontal: spacing.lg, fontWeight: '600' }}>✓</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
          <Text style={[typography.footnote, { color: colors.textTertiary, paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
            Guardians enforce this locally. Reconstruction requires {M}-of-{N} to independently observe silence past the deadline.
          </Text>

          <SectionHeader title="Roster" action={
            <Text style={[typography.footnote, { color: colors.textTertiary }]}>
              Labels are local to you
            </Text>
          } />
          <Card>
            {labels.map((l, i) => (
              <Field key={i} label={`Guardian ${i + 1}`}>
                <TextField
                  value={l}
                  onChangeText={(v) => setLabelAt(i, v)}
                  placeholder="Enter their name"
                  autoCapitalize="words"
                />
              </Field>
            ))}
          </Card>
          {rosterError ? (
            <Text style={[typography.footnote, { color: colors.danger, marginTop: spacing.sm, paddingHorizontal: 4 }]}>
              {rosterError}
            </Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Button title="Generate invites" onPress={next} />
          <Button title="Back" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  body: { paddingHorizontal: spacing.lg },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  optionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator
  },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
})
