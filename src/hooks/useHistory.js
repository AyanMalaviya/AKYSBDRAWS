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
        type: tournament.type || 'bracket', // Identifies if it's a bracket or group
        title: tournament.title || '',
        format: tournament.format || 'groups',
        playerCount: tournament.players?.length || 0,
        players: tournament.players || [],
        bracket: tournament.bracket,
        groups: tournament.groups,
        champion: tournament.bracket?.champion || null,
      }
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = entry
        return next
      }
      // Limits history to 10 concurrent tournaments
      return [entry, ...prev].slice(0, 10)
    })
  }

  const deleteEntry = (id) => setHistory(prev => prev.filter(e => e.id !== id))
  const deleteAll = () => setHistory([])
  const restoreEntry = (entry) => entry // Return the full entry

  return { history, upsertHistory, deleteEntry, deleteAll, restoreEntry }
}