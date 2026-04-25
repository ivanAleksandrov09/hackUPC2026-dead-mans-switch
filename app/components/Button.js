import React from 'react'
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native'
import { colors, radii, spacing, typography } from '../theme'

export function Button ({
  title,
  onPress,
  variant = 'primary',   // 'primary' | 'secondary' | 'ghost' | 'destructive'
  size = 'md',           // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  style
}) {
  const containerVariant = variantStyles[variant] || variantStyles.primary
  const textVariant = textVariantStyles[variant] || textVariantStyles.primary
  const sizeStyle = sizeStyles[size] || sizeStyles.md
  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        containerVariant,
        fullWidth && { alignSelf: 'stretch' },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style
      ]}
    >
      {loading
        ? <ActivityIndicator color={textVariant.color} />
        : (
          <View style={styles.row}>
            {icon ? <View style={{ marginRight: spacing.sm }}>{icon}</View> : null}
            <Text style={[typography.headline, textVariant]}>{title}</Text>
          </View>
        )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }]
  },
  disabled: {
    opacity: 0.4
  }
})

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: 8,  paddingHorizontal: 14, minHeight: 36 },
  md: { paddingVertical: 12, paddingHorizontal: 18, minHeight: 48 },
  lg: { paddingVertical: 16, paddingHorizontal: 22, minHeight: 56 }
})

const variantStyles = StyleSheet.create({
  primary:     { backgroundColor: colors.accent },
  secondary:   { backgroundColor: colors.accentMuted },
  ghost:       { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.danger }
})

const textVariantStyles = StyleSheet.create({
  primary:     { color: colors.textOnAccent },
  secondary:   { color: colors.accent },
  ghost:       { color: colors.accent },
  destructive: { color: colors.textOnAccent }
})
