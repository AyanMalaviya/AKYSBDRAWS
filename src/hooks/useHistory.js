import { useState, useEffect } from 'react'
import { get, set } from 'idb-keyval'

const KEY = 'akysbdraws_history'

export function useHistory() {
  const [history, setHistory] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)

  // 1. Load asynchronously on mount
  useEffect(() => {
    get(KEY).then((val) => {
      if (val) setHistory(JSON.parse(val))
      setIsLoaded(true)
    }).catch(() => setIsLoaded(true))
  }, [])

  const upsertHistory = (tournament) => {
    if (!tournament?.id) return
    
    // 2. Identify if there's a winner in ANY stage
    const champ = tournament.stage2?.bracket?.champion || tournament.bracket?.champion || null;
    
    setHistory(prev => {
      const existing = prev.findIndex(e => e.id === tournament.id)
      const previouslyArchived = existing >= 0 ? prev[existing].isArchived : false
      
      // 3. AUTO-ARCHIVE trigger: Move to history if a champion exists
      const shouldArchive = previouslyArchived || tournament.isArchived || !!champ

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
        stage2: tournament.stage2,
        round2Groups: tournament.round2Groups,
        round2Players: tournament.round2Players,
        round: tournament.round,
        champion: champ,
        isArchived: shouldArchive // Applied here
      }
      
      const next = [...prev]
      if (existing >= 0) {
        next[existing] = entry
      } else {
        next.unshift(entry)
        if (next.length > 30) next.length = 30 // Keep history lean
      }
      
      // 4. INSTANT SAVE to IndexedDB
      // Bypassing the debounce ensures the final match & Stage 2/3 results 
      // are immediately stored, even if the app quickly navigates away.
      set(KEY, JSON.stringify(next)).catch(e => console.error('Storage error:', e))
      
      return next
    })
  }

  const archiveEntry = (id) => setHistory(prev => {
    const next = prev.map(e => e.id === id ? { ...e, isArchived: true } : e)
    set(KEY, JSON.stringify(next))
    return next
  })
  
  const deleteEntry = (id) => setHistory(prev => {
    const next = prev.filter(e => e.id !== id)
    set(KEY, JSON.stringify(next))
    return next
  })
  
  const deleteAll = () => setHistory(prev => {
    const next = prev.filter(e => !e.isArchived)
    set(KEY, JSON.stringify(next))
    return next
  })
  
  const restoreEntry = (entry) => entry

  return { history, isLoaded, upsertHistory, deleteEntry, deleteAll, restoreEntry, archiveEntry }
}