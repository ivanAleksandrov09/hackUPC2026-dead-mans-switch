import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card } from '../../components/Card'
import { AppIcon } from '../../components/AppIcon'
import { Button } from '../../components/Button'
import { StepIndicator } from '../../components/StepIndicator'
import { ScreenHeader } from '../../components/Header'
import { colors, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'

const STEPS = [
  { glyph: '🔑', tint: colors.accent,                  title: 'Generate an Estate Key',   body: 'A 32-byte secret encrypts everything. Only you ever hold it whole.' },
  { glyph: '📁', tint: colors.iconTint.estate,         title: 'Add your estate',          body: 'Drag in passwords, files, or notes. They never leave your device unencrypted.' },
  { glyph: '🛡️', tint: colors.iconTint.guardian,       title: 'Choose your Guardians',    body: '2-of-3, 3-of-5 — whatever feels right. Each holds a sealed shard, useless alone.' },
  { glyph: '💗', tint: colors.iconTint.heartbeat,      title: 'Stay alive',               body: 'Open the app once in a while. If you go silent past your deadline, your Guardians can unlock your estate together.' }
]

export default function SetupWelcomeScreen ({ navigation }) {
  const { dispatch } = useStore()

  const goBack = () => {
    dispatch({ type: 'setMode', mode: null })
    if (navigation.canGoBack()) navigation.goBack()
    else navigation.navigate('ModeSelect')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Set up Vault"
          title="How it works"
          subtitle="Four steps. The whole thing takes under five minutes."
        />

        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <StepIndicator total={5} current={0} />
        </View>

        <View style={styles.stepList}>
          {STEPS.map((s, i) => (
            <Card key={i} style={styles.stepCard}>
              <View style={styles.stepRow}>
                <AppIcon glyph={s.glyph} tint={s.tint} size={48} />
                <View style={styles.stepText}>
                  <Text style={[typography.headline, { color: colors.text }]}>{s.title}</Text>
                  <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: 2 }]}>
                    {s.body}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.footer}>
          <Button title="Begin setup" onPress={() => navigation.navigate('SetupPassphrase')} />
          <Button title="Back" variant="ghost" onPress={goBack} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  stepList: {
    paddingHorizontal: spacing.lg
  },
  stepCard: {
    marginBottom: spacing.sm
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stepText: {
    flex: 1,
    marginLeft: spacing.lg
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl
  }
})
