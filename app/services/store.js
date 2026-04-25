import React, { createContext, useContext, useReducer, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@vault/state'

const initialState = {
  hydrated: false,
  mode: null,                // 'owner' | 'guardian'
  identity: null,            // { publicKeyHex }
  owner: null,               // see CONTRACTS.md `owner`
  guardian: null,            // see CONTRACTS.md `guardian`
  // Demo-only:
  fastForward: false,        // multiplies clock x60 for the demo
  liveHeartbeats: {}         // ownerPubKeyHex -> lastSeenAt
}

function reducer (state, action) {
  switch (action.type) {
    case 'hydrate':           return { ...state, ...action.payload, hydrated: true }
    case 'setMode':           return { ...state, mode: action.mode }
    case 'setIdentity':       return { ...state, identity: action.identity }
    case 'setOwner':          return { ...state, owner: { ...(state.owner || {}), ...action.patch } }
    case 'setGuardian':       return { ...state, guardian: { ...(state.guardian || {}), ...action.patch } }
    case 'updateGuardianRow': {
      const next = (state.owner?.guardians || []).map((g) =>
        g.index === action.index ? { ...g, ...action.patch } : g
      )
      return { ...state, owner: { ...state.owner, guardians: next } }
    }
    case 'setFastForward':    return { ...state, fastForward: action.value }
    case 'observedHeartbeat': return { ...state, liveHeartbeats: { ...state.liveHeartbeats, [action.ownerPubKey]: action.lastSeenAt } }
    case 'reset':             return { ...initialState, hydrated: true }
    default: return state
  }
}

const StoreContext = createContext(null)

export function StoreProvider ({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        const payload = raw ? JSON.parse(raw) : {}
        dispatch({ type: 'hydrate', payload })
      } catch {
        dispatch({ type: 'hydrate', payload: {} })
      }
    })()
  }, [])

  useEffect(() => {
    if (!state.hydrated) return
    const { hydrated, ...persistable } = state
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable)).catch(() => {})
  }, [state])

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore () {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be inside <StoreProvider>')
  return ctx
}
