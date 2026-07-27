import { useState, useEffect } from 'react'

const KEY = 'akysb_setup_v1'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
}

export function useSetupStorage(defaults) {
  const [state, setState] = useState(() => {
    const saved = load()
    return saved ? { ...defaults, ...saved } : defaults
  })

  // INSTANT SAVE: Directly write to local storage whenever state changes
  useEffect(() => {
    save(state)
  }, [state])

  const set = (key, val) =>
    setState(prev => ({ ...prev, [key]: typeof val === 'function' ? val(prev[key]) : val }))

  const clear = () => {
    try { localStorage.removeItem(KEY) } catch {}
    setState(defaults)
  }

  return [state, set, clear]
}