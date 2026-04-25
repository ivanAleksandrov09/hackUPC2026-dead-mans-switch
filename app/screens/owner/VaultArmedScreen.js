import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Pressable, Dimensions, Easing } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'

import { AppIcon } from '../../components/AppIcon'
import { colors, spacing, typography, radii } from '../../theme'
import { useStore } from '../../services/store'

const { width: SW, height: SH } = Dimensions.get('window')

const CONFETTI_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF2D55', '#AF52DE', '#FFD60A', '#00C7BE'
]
const PARTICLE_COUNT = 60

function randomBetween (a, b) { return a + Math.random() * (b - a) }

function Particle ({ color, startX, delay }) {
  const y = useRef(new Animated.Value(-20)).current
  const x = useRef(new Animated.Value(0)).current
  const rotate = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const drift = randomBetween(-80, 80)
    const duration = randomBetween(1800, 3200)

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, { toValue: SH + 40, duration, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
        Animated.timing(x, { toValue: drift, duration, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: randomBetween(-3, 3), duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(duration * 0.7),
          Animated.timing(opacity, { toValue: 0, duration: duration * 0.3, useNativeDriver: true })
        ])
      ])
    ]).start()
  }, [])

  const spin = rotate.interpolate({ inputRange: [-3, 3], outputRange: ['-360deg', '360deg'] })
  const size = randomBetween(7, 13)

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: 0,
        width: size,
        height: size * (Math.random() > 0.5 ? 1 : 0.4),
        borderRadius: Math.random() > 0.5 ? size / 2 : 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY: y }, { translateX: x }, { rotate: spin }]
      }}
    />
  )
}

export default function VaultArmedScreen ({ navigation }) {
  const { state } = useStore()
  const owner = state.owner || {}
  const checkScale = useRef(new Animated.Value(0)).current
  const checkOpacity = useRef(new Animated.Value(0)).current
  const subtitleOpacity = useRef(new Animated.Value(0)).current
  const buttonOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})

    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, bounciness: 14, speed: 8 }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 200, useNativeDriver: true })
      ]),
      Animated.delay(400),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true })
    ]).start()
  }, [])

  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      startX: randomBetween(0, SW),
      delay: randomBetween(0, 1200)
    }))
  ).current

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {/* Confetti layer */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particles.map(p => (
          <Particle key={p.id} color={p.color} startX={p.startX} delay={p.delay} />
        ))}
      </View>

      <View style={styles.content}>
        {/* Checkmark */}
        <Animated.View style={[styles.checkWrap, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}>
          <Text style={styles.checkmark}>✓</Text>
        </Animated.View>

        <Animated.View style={{ opacity: subtitleOpacity, alignItems: 'center' }}>
          <Text style={[typography.largeTitle, { color: colors.text, marginTop: spacing.lg }]}>
            Vault armed.
          </Text>
          <Text style={[typography.subhead, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.xl }]}>
            Your estate is sealed and your Guardians are holding their shards.
          </Text>

          {/* M-of-N shields */}
          <View style={styles.shieldRow}>
            {Array.from({ length: owner.N || 0 }).map((_, i) => (
              <View key={i} style={{ opacity: i < (owner.M || 0) ? 1 : 0.3 }}>
                <AppIcon icon="shield" tint={i < (owner.M || 0) ? colors.iconTint.guardian : colors.textTertiary} size={44} />
              </View>
            ))}
          </View>
          <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            {owner.M}-of-{owner.N} needed to unlock
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: buttonOpacity, marginTop: spacing.xxl, width: '100%', paddingHorizontal: spacing.lg }}>
          <Pressable
            style={styles.button}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'OwnerDashboard' }] })}
          >
            <Text style={[typography.headline, { color: colors.textOnAccent }]}>Go to my Vault</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xxl
  },
  checkWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.success,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8
  },
  checkmark: {
    fontSize: 52,
    color: '#fff',
    lineHeight: 60
  },
  shieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center'
  }
})
