// These two lines MUST be first — before any @solana or crypto import.
import 'react-native-get-random-values'
import 'react-native-url-polyfill/auto'

import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { StoreProvider, useStore } from './services/store'
import { colors } from './theme'
import { BridgeBanner } from './components/BridgeBanner'
import { clock } from './services/clock'
import * as protocol from './services/protocol'

import ModeSelectScreen from './screens/ModeSelectScreen'
import SetupWelcomeScreen from './screens/owner/SetupWelcomeScreen'
import SetupPassphraseScreen from './screens/owner/SetupPassphraseScreen'
import SetupEstateScreen from './screens/owner/SetupEstateScreen'
import SetupGuardiansScreen from './screens/owner/SetupGuardiansScreen'
import SetupHandoffScreen from './screens/owner/SetupHandoffScreen'
import OwnerDashboardScreen from './screens/owner/OwnerDashboardScreen'
import EstateBrowserScreen from './screens/owner/EstateBrowserScreen'
import GuardianRosterScreen from './screens/owner/GuardianRosterScreen'
import VaultListScreen from './screens/owner/VaultListScreen'
import VaultArmedScreen from './screens/owner/VaultArmedScreen'
import GuardianOnboardingScreen from './screens/guardian/GuardianOnboardingScreen'
import GuardianAcceptingScreen from './screens/guardian/GuardianAcceptingScreen'
import GuardianDashboardScreen from './screens/guardian/GuardianDashboardScreen'
import ReconstructionScreen from './screens/guardian/ReconstructionScreen'
import EstateUnlockedScreen from './screens/guardian/EstateUnlockedScreen'

const Stack = createNativeStackNavigator()

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.separator,
    primary: colors.accent
  }
}

function RootNavigator () {
  const { state, dispatch } = useStore()

  React.useEffect(() => {
    return protocol.onClockSync((multiplier) => {
      clock.setMultiplier(multiplier)
      dispatch({ type: 'setFastForward', value: multiplier > 1 })
    })
  }, [])

  if (!state.hydrated) return null

  // Pick the initial route based on persisted mode + setup progress.
  let initial = 'ModeSelect'
  if (state.mode === 'owner') {
    initial = state.owner?.driveKey ? 'OwnerDashboard' : 'SetupWelcome'
  } else if (state.mode === 'guardian') {
    initial = state.guardian?.sealedShard ? 'GuardianDashboard' : 'GuardianOnboarding'
  }

  return (
    <Stack.Navigator
      initialRouteName={initial}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="ModeSelect" component={ModeSelectScreen} />

      <Stack.Screen name="SetupWelcome" component={SetupWelcomeScreen} />
      <Stack.Screen name="SetupPassphrase" component={SetupPassphraseScreen} />
      <Stack.Screen name="SetupEstate" component={SetupEstateScreen} />
      <Stack.Screen name="SetupGuardians" component={SetupGuardiansScreen} />
      <Stack.Screen name="SetupHandoff" component={SetupHandoffScreen} />

      <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
      <Stack.Screen name="EstateBrowser" component={EstateBrowserScreen} />
      <Stack.Screen name="GuardianRoster" component={GuardianRosterScreen} />
      <Stack.Screen name="VaultList" component={VaultListScreen} />
      <Stack.Screen name="VaultArmed" component={VaultArmedScreen} />

      <Stack.Screen name="GuardianOnboarding" component={GuardianOnboardingScreen} />
      <Stack.Screen name="GuardianAccepting" component={GuardianAcceptingScreen} />
      <Stack.Screen name="GuardianDashboard" component={GuardianDashboardScreen} />
      <Stack.Screen name="Reconstruction" component={ReconstructionScreen} />
      <Stack.Screen name="EstateUnlocked" component={EstateUnlockedScreen} />
    </Stack.Navigator>
  )
}

export default function App () {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="dark" />
            <BridgeBanner />
            <RootNavigator />
          </NavigationContainer>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
