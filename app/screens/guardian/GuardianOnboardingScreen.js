import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card } from '../../components/Card'
import { AppIcon } from '../../components/AppIcon'
import { Button } from '../../components/Button'
import { Field, TextField } from '../../components/Field'
import { ScreenHeader } from '../../components/Header'
import { colors, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'

export default function GuardianOnboardingScreen ({ navigation }) {
  const { dispatch } = useStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)

  const looksValid = (s) => {
    const parts = s.trim().toLowerCase().split('-').filter(Boolean)
    return parts.length === 6
  }

  const accept = () => {
    if (!looksValid(code)) {
      setError('Invite codes are six words separated by dashes.')
      return
    }
    dispatch({
      type: 'setGuardian',
      patch: {
        ownerLabel: 'Pending…',
        ownerPubKey: 'mock-owner-pubkey',
        inviteCode: code.trim().toLowerCase()
      }
    })
    navigation.navigate('GuardianAccepting', { code: code.trim().toLowerCase() })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          eyebrow="Become a Guardian"
          title="Paste the invite"
          subtitle="The person who invited you sent six words. Together they'll connect you to their Vault."
        />

        <View style={styles.body}>
          <View style={styles.illustration}>
            <AppIcon glyph="🛡️" tint={colors.iconTint.guardian} size={84} />
          </View>

          <Card>
            <Field label="Invite code" hint="Example: amber-orchid-river-thunder-pebble-quartz" error={error}>
              <TextField
                value={code}
                onChangeText={(v) => { setCode(v); setError(null) }}
                placeholder="word-word-word-word-word-word"
                autoCapitalize="none"
              />
            </Field>
          </Card>

          <Card style={{ marginTop: spacing.md, backgroundColor: colors.accentMuted }}>
            <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>What you'll be holding</Text>
            <Text style={[typography.subhead, { color: colors.text, marginTop: 4 }]}>
              A sealed shard, useless on its own. The Vault opens only when at least M Guardians come together — typically because the owner has gone silent past the deadline they chose.
            </Text>
          </Card>
        </View>

        <View style={styles.footer}>
          <Button title="Accept invitation" onPress={accept} />
          <Button title="Back" variant="ghost" onPress={() => {
            dispatch({ type: 'setMode', mode: null })
            if (navigation.canGoBack()) navigation.goBack()
            else navigation.navigate('ModeSelect')
          }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  body: { paddingHorizontal: spacing.lg },
  illustration: {
    alignItems: 'center',
    paddingVertical: spacing.xl
  },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
})
