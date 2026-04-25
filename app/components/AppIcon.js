import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { colors, radii } from '../theme'

export function AppIcon ({ icon = 'shield', tint = colors.accent, size = 56, iconColor = '#fff' }) {
  return (
    <View style={[
      styles.icon,
      {
        width: size,
        height: size,
        borderRadius: size * 0.235,
        backgroundColor: tint
      }
    ]}>
      <Feather name={icon} size={size * 0.46} color={iconColor} />
    </View>
  )
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2
  }
})
