import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, typography } from '../theme'
import { isConnected } from '../services/protocol'

export function BridgeBanner () {
  const [connected, setConnected] = useState(isConnected())

  useEffect(() => {
    const id = setInterval(() => setConnected(isConnected()), 2000)
    return () => clearInterval(id)
  }, [])

  if (connected) return null

  return (
    <View style={styles.banner}>
      <Text style={[typography.footnote, { color: '#fff', fontWeight: '600' }]}>
        ⚡ Bridge offline — run <Text style={styles.mono}>npm run bridge</Text> on the laptop
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center'
  },
  mono: {
    fontFamily: 'monospace',
    fontWeight: '700'
  }
})
