import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import GroupView from './components/GroupView.jsx'
import Dashboard from './components/Dashboard.jsx'
import Footer from './components/Footer.jsx'
import { generateBracket, generateStage2Elim, advanceWinnerStage2Elim, advanceWinnerSingleElim, seedKnockoutPlayers } from './engine/bracketEngine.js'
import BackupSync from './components/BackupSync.jsx'
import { generateGroups, reassignTagsByStandings } from './engine/groupEngine.js'
import { useHistory } from './hooks/useHistory.js'

const HOME_FRAME = { view: 'home', tournament: null, groups: null, stage2: null }

function pickByePlayer(players) {
  if (!players || players.length === 0) return null
  return [...players].sort((a, b) =>
    ((b.koWins ?? b.wins ?? 0)            - (a.koWins ?? a.wins ?? 0))            ||
    ((b.koSD ?? b.scoreDiff ?? b.sd ?? 0) - (a.koSD ?? a.scoreDiff ?? a.sd ?? 0)) ||
    ((b.koGF ?? b.scoredFor ?? b.gf ?? 0) - (a.koGF ?? a.scoredFor ?? a.gf ?? 0)) ||
    ((b.points ?? 0)                      - (a.points ?? 0))                      ||
    (a.name ?? '').localeCompare(b.name ?? '')
  )[0]
}

function getKnockoutStats(playerId, bracket) {
  let koWins = 0, koSD = 0, koGF = 0;
  if (!bracket || !bracket.rounds) return { koWins, koSD, koGF };

  bracket.rounds.forEach(round => {
    round.forEach(m => {
      if (m.p1?.id === playerId || m.p2?.id === playerId) {
        if (m.winner?.id === playerId) koWins++;
        if (m.score1 != null && m.score2 != null) {
          const myScore = m.p1?.id === playerId ? Number(m.score1) : Number(m.score2);
          const opScore = m.p1?.id === playerId ? Number(m.score2) : Number(m.score1);
          koSD += (myScore - opScore);
          koGF += myScore;
        }
      }
    });
  });
  return { koWins, koSD, koGF };
}

// ── UPGRADED ODD PLAYER RESOLUTION UI ──
function ByeSelectionUI({ bracket, advancers, allPlayers, onConfirm }) {
  const [mode, setMode] = useState('bye')

  // BYE LOGIC
  const enrichedBye = useMemo(() => {
    return advancers.map(w => {
      const src = allPlayers.find(p => p.id === w.id) || w;
      const koStats = getKnockoutStats(w.id, bracket); 
      return { ...src, ...koStats };
    })
  }, [advancers, allPlayers, bracket])

  const suggestedBye = useMemo(() => pickByePlayer(enrichedBye), [enrichedBye])
  const [selectedByeId, setSelectedByeId] = useState('')

  // WILDCARD LOGIC
  const wildcardCandidates = useMemo(() => {
    let candidates = []
    
    // Safely extract losers from the exact preceding round
    if (bracket.rounds && bracket.rounds.length > 0) {
      const lastRound = bracket.rounds[bracket.rounds.length - 1]
      candidates = lastRound.map(m => {
        if (!m.winner || m.winner === 'draw') return null;
        if (m.winner.id === m.p1?.id) return m.p2;
        if (m.winner.id === m.p2?.id) return m.p1;
        return null;
      }).filter(c => c && c.id !== 'bye')
    } else {
      // If Stage 2 just started, grab any non-advancing player from the universe
      const advancerIds = new Set(advancers.map(p => p.id))
      candidates = allPlayers.filter(p => p && p.id !== 'bye' && !advancerIds.has(p.id))
    }

    // Enrich with stats and sort to explicitly place the BEST loser at the top
    return candidates.map(c => {
      const src = allPlayers.find(p => p.id === c.id) || c;
      const koStats = getKnockoutStats(c.id, bracket);
      return { ...src, ...koStats };
    }).sort((a,b) => {
      return ((b.koWins ?? b.wins ?? 0)            - (a.koWins ?? a.wins ?? 0))            ||
             ((b.koSD ?? b.scoreDiff ?? b.sd ?? 0) - (a.koSD ?? a.scoreDiff ?? a.sd ?? 0)) ||
             ((b.koGF ?? b.scoredFor ?? b.gf ?? 0) - (a.koGF ?? a.scoredFor ?? a.gf ?? 0)) ||
             ((b.points ?? 0)                      - (a.points ?? 0))                      ||
             (a.name ?? '').localeCompare(b.name ?? '')
    })
  }, [bracket, advancers, allPlayers])

  const suggestedWildcard = wildcardCandidates[0]
  const [selectedWildcardId, setSelectedWildcardId] = useState('')

  useEffect(() => { if (suggestedBye) setSelectedByeId(suggestedBye.id) }, [suggestedBye])
  useEffect(() => { if (suggestedWildcard) setSelectedWildcardId(suggestedWildcard.id) }, [suggestedWildcard])

  if (!advancers || advancers.length === 0) return null

  return (
    <div style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.4)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
      <h3 style={{ marginTop: 0, color: 'var(--gold-light)', fontSize: 18, marginBottom: 6 }}>
        Odd Number of Advancers ({advancers.length})
      </h3>
      <p style={{ fontSize: 14, color: 'var(--white-soft)', marginBottom: 20, lineHeight: 1.5 }}>
        You have an odd number of players advancing. You must either give one player a <strong>BYE</strong>, or bring back an eliminated player (<strong>NO BYE</strong>) to balance the bracket.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button 
          onClick={() => setMode('bye')} 
          style={{ 
            flex: 1, padding: '12px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 14, transition: 'all 0.2s',
            background: mode === 'bye' ? 'var(--gold-light)' : 'rgba(255,255,255,0.05)', 
            color: mode === 'bye' ? '#000' : 'var(--muted)', 
            border: mode === 'bye' ? '2px solid var(--gold-light)' : '2px solid rgba(255,255,255,0.1)' 
          }}
        >
          ⏭️ Assign a BYE
        </button>
        
        {wildcardCandidates.length > 0 ? (
          <button 
            onClick={() => setMode('wildcard')} 
            style={{ 
              flex: 1, padding: '12px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 14, transition: 'all 0.2s',
              background: mode === 'wildcard' ? 'var(--purple-light)' : 'rgba(255,255,255,0.05)', 
              color: mode === 'wildcard' ? '#000' : 'var(--muted)', 
              border: mode === 'wildcard' ? '2px solid var(--purple-light)' : '2px solid rgba(255,255,255,0.1)' 
            }}
          >
            🛟 NO BYE (Return Best Loser)
          </button>
        ) : (
          <button disabled style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.05)', cursor: 'not-allowed', fontSize: 14, fontWeight: 800 }}>
             🛟 No Extra Players Available
          </button>
        )}
      </div>

      {mode === 'bye' ? (
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>Select the player who will skip this round (Defaulted to highest scorer):</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select 
              value={selectedByeId} 
              onChange={e => setSelectedByeId(e.target.value)}
              style={{ flex: 1, padding: 12, borderRadius: 8, background: 'var(--surface2)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: 15 }}
            >
              {enrichedBye.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — Diff: {p.koSD ?? p.scoreDiff ?? 0} {p.id === suggestedBye?.id ? '(Suggested Best Player)' : ''}
                </option>
              ))}
            </select>
            <button 
              onClick={() => onConfirm({ type: 'bye', playerId: selectedByeId })}
              style={{ background: 'var(--gold-light)', color: '#000', padding: '12px 20px', borderRadius: 8, fontWeight: 900, cursor: 'pointer', border: 'none', fontSize: 15 }}
            >
              Confirm BYE →
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>Select the eliminated player to return. They will be paired against the top player:</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select 
              value={selectedWildcardId} 
              onChange={e => setSelectedWildcardId(e.target.value)}
              style={{ flex: 1, padding: 12, borderRadius: 8, background: 'var(--surface2)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: 15 }}
            >
              {wildcardCandidates.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — Diff: {p.koSD ?? p.scoreDiff ?? 0} {p.id === suggestedWildcard?.id ? '(Suggested Best Loser)' : ''}
                </option>
              ))}
            </select>
            <button 
              onClick={() => {
                const wildcardPlayer = wildcardCandidates.find(c => c.id === selectedWildcardId);
                onConfirm({ type: 'wildcard', player: wildcardPlayer })
              }}
              style={{ background: 'var(--purple-light)', color: '#000', padding: '12px 20px', borderRadius: 8, fontWeight: 900, cursor: 'pointer', border: 'none', fontSize: 15 }}
            >
              Confirm Wildcard →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [view, setView]             = useState('home')
  const [tournament, setTournament] = useState(null)
  const [groups, setGroups]         = useState(null)
  const [stage2, setStage2]         = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  const { history, isLoaded, upsertHistory, deleteEntry, deleteAll, archiveEntry, syncHistory } = useHistory()

  const stackRef      = useRef([HOME_FRAME])
  const isPushingRef  = useRef(false)
  const tournamentRef = useRef(tournament)
  const groupsRef     = useRef(groups)
  
  useEffect(() => { tournamentRef.current = tournament }, [tournament])
  useEffect(() => { groupsRef.current = groups }, [groups])

  const allAvailablePlayers = useMemo(() => {
    let pool = []
    if (groups) pool = [...pool, ...groups.flatMap(g => g.players || [])]
    if (tournament?.players) pool = [...pool, ...tournament.players]
    const seen = new Set()
    return pool.filter(p => {
      if (!p || seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }, [groups, tournament])

  const applyFrame = useCallback((frame) => {
    setView(frame.view)
    setTournament(frame.tournament)
    setGroups(frame.groups)
    setStage2(frame.stage2)
  }, [])

  const navigate = useCallback((newView, extra = {}) => {
    const frame = {
      view: newView,
      tournament: extra.tournament ?? null,
      groups:     extra.groups     ?? null,
      stage2:     extra.stage2     ?? null,
    }
    stackRef.current.push(frame)
    isPushingRef.current = true
    window.history.pushState({ depth: stackRef.current.length }, '')
    isPushingRef.current = false
    applyFrame(frame)
  }, [applyFrame])

  useEffect(() => {
    window.history.replaceState({ depth: 1 }, '')
    const handlePopState = () => {
      if (isPushingRef.current) return
      const stack = stackRef.current
      if (stack.length <= 1) {
        isPushingRef.current = true
        window.history.pushState({ depth: 1 }, '')
        isPushingRef.current = false
        return
      }
      stack.pop()
      applyFrame(stack[stack.length - 1])
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [applyFrame])

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const hasRestoredRef = useRef(false)
  useEffect(() => {
    if (!isLoaded || hasRestoredRef.current) return
    hasRestoredRef.current = true
    const sessionStr = localStorage.getItem('akysb_active_session')
    if (sessionStr) {
      try {
        const session    = JSON.parse(sessionStr)
        const entryState = history.find(e => e.id === session.tournamentId)
        if (entryState) {
          stackRef.current = [HOME_FRAME]
          const targetFrame = {
            view:       session.view,
            tournament: entryState,
            groups:     entryState.groups || null,
            stage2:     entryState.stage2 || null,
          }
          stackRef.current.push(targetFrame)
          window.history.replaceState({ depth: stackRef.current.length }, '')
          applyFrame(targetFrame)
        }
      } catch (e) {}
    }
  }, [isLoaded, history, applyFrame])

  useEffect(() => {
    if (view === 'home' || view === 'dashboard') {
      localStorage.removeItem('akysb_active_session')
    } else if (tournament?.id) {
      localStorage.setItem('akysb_active_session', JSON.stringify({ view, tournamentId: tournament.id }))
    }
  }, [view, tournament?.id])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  const handleHome = useCallback(() => {
    stackRef.current = [HOME_FRAME]
    window.history.replaceState({ depth: 1 }, '')
    applyFrame(HOME_FRAME)
  }, [applyFrame])

  const handleLogoClick = useCallback(() => {
    const rootFrame = { view: 'dashboard', tournament: null, groups: null, stage2: null }
    stackRef.current = [rootFrame]
    window.history.replaceState({ depth: 1 }, '')
    applyFrame(rootFrame)
  }, [applyFrame])

  const handleStart = ({ id, title, format, players }) => {
    const newId = id || Date.now().toString()
    const seededPlayers = seedKnockoutPlayers(players)

    const t = {
      id: newId, 
      type: format, 
      title: title || 'Bracket Draw',
      format, 
      players: seededPlayers,
      bracket: generateBracket(format, seededPlayers),
      isArchived: false,
    }
    upsertHistory(t)
    stackRef.current = [HOME_FRAME]
    navigate('bracket', { tournament: t, groups: null, stage2: null })
  }

  const handleBracketUpdate = useCallback((updatedBracket) => {
    setTournament(prev => {
      const isFinished = !!updatedBracket.champion
      const u = { ...prev, bracket: updatedBracket }
      if (isFinished) u.isArchived = true
      upsertHistory(u)
      stackRef.current.forEach((f, i) => { stackRef.current[i] = { ...f, tournament: u } })
      return u
    })
  }, [upsertHistory])

  const handleGroupStart = ({ id, title, players, groupSize }) => {
    const g = generateGroups(players, groupSize)
    const t = {
      id: id || Date.now().toString(), type: 'group',
      title: title || 'Group Draw', players, groupSize,
      groups: g, isArchived: false,
    }
    upsertHistory(t)
    stackRef.current = [HOME_FRAME]
    navigate('groups', { tournament: t, groups: g, stage2: null })
  }

  const handleGroupsUpdate = useCallback((updatedGroups) => {
    setGroups(updatedGroups)
    setTournament(prev => {
      if (!prev) return prev
      const u = { ...prev, groups: updatedGroups }
      upsertHistory(u)
      stackRef.current.forEach((f, i) => {
        stackRef.current[i] = { ...f, tournament: u }
        if (f.view === 'groups') stackRef.current[i].groups = updatedGroups
      })
      return u
    })
  }, [upsertHistory])

  const handleAdvanceToStage2 = useCallback((advancers, stage2Type = 'knockout') => {
    const currentTournament = tournamentRef.current
    const currentGroups     = groupsRef.current

    const taggedAdvancers = advancers.map(p => {
      let newTag = 'D'
      if (p.rank === 0) newTag = 'A'
      else if (p.rank === 1) newTag = 'B'
      else if (p.rank === 2) newTag = 'C'
      return { ...p, tag: newTag }
    })

    if (stage2Type === 'groups') {
      const seededAdvancers = reassignTagsByStandings(taggedAdvancers)
      const groupSize = Math.max(3, Math.round(seededAdvancers.length / Math.max(2, Math.round(seededAdvancers.length / 4))))
      const newGroups = generateGroups(seededAdvancers, groupSize)
      const s2 = { type: 'groups', players: seededAdvancers, groups: newGroups, groupSize }
      setTournament(prev => {
        const u = { ...prev, stage2: s2, groups: newGroups }
        upsertHistory(u)
        stackRef.current.forEach((f, i) => {
          stackRef.current[i] = { ...f, tournament: u }
          if (f.view === 'groups') stackRef.current[i].groups = newGroups
        })
        return u
      })
      navigate('stage2', { groups: newGroups, stage2: s2 })
      return
    }

    const prevIds = currentTournament?.stage2?.players?.map(p => p.id).join(',') || ''
    const newIds  = taggedAdvancers.map(p => p.id).join(',')
    if (currentTournament?.stage2 && currentTournament.stage2.type !== 'groups' && prevIds === newIds) {
      navigate('stage2', { tournament: currentTournament, groups: currentGroups, stage2: currentTournament.stage2 })
      return
    }

    const bracket = generateStage2Elim(taggedAdvancers)

    const s2 = { type: 'knockout', players: taggedAdvancers, bracket }
    setTournament(prev => {
      const u = { ...prev, stage2: s2 }
      upsertHistory(u)
      stackRef.current.forEach((f, i) => { stackRef.current[i] = { ...f, tournament: u } })
      return u
    })
    navigate('stage2', { groups: currentGroups, stage2: s2 })
  }, [upsertHistory, navigate])

  const handleStage2BracketUpdate = useCallback((updatedBracket) => {
    setStage2(prev => {
      const s2 = { ...prev, bracket: updatedBracket }
      setTournament(t => {
        const isFinished = !!updatedBracket.champion
        const u = { ...t, stage2: s2 }
        if (isFinished) u.isArchived = true
        upsertHistory(u)
        stackRef.current.forEach((f, i) => {
          stackRef.current[i] = { ...f, tournament: u }
          if (f.view === 'stage2') stackRef.current[i].stage2 = s2
        })
        return u
      })
      return s2
    })
  }, [upsertHistory])

  const handleStage2GroupsUpdate = useCallback((updatedGroups) => {
    setGroups(updatedGroups)
    setStage2(prev => {
      const s2 = { ...prev, groups: updatedGroups }
      setTournament(t => {
        const u = { ...t, stage2: s2 }
        upsertHistory(u)
        stackRef.current.forEach((f, i) => {
          stackRef.current[i] = { ...f, tournament: u }
          if (f.view === 'stage2') {
            stackRef.current[i].stage2 = s2
            stackRef.current[i].groups = updatedGroups
          }
        })
        return u
      })
      return s2
    })
  }, [upsertHistory])

  const handleAdvanceToStage3 = useCallback((advancers, stage2Type = 'knockout') => {
    const currentGroups = groupsRef.current

    const taggedAdvancers = advancers.map(p => {
      let newTag = 'D'
      if (p.rank === 0) newTag = 'A'
      else if (p.rank === 1) newTag = 'B'
      else if (p.rank === 2) newTag = 'C'
      return { ...p, tag: newTag }
    })

    if (stage2Type === 'groups') {
      const seededAdvancers = reassignTagsByStandings(taggedAdvancers)
      const groupSize = Math.max(3, Math.round(seededAdvancers.length / Math.max(2, Math.round(seededAdvancers.length / 4))))
      const newGroups = generateGroups(seededAdvancers, groupSize)
      const s3 = { type: 'groups', players: seededAdvancers, groups: newGroups, groupSize }
      setTournament(prev => {
        const u = { ...prev, stage2: s3, groups: newGroups }
        upsertHistory(u)
        stackRef.current.forEach((f, i) => { stackRef.current[i] = { ...f, tournament: u } })
        return u
      })
      navigate('stage2', { groups: newGroups, stage2: s3 })
      return
    }

    const bracket = generateStage2Elim(taggedAdvancers)
    const s3 = { type: 'knockout', players: taggedAdvancers, bracket }

    setTournament(prev => {
      const u = { ...prev, stage2: s3 }
      upsertHistory(u)
      stackRef.current.forEach((f, i) => { stackRef.current[i] = { ...f, tournament: u } })
      return u
    })
    navigate('stage2', { groups: currentGroups, stage2: s3 })
  }, [upsertHistory, navigate])

  const handleRestore = useCallback((entry, targetView = 'groups') => {
    stackRef.current = [HOME_FRAME]
    window.history.replaceState({ depth: 1 }, '')
    if (entry.type === 'group') {
      const hasStage2   = !!(entry.stage2)
      const gGroups     = entry.groups || null
      const gStage2     = entry.stage2 || null
      const groupsFrame = { view: 'groups', tournament: entry, groups: gGroups, stage2: null }
      stackRef.current.push(groupsFrame)
      isPushingRef.current = true
      window.history.pushState({ depth: stackRef.current.length }, '')
      isPushingRef.current = false
      if (hasStage2 && targetView === 'stage2') {
        const stage2Frame = { view: 'stage2', tournament: entry, groups: gGroups, stage2: gStage2 }
        stackRef.current.push(stage2Frame)
        isPushingRef.current = true
        window.history.pushState({ depth: stackRef.current.length }, '')
        isPushingRef.current = false
        applyFrame(stage2Frame)
      } else {
        applyFrame(groupsFrame)
      }
    } else {
      const bracketFrame = { view: 'bracket', tournament: entry, groups: null, stage2: null }
      stackRef.current.push(bracketFrame)
      isPushingRef.current = true
      window.history.pushState({ depth: stackRef.current.length }, '')
      isPushingRef.current = false
      applyFrame(bracketFrame)
    }
  }, [applyFrame])

  const handleDashboard = useCallback(() => {
    navigate('dashboard', { tournament, groups, stage2 })
  }, [navigate, tournament, groups, stage2])

  const handleHistoryChange = useCallback((merged) => {
    if (typeof syncHistory === 'function') syncHistory(merged)
    setTournament(prev => {
      if (!prev) return prev
      const incoming = merged.find(t => t.id === prev.id)
      if (incoming) {
        if (incoming.groups) setGroups(incoming.groups)
        if (incoming.stage2) setStage2(incoming.stage2)
        stackRef.current.forEach((f, i) => {
          if (f.tournament?.id === incoming.id) {
            stackRef.current[i] = {
              ...f, tournament: incoming,
              groups: incoming.groups || f.groups,
              stage2: incoming.stage2 || f.stage2,
            }
          }
        })
        return incoming
      }
      return prev
    })
  }, [syncHistory])

  const topFrame     = stackRef.current[stackRef.current.length - 1]
  const renderGroups = topFrame?.view === 'groups' ? (topFrame.groups ?? groups) : groups
  const renderStage2 = topFrame?.view === 'stage2' ? (topFrame.stage2 ?? stage2) : stage2

  const s2BannerStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'linear-gradient(90deg, rgba(212,160,23,0.08), rgba(139,92,246,0.06))',
    border: '1px solid rgba(212,160,23,0.28)',
    borderRadius: 12, padding: '12px 20px', marginBottom: 16,
  }

  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-brand" onClick={handleLogoClick}>
          <div>
            <div className="brand-name">Tournament <span className="brand-accent">Draws</span></div>
            <div className="brand-sub">Draw Manager</div>
          </div>
        </div>
        <nav className="topnav-nav">
          {deferredPrompt && (
            <button className="nav-pill nav-install-btn" onClick={handleInstallClick}>
              <span className="hide-mob">⭐ Install </span>App
            </button>
          )}
          <button
            className={`nav-pill${view !== 'dashboard' ? ' active' : ''}`}
            onClick={handleHome}
          >
            <span className="hide-mob">New </span>Draw
          </button>
          <button
            className={`nav-pill${view === 'dashboard' ? ' active' : ''}`}
            onClick={handleDashboard}
          >
            History {history.filter(h => h && h.isArchived).length > 0 &&
              <span className="nav-count">{history.filter(h => h && h.isArchived).length}</span>}
          </button>
          <BackupSync history={history} onHistoryChange={handleHistoryChange} />
        </nav>
      </header>

      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard history={history} onRestore={handleRestore} onDelete={deleteEntry} onDeleteAll={deleteAll} />
        )}

        {view === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Setup
              onStart={handleStart}
              onGroupStart={handleGroupStart}
              onArchiveGroup={archiveEntry}
              onOpenGroup={(id, targetView = 'groups') => {
                const entry = history.find(e => e.id === id)
                if (entry) handleRestore(entry, entry.stage2 ? 'stage2' : targetView)
                else alert('Tournament data not found in history.')
              }}
              onOpenBracket={(id) => {
                const entry = history.find(e => e.id === id)
                if (entry) handleRestore(entry, 'bracket')
                else alert('Tournament data not found in history.')
              }}
              history={history}
            />
          </div>
        )}

        {view === 'bracket' && tournament && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tournament.bracket?.pendingByeSelection && (
              <ByeSelectionUI 
                bracket={tournament.bracket}
                advancers={tournament.bracket.pendingByeSelection}
                allPlayers={allAvailablePlayers}
                onConfirm={(actionPayload) => {
                  const rIdx = tournament.bracket.rounds.length > 0 ? tournament.bracket.rounds.length - 1 : 0
                  const nextBracket = advanceWinnerSingleElim(
                    tournament.bracket,
                    rIdx,
                    null, null,
                    actionPayload
                  )
                  handleBracketUpdate(nextBracket)
                }}
              />
            )}
            <BracketView 
              tournament={tournament} 
              onUpdate={handleBracketUpdate} 
              onReset={handleHome} 
              onAdvanceToStage2={handleAdvanceToStage2}
              hasStage2={!!(tournament?.stage2)}
              onGoToStage2={() => navigate('stage2', {
                tournament: tournament,
                groups: null,
                stage2: tournament?.stage2,
              })}
            />
          </div>
        )}

        {view === 'groups' && renderGroups && (
          <GroupView
            groups={renderGroups}
            onGroupsUpdate={handleGroupsUpdate}
            onBack={handleHome}
            onAdvanceToStage2={handleAdvanceToStage2}
            hasStage2={!!(tournament?.stage2)}
            onGoToStage2={() => navigate('stage2', {
              tournament: tournament,
              groups: renderGroups,
              stage2: tournament?.stage2,
            })}
          />
        )}

        {view === 'stage2' && renderStage2 && (
          <div>
            <div style={s2BannerStyle}>
              <span style={{ fontSize: 24 }}>🏆</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--gold-light)' }}>
                  Stage 2 — {renderStage2.type === 'groups' ? 'New Groups' : 'Knockout'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {renderStage2.players.length} players advancing
                </div>
              </div>
              <button
                onClick={() => window.history.back()}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'var(--muted)',
                  padding: '6px 14px', borderRadius: 8,
                  cursor: 'pointer', fontSize: 13,
                }}
              >🔙 Stage 1</button>
            </div>

            {renderStage2.type === 'groups' && renderStage2.groups && (
              <GroupView
                groups={renderStage2.groups}
                onGroupsUpdate={handleStage2GroupsUpdate}
                onBack={() => window.history.back()}
                onAdvanceToStage2={handleAdvanceToStage3}
                hasStage2={false}
              />
            )}

            {renderStage2.type === 'knockout' && renderStage2.bracket && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {renderStage2.bracket.pendingByeSelection && (
                  <ByeSelectionUI 
                    bracket={renderStage2.bracket}
                    advancers={renderStage2.bracket.pendingByeSelection}
                    allPlayers={allAvailablePlayers}
                    onConfirm={(actionPayload) => {
                      const rIdx = renderStage2.bracket.rounds.length > 0 ? renderStage2.bracket.rounds.length - 1 : 0
                      const nextBracket = advanceWinnerStage2Elim(
                        renderStage2.bracket,
                        rIdx,
                        null, null,
                        actionPayload
                      )
                      handleStage2BracketUpdate(nextBracket)
                    }}
                  />
                )}
                <BracketView
                  tournament={{
                    id: (tournament?.id || 'stage2') + '_s2',
                    format: 'stage2_elim',
                    players: renderStage2.players,
                    bracket: renderStage2.bracket,
                  }}
                  onUpdate={handleStage2BracketUpdate}
                  onReset={handleHome}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}