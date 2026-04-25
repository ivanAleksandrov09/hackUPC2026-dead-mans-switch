import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, radii, spacing, typography } from '../theme'

const TONE = {
  active:        { bg: colors.successMuted, fg: colors.success,  dot: colors.success },
  online:        { bg: colors.successMuted, fg: colors.success,  dot: colors.success },
  pending:       { bg: colors.pendingMuted, fg: colors.textTertiary, dot: colors.textTertiary },
  warning:       { bg: colors.warningMuted, fg: colors.warning,  dot: colors.warning },
  overdue:       { bg: colors.dangerMuted,  fg: colors.danger,   dot: colors.danger },
  reconstructing:{ bg: colors.warningMuted, fg: colors.warning,  dot: colors.warning },
  unlocked:      { bg: colors.accentMuted,  fg: colors.accent,   dot: colors.accent }
}

export function StatusPill ({ tone = 'active', label, showDot = true }) {
  const colorset = TONE[tone] || TONE.active
  return (
    <View style={[styles.pill, { backgroundColor: colorset.bg }]}>
      {showDot ? <View style={[styles.dot, { backgroundColor: colorset.dot }]} /> : null}
      <Text style={[typography.footnote, { color: colorset.fg, fontWeight: '600' }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: 'flex-start'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  }
})
