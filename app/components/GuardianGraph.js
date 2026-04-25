import React, { useMemo } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Line, Defs, RadialGradient, Stop, Text as SvgText } from 'react-native-svg'
import { colors } from '../theme'

const VAULT_R = 28
const NODE_R  = 18

function guardianPositions (count, cx, cy, rx, ry) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) }
  })
}

export function GuardianGraph ({ guardians = [], M = 2, width = 320, height = 240 }) {
  const cx = width / 2
  const cy = height / 2 - 10
  const rx = (width / 2) * 0.72
  const ry = (height / 2) * 0.68

  const positions = useMemo(
    () => guardianPositions(guardians.length, cx, cy, rx, ry),
    [guardians.length, cx, cy, rx, ry]
  )

  const acceptedCount = guardians.filter(g => g.handoffStatus === 'accepted').length
  const thresholdMet  = acceptedCount >= M
  const vaultColor    = '#C9A84C'

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="vaultGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor={vaultColor} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={vaultColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Halo behind vault */}
        <Circle cx={cx} cy={cy} r={62} fill="url(#vaultGlow)" />

        {/* Edges */}
        {positions.map((pos, i) => {
          const accepted   = guardians[i]?.handoffStatus === 'accepted'
          const edgeColor  = accepted ? colors.success : colors.accent
          return (
            <Line
              key={i}
              x1={cx} y1={cy} x2={pos.x} y2={pos.y}
              stroke={edgeColor}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              opacity={0.45}
            />
          )
        })}

        {/* Guardian nodes */}
        {positions.map((pos, i) => {
          const g         = guardians[i]
          const accepted  = g?.handoffStatus === 'accepted'
          const nodeColor = accepted ? colors.success : colors.accent
          return (
            <React.Fragment key={i}>
              <Circle cx={pos.x} cy={pos.y} r={NODE_R + 8} fill={nodeColor} opacity={0.12} />
              <Circle cx={pos.x} cy={pos.y} r={NODE_R}     fill={nodeColor} />
              <Circle cx={pos.x} cy={pos.y} r={NODE_R}     fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
              <SvgText
                x={pos.x} y={pos.y + NODE_R + 13}
                textAnchor="middle"
                fontSize={10}
                fontFamily="Avenir-Heavy"
                fill={colors.textSecondary}
                letterSpacing={0.3}
              >
                {g?.label || `G${i + 1}`}
              </SvgText>
            </React.Fragment>
          )
        })}

        {/* Vault node */}
        <Circle cx={cx} cy={cy} r={VAULT_R} fill={vaultColor} />
        <Circle cx={cx} cy={cy} r={VAULT_R} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
        <SvgText
          x={cx} y={cy + 4}
          textAnchor="middle"
          fontSize={11}
          fontFamily="Avenir-Heavy"
          fill="#fff"
          letterSpacing={0.5}
        >
          VAULT
        </SvgText>

      </Svg>
    </View>
  )
}
