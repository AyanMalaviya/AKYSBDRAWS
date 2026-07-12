// Persist Setup form state in localStorage so refreshes / back-navigation
// never lose player names, tags, or settings.

import { useState, useEffect, useRef } from 'react'

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

  // Debounce saves — only write after 300ms of no changes
  const timer = useRef(null)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => save(state), 300)
    return () => clearTimeout(timer.current)
  }, [state])

  const set = (key, val) =>
    setState(prev => ({ ...prev, [key]: typeof val === 'function' ? val(prev[key]) : val }))

  const clear = () => {
    try { localStorage.removeItem(KEY) } catch {}
    setState(defaults)
  }

  return [state, set, clear]
}
