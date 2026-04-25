import React from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { colors, typography } from '../theme'

// Wrap Circle so it accepts Animated color values
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export function CountdownRing ({
  progress = 1,
  size = 220,
  strokeWidth = 14,
  primary,
  caption,
  tint // may be an Animated.Value interpolation or a plain string
}) {
  const safeProgress = Math.max(0, Math.min(1, progress))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - safeProgress)

  // Derive a static fallback color when tint is not animated
  const staticColor = safeProgress > 0.4 ? colors.accent
    : safeProgress > 0.15 ? colors.warning
    : colors.danger

  // If caller passes an animated tint use AnimatedCircle, otherwise plain Circle
  const isAnimated = tint && typeof tint === 'object' && tint.__isNative !== undefined
  const ringColor = tint ?? staticColor

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.separator} strokeWidth={strokeWidth} fill="none"
        />
        {isAnimated ? (
          <AnimatedCircle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth} fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : (
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth} fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
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
