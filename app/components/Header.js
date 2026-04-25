import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, typography } from '../theme'

export function ScreenHeader ({ eyebrow, title, subtitle, right }) {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Text style={[typography.footnote, { color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[typography.largeTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  )
}

export function SectionHeader ({ title, action }) {
  return (
    <View style={styles.section}>
      <Text style={[typography.footnote, {
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        fontWeight: '600'
      }]}>
        {title}
      </Text>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm
  }
})
