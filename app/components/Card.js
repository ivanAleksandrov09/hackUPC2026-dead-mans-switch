import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { colors, radii, spacing, shadows } from '../theme'

export function Card ({ children, style, padded = true, elevated = false }) {
  return (
    <View style={[styles.card, padded && styles.padded, elevated ? shadows.raised : shadows.card, style]}>
      {children}
    </View>
  )
}

export function GroupedList ({ children, style }) {
  return <View style={[styles.list, style]}>{children}</View>
}

export function GroupedRow ({ children, last, onPress, style }) {
  const Container = onPress ? Pressable : View
  return (
    <Container onPress={onPress} style={[styles.row, !last && styles.rowDivider, style]}>
      {children}
    </Container>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  padded: {
    padding: spacing.lg + 4
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden'
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center'
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator
  }
})
