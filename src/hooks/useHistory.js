// useHistory — persists tournament history to localStorage
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'akysbdraws_history'

export function useHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)) }
    catch { /* storage full */ }
  }, [history])

  const saveToHistory = (tournament) => {
    const entry = {
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      format: tournament.format,
      playerCount: tournament.players.length,
      players: tournament.players,
      bracket: tournament.bracket,
      champion: tournament.bracket.champion || null,
    }
    setHistory(prev => [entry, ...prev].slice(0, 50)) // max 50 entries
  }

  const deleteEntry = (id) => {
    setHistory(prev => prev.filter(e => e.id !== id))
  }

  const deleteAll = () => setHistory([])

  const restoreEntry = (entry) => ({
    format: entry.format,
    players: entry.players,
    bracket: entry.bracket,
  })

  return { history, saveToHistory, deleteEntry, deleteAll, restoreEntry }
}
