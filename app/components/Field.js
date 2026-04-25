import React from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { colors, radii, spacing, typography } from '../theme'

export function Field ({ label, hint, error, children }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? (
        <Text style={[typography.footnote, {
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          fontWeight: '600',
          marginBottom: spacing.xs
        }]}>
          {label}
        </Text>
      ) : null}
      {children}
      {hint && !error ? (
        <Text style={[typography.footnote, { color: colors.textTertiary, marginTop: spacing.xs }]}>{hint}</Text>
      ) : null}
      {error ? (
        <Text style={[typography.footnote, { color: colors.danger, marginTop: spacing.xs }]}>{error}</Text>
      ) : null}
    </View>
  )
}

export function TextField ({ value, onChangeText, placeholder, secure, autoCapitalize = 'none', multiline, style }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      secureTextEntry={secure}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      multiline={multiline}
      style={[styles.input, multiline && styles.multiline, style]}
    />
  )
}

export function Stepper ({ value, min = 1, max = 9, onChange, label }) {
  const dec = () => onChange?.(Math.max(min, value - 1))
  const inc = () => onChange?.(Math.min(max, value + 1))
  return (
    <View style={styles.stepper}>
      {label ? <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{label}</Text> : null}
      <View style={styles.stepperControls}>
        <Text onPress={dec} style={[styles.stepperBtn, value <= min && styles.stepperDisabled]}>−</Text>
        <Text style={[typography.headline, styles.stepperValue]}>{value}</Text>
        <Text onPress={inc} style={[styles.stepperBtn, value >= max && styles.stepperDisabled]}>+</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 17,
    color: colors.text,
    minHeight: 48
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top'
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 48
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 4
  },
  stepperBtn: {
    width: 32,
    height: 32,
    textAlign: 'center',
    lineHeight: 32,
    fontSize: 22,
    color: colors.accent,
    fontWeight: '600'
  },
  stepperDisabled: {
    color: colors.textTertiary
  },
  stepperValue: {
    minWidth: 36,
    textAlign: 'center',
    color: colors.text
  }
})
