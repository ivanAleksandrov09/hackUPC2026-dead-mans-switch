import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { colors, typography } from '../theme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export function CountdownRing ({
  progress = 1,
  size = 220,
  strokeWidth = 14,
  primary,
  caption,
  tint,
  urgent = false
}) {
  const pulseOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (urgent) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0.2, duration: 1800, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 1, duration: 1800, useNativeDriver: true })
        ])
      )
      loop.start()
      return () => loop.stop()
    } else {
      pulseOpacity.setValue(1)
    }
  }, [urgent])

  const safeProgress = Math.max(0, Math.min(1, progress))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - safeProgress)

  const staticColor = safeProgress > 0.4 ? colors.accent
    : safeProgress > 0.15 ? colors.warning
    : colors.danger

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
          {urgent ? (
            <Animated.View style={{ alignItems: 'center', opacity: pulseOpacity }}>
              <Text style={[typography.title2, { color: colors.danger, fontWeight: '700', textAlign: 'center' }]}>
                Guardians can{'\n'}now unlock.
              </Text>
            </Animated.View>
          ) : (
            <>
              <Text style={[typography.largeTitle, { color: colors.text }]}>{primary}</Text>
              {caption ? (
                <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                  {caption}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  }
})
