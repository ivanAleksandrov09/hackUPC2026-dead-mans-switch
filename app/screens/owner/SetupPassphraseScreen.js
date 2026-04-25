import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Field, TextField } from '../../components/Field'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { StepIndicator } from '../../components/StepIndicator'
import { ScreenHeader } from '../../components/Header'
import { colors, spacing, typography } from '../../theme'
import { useStore } from '../../services/store'

export default function SetupPassphraseScreen ({ navigation }) {
  const { dispatch } = useStore()
  const [pp, setPp] = useState('')
  const [pp2, setPp2] = useState('')
  const [error, setError] = useState(null)

  const next = () => {
    if (pp.length < 8) return setError('Use at least 8 characters.')
    if (pp !== pp2) return setError('Passphrases do not match.')
    setError(null)
    // Real impl: derive identity via Argon2id (core/identity.js).
    dispatch({
      type: 'setIdentity',
      identity: { publicKeyHex: 'pubkey-placeholder-' + Date.now().toString(36) }
    })
    navigation.navigate('SetupEstate')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          eyebrow="Step 1 of 4"
          title="Choose a passphrase"
          subtitle="It locks your identity on this device. Lose it and you'll need to set up again from scratch."
        />

        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <StepIndicator total={5} current={1} />
        </View>

        <View style={styles.body}>
          <Card>
            <Field label="Passphrase">
              <TextField value={pp} onChangeText={setPp} placeholder="At least 8 characters" secure />
            </Field>
            <Field label="Confirm passphrase" error={error}>
              <TextField value={pp2} onChangeText={setPp2} placeholder="Type it again" secure />
            </Field>
          </Card>

          <Card style={{ marginTop: spacing.md, backgroundColor: colors.warningMuted }}>
            <Text style={[typography.footnote, { color: colors.warning, fontWeight: '600' }]}>
              No recovery
            </Text>
            <Text style={[typography.subhead, { color: colors.text, marginTop: 4 }]}>
              We can't reset this. There's no server. If you forget it, your Vault stays sealed.
            </Text>
          </Card>
        </View>

        <View style={styles.footer}>
          <Button title="Continue" onPress={next} />
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
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }
})
