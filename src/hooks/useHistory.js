import { useState, useEffect } from 'react'

const KEY = 'akysbdraws_history'

export function useHistory() {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
    catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(history)) }
    catch {}
  }, [history])

  // UPSERT by tournamentId — never creates duplicates
  const upsertHistory = (tournament) => {
    if (!tournament?.id) return
    setHistory(prev => {
      const existing = prev.findIndex(e => e.id === tournament.id)
      const entry = {
        id: tournament.id,
        savedAt: new Date().toISOString(),
        format: tournament.format,
        playerCount: tournament.players.length,
        players: tournament.players,
        bracket: tournament.bracket,
        champion: tournament.bracket?.champion || null,
      }
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = entry
        return next
      }
      return [entry, ...prev].slice(0, 50)
    })
  }

  const deleteEntry = (id) => setHistory(prev => prev.filter(e => e.id !== id))
  const deleteAll = () => setHistory([])
  const restoreEntry = (entry) => ({
    id: entry.id,
    format: entry.format,
    players: entry.players,
    bracket: entry.bracket,
  })

  return { history, upsertHistory, deleteEntry, deleteAll, restoreEntry }
}
