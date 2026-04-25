import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors, spacing } from '../theme'

export function StepIndicator ({ total, current }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current && styles.dotActive,
            i < current && styles.dotDone
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.separator,
    marginHorizontal: 3
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent
  },
  dotDone: {
    backgroundColor: colors.accent
  }
})
