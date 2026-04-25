import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { colors, typography } from '../theme'

// Concentric ring that empties as the deadline approaches. `progress` is 0..1
// where 1 means "fresh kick" and 0 means "deadline reached".
export function CountdownRing ({
  progress = 1,
  size = 220,
  strokeWidth = 14,
  primary,
  caption,
  tint = colors.accent
}) {
  const safeProgress = Math.max(0, Math.min(1, progress))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - safeProgress)
  const ringColor = safeProgress > 0.4 ? tint
    : safeProgress > 0.15 ? colors.warning
    : colors.danger

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.separator} strokeWidth={strokeWidth} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={ringColor} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>{primary}</Text>
          {caption ? (
            <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
              {caption}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
})
