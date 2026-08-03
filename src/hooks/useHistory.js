import { useState, useEffect, useCallback } from 'react';

export function useHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('akysb_tournaments');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse history from localStorage", e);
      return [];
    }
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('akysb_tournaments', JSON.stringify(history));
    }
  }, [history, isLoaded]);

  const upsertHistory = useCallback((tournament) => {
    setHistory(prev => {
      const idx = prev.findIndex(t => t.id === tournament.id);
      let next = [...prev];
      
      if (idx >= 0) {
        next[idx] = tournament;
      } else {
        next = [tournament, ...prev];
      }

      // 1. Separate the tournaments into two distinct buckets
      const groupDraws = next.filter(t => t.type === 'group');
      // Everything else (single_elim, double_elim, round_robin, swiss) acts as a Bracket
      const bracketDraws = next.filter(t => t.type !== 'group'); 

      // 2. Enforce the 10-tournament limit on each bucket independently
      const limitedGroups = groupDraws.slice(0, 10);
      const limitedBrackets = bracketDraws.slice(0, 10);

      // 3. Create a Set of allowed IDs to maintain the exact chronological order of 'next'
      const allowedIds = new Set([
        ...limitedGroups.map(t => t.id),
        ...limitedBrackets.map(t => t.id)
      ]);

      return next.filter(t => allowedIds.has(t.id));
    });
  }, []);

  const archiveEntry = useCallback((id) => {
    setHistory(prev => prev.map(t => 
      t.id === id ? { ...t, isArchived: true } : t
    ));
  }, []);

  const deleteEntry = useCallback((id) => {
    setHistory(prev => prev.filter(t => t.id !== id));
  }, []);

  const deleteAll = useCallback(() => {
    setHistory([]);
  }, []);

  const syncHistory = useCallback((merged) => {
    setHistory(merged);
  }, []);

  return { history, isLoaded, upsertHistory, archiveEntry, deleteEntry, deleteAll, syncHistory };
}