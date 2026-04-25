import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, radii, typography } from '../theme'

// Square iOS-style app icon. Uses an emoji glyph as a stand-in for an SVG icon
// — keeps the demo zero-asset while still feeling native. Swap the glyph for a
// react-native-svg icon when assets land.
export function AppIcon ({ glyph, tint = colors.accent, size = 56 }) {
  return (
    <View style={[
      styles.icon,
      {
        width: size,
        height: size,
        borderRadius: size * 0.235, // iOS continuous corner ratio
        backgroundColor: tint
      }
    ]}>
      <Text style={[
        typography.title2,
        { color: colors.textOnAccent, fontSize: size * 0.5, lineHeight: size }
      ]}>
        {glyph}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2
  }
})
