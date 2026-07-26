import { useState, useEffect, useCallback, useRef } from 'react'
import { get, set } from 'idb-keyval'

const KEY = 'akysbdraws_history'

export function useHistory() {
  const [history, setHistory] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Always hold latest history state in a ref so callbacks never go stale
  const historyRef = useRef([])

  useEffect(() => {
    get(KEY).then((val) => {
      if (val) {
        const parsed = JSON.parse(val)
        historyRef.current = parsed
        setHistory(parsed)
      }
      setIsLoaded(true)
    }).catch(() => setIsLoaded(true))
  }, [])

  // Keep ref in sync with state
  const syncHistory = useCallback((next) => {
    historyRef.current = next
    setHistory(next)
    set(KEY, JSON.stringify(next)).catch(e => console.error('Storage error:', e))
  }, [])

  const upsertHistory = useCallback((tournament) => {
    if (!tournament?.id) return
    const champ = tournament.stage2?.bracket?.champion || tournament.bracket?.champion || null
    const prev  = historyRef.current
    const existing            = prev.findIndex(e => e.id === tournament.id)
    const previouslyArchived  = existing >= 0 ? prev[existing].isArchived : false
    const shouldArchive       = previouslyArchived || tournament.isArchived || !!champ

    const entry = {
      id:          tournament.id,
      savedAt:     new Date().toISOString(),
      type:        tournament.type   || 'bracket',
      title:       tournament.title  || '',
      format:      tournament.format || 'groups',
      playerCount: tournament.players?.length || 0,
      players:     tournament.players  || [],
      bracket:     tournament.bracket,
      groups:      tournament.groups,
      stage2:      tournament.stage2,
      round2Groups:  tournament.round2Groups,
      round2Players: tournament.round2Players,
      round:       tournament.round,
      champion:    champ,
      isArchived:  shouldArchive,
    }

    const next = [...prev]
    if (existing >= 0) {
      next[existing] = entry
    } else {
      next.unshift(entry)
      if (next.length > 30) next.length = 30
    }
    syncHistory(next)
  }, [syncHistory])

  const archiveEntry = useCallback((id) => {
    const next = historyRef.current.map(e => e.id === id ? { ...e, isArchived: true } : e)
    syncHistory(next)
  }, [syncHistory])

  const deleteEntry = useCallback((id) => {
    const next = historyRef.current.filter(e => e.id !== id)
    syncHistory(next)
  }, [syncHistory])

  const deleteAll = useCallback(() => {
    const next = historyRef.current.filter(e => !e.isArchived)
    syncHistory(next)
  }, [syncHistory])

  const restoreEntry = useCallback((entry) => entry, [])

  return { history, isLoaded, upsertHistory, deleteEntry, deleteAll, restoreEntry, archiveEntry }
}
