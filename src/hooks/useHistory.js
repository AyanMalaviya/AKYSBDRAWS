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

  const upsertHistory = (tournament) => {
    if (!tournament?.id) return
    setHistory(prev => {
      const existing = prev.findIndex(e => e.id === tournament.id)
      const entry = {
        id: tournament.id,
        savedAt: new Date().toISOString(),
        type: tournament.type || 'bracket',
        title: tournament.title || '',
        format: tournament.format || 'groups',
        playerCount: tournament.players?.length || 0,
        players: tournament.players || [],
        bracket: tournament.bracket,
        groups: tournament.groups,
        champion: tournament.bracket?.champion || null,
        // Inherits previous status or defaults to the one provided
        isArchived: tournament.isArchived !== undefined ? tournament.isArchived : (existing >= 0 ? prev[existing].isArchived : false)
      }
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = entry
        return next
      }
      // Increased to 30 to hold a comfortable mix of active and history items
      return [entry, ...prev].slice(0, 30)
    })
  }

  // Used to move an active tournament to the dashboard
  const archiveEntry = (id) => setHistory(prev => prev.map(e => e.id === id ? { ...e, isArchived: true } : e))
  
  const deleteEntry = (id) => setHistory(prev => prev.filter(e => e.id !== id))
  
  // Only clear the archived tournaments from dashboard, protect active games
  const deleteAll = () => setHistory(prev => prev.filter(e => !e.isArchived)) 
  
  const restoreEntry = (entry) => entry 

  return { history, upsertHistory, deleteEntry, deleteAll, restoreEntry, archiveEntry }
}