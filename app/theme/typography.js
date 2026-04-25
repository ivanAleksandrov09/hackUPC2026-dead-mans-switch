import { Platform } from 'react-native'

const family = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System'
})
const familyMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System'
})
const familyMono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace'
})

export const typography = {
  largeTitle: { fontFamily: familyMedium, fontSize: 34, fontWeight: '700', letterSpacing: 0.37 },
  title1:     { fontFamily: familyMedium, fontSize: 28, fontWeight: '700', letterSpacing: 0.36 },
  title2:     { fontFamily: familyMedium, fontSize: 22, fontWeight: '700', letterSpacing: 0.35 },
  title3:     { fontFamily: familyMedium, fontSize: 20, fontWeight: '600', letterSpacing: 0.38 },
  headline:   { fontFamily: familyMedium, fontSize: 17, fontWeight: '600', letterSpacing: -0.41 },
  body:       { fontFamily: family,       fontSize: 17, fontWeight: '400', letterSpacing: -0.41 },
  callout:    { fontFamily: family,       fontSize: 16, fontWeight: '400', letterSpacing: -0.32 },
  subhead:    { fontFamily: family,       fontSize: 15, fontWeight: '400', letterSpacing: -0.24 },
  footnote:   { fontFamily: family,       fontSize: 13, fontWeight: '400', letterSpacing: -0.08 },
  caption1:   { fontFamily: family,       fontSize: 12, fontWeight: '400', letterSpacing: 0 },
  caption2:   { fontFamily: family,       fontSize: 11, fontWeight: '400', letterSpacing: 0.07 },
  mono:       { fontFamily: familyMono,   fontSize: 14, fontWeight: '500' }
}
