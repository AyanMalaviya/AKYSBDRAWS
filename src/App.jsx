import React, { useState, useCallback, useEffect, useRef } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import GroupView from './components/GroupView.jsx'
import Dashboard from './components/Dashboard.jsx'
import Footer from './components/Footer.jsx'
import { generateBracket, generateStage2Elim, advanceWinnerStage2Elim } from './engine/bracketEngine.js'
import BackupSync from './components/BackupSync.jsx'
import { generateGroups, reassignTagsByStandings } from './engine/groupEngine.js'
import { useHistory } from './hooks/useHistory.js'

const HOME_FRAME = { view: 'home', tournament: null, groups: null, stage2: null }

function pickByePlayer(players) {
  if (!players || players.length === 0) return null
  return [...players].sort((a, b) =>
    ((b.wins      ?? 0)         - (a.wins      ?? 0))         ||
    ((b.scoreDiff ?? b.sd ?? 0) - (a.scoreDiff ?? a.sd ?? 0)) ||
    ((b.points    ?? 0)         - (a.points    ?? 0))         ||
    ((b.scoredFor ?? b.gf ?? 0) - (a.scoredFor ?? a.gf ?? 0)) ||
    (a.name ?? '').localeCompare(b.name ?? '')
  )[0]
}

function seedKnockoutPlayers(players) {
  const As = players.filter(p => p.tag === 'A')
  const Bs = players.filter(p => p.tag === 'B')
  const Cs = players.filter(p => p.tag === 'C')
  const Ds = players.filter(p => !['A', 'B', 'C'].includes(p.tag))

  const seeded = []

  while (As.length > 0 && Cs.length > 0) {
    seeded.push(As.shift(), Cs.shift())
  }

  while (As.length > 0 && Bs.length > 0) {
    seeded.push(As.shift(), Bs.shift())
  }

  while (Cs.length > 0 && Bs.length > 0) {
    seeded.push(Cs.shift(), Bs.shift())
  }

  while (Bs.length >= 2) {
    seeded.push(Bs.shift(), Bs.shift())
  }

  while (As.length > 0 && Ds.length > 0) {
    seeded.push(As.shift(), Ds.shift())
  }
  while (Bs.length > 0 && Ds.length > 0) {
    seeded.push(Bs.shift(), Ds.shift())
  }
  while (Cs.length > 0 && Ds.length > 0) {
    seeded.push(Cs.shift(), Ds.shift())
  }

  seeded.push(...As, ...Bs, ...Cs, ...Ds)

  return seeded
}

export default function App() {
  const [view, setView]             = useState('home')
  const [tournament, setTournament] = useState(null)
  const [groups, setGroups]         = useState(null)
  const [stage2, setStage2]         = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  const { history, isLoaded, upsertHistory, deleteEntry, deleteAll, archiveEntry, syncHistory } = useHistory()

  const stackRef = useRef([HOME_FRAME])
  const isPushingRef = useRef(false)

  const tournamentRef = useRef(tournament)
  const groupsRef     = useRef(groups)
  useEffect(() => { tournamentRef.current = tournament }, [tournament])
  useEffect(() => { groupsRef.current = groups }, [groups])

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
      const prev = stack[stack.length - 1]
      applyFrame(prev)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [applyFrame])

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // --- NEW: SESSION RECOVERY & TRACKING ---
  const hasRestoredRef = useRef(false)
  
  // 1. Recover active screen if page is refreshed or tab is reopened
  useEffect(() => {
    if (!isLoaded || hasRestoredRef.current) return
    hasRestoredRef.current = true

    const sessionStr = localStorage.getItem('akysb_active_session')
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        const entryState = history.find(e => e.id === session.tournamentId)
        
        if (entryState) {
          stackRef.current = [HOME_FRAME]
          const targetFrame = {
            view: session.view,
            tournament: entryState,
            groups: entryState.groups || null,
            stage2: entryState.stage2 || null
          }
          stackRef.current.push(targetFrame)
          window.history.replaceState({ depth: stackRef.current.length }, '')
          applyFrame(targetFrame)
        }
      } catch (e) {}
    }
  }, [isLoaded, history, applyFrame])

  // 2. Track the active screen in memory on every navigation
  useEffect(() => {
    if (view === 'home' || view === 'dashboard') {
      localStorage.removeItem('akysb_active_session')
    } else if (tournament?.id) {
      localStorage.setItem('akysb_active_session', JSON.stringify({
        view: view,
        tournamentId: tournament.id
      }))
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

  const handleStart = ({ format, players }) => {
    const t = {
      id: Date.now().toString(), format, players,
      bracket: generateBracket(format, players),
      isArchived: true,
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
      
      stackRef.current.forEach((f, i) => {
        stackRef.current[i] = { ...f, tournament: u }
      })
      
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
        // FIX: Sync tournament state across the entire stack
        stackRef.current[i] = { ...f, tournament: u }
        if (f.view === 'groups') stackRef.current[i].groups = updatedGroups
      })
      return u
    })
  }, [upsertHistory])

  const handleAdvanceToStage2 = useCallback((advancers, stage2Type = 'knockout') => {
    const currentTournament = tournamentRef.current
    const currentGroups     = groupsRef.current

    // Rank 0 = A, Rank 1 = B, Rank 2 = C, Others = D
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

    // --- NEW LOGIC FOR KNOCKOUT BYES ---
    let playersToSeed = [...taggedAdvancers]
    let round1ByePlayer = null

    // If there is an odd number of players, extract the absolute best player for the bye
    if (playersToSeed.length % 2 !== 0) {
      round1ByePlayer = pickByePlayer(playersToSeed)
      playersToSeed = playersToSeed.filter(p => p.id !== round1ByePlayer.id)
    }

    // Seed the remaining players normally (A vs C, B vs B)
    const seededKnockout = seedKnockoutPlayers(playersToSeed)

    // Push the best player to the very end so the bracket engine pairs them with 'null'
    if (round1ByePlayer) {
      seededKnockout.push(round1ByePlayer)
    }

    let bracket = generateStage2Elim(seededKnockout)
    // -----------------------------------

    if (bracket.pendingByeSelection) {
      const byePlayer = pickByePlayer(bracket.pendingByeSelection)
      if (byePlayer) {
        bracket = advanceWinnerStage2Elim(bracket, bracket.rounds.length - 1, null, null, byePlayer.id)
      }
    }

    const s2 = { type: 'knockout', players: seededKnockout, bracket }
    setTournament(prev => {
      const u = { ...prev, stage2: s2 }
      upsertHistory(u)
      stackRef.current.forEach((f, i) => {
        stackRef.current[i] = { ...f, tournament: u }
      })
      return u
    })
    navigate('stage2', { groups: currentGroups, stage2: s2 })
  }, [upsertHistory, navigate])

  const handleStage2BracketUpdate = useCallback((updatedBracket) => {
    let resolvedBracket = updatedBracket
    if (resolvedBracket.pendingByeSelection) {
      const byePlayer = pickByePlayer(resolvedBracket.pendingByeSelection)
      if (byePlayer) {
        resolvedBracket = advanceWinnerStage2Elim(
          resolvedBracket,
          resolvedBracket.rounds.length - 1,
          null, null,
          byePlayer.id
        )
      }
    }
    setStage2(prev => {
      const s2 = { ...prev, bracket: resolvedBracket }
      setTournament(t => {
        const isFinished = !!resolvedBracket.champion
        const u = { ...t, stage2: s2 }
        if (isFinished) u.isArchived = true
        upsertHistory(u)
        stackRef.current.forEach((f, i) => {
          // FIX: Sync tournament state across the entire stack
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
          // FIX: Sync tournament state across the entire stack
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

    // Rank 0 = A, Rank 1 = B, Rank 2 = C, Others = D
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
        stackRef.current.forEach((f, i) => {
          stackRef.current[i] = { ...f, tournament: u }
        })
        return u
      })
      navigate('stage2', { groups: newGroups, stage2: s3 })
      return
    }

    // --- NEW LOGIC FOR KNOCKOUT BYES ---
    let playersToSeed = [...taggedAdvancers]
    let round1ByePlayer = null

    // If there is an odd number of players, extract the absolute best player for the bye
    if (playersToSeed.length % 2 !== 0) {
      round1ByePlayer = pickByePlayer(playersToSeed)
      playersToSeed = playersToSeed.filter(p => p.id !== round1ByePlayer.id)
    }

    // Seed the remaining players normally (A vs C, B vs B)
    const seededKnockout = seedKnockoutPlayers(playersToSeed)

    // Push the best player to the very end so the bracket engine pairs them with 'null'
    if (round1ByePlayer) {
      seededKnockout.push(round1ByePlayer)
    }

    let bracket = generateStage2Elim(seededKnockout)
    // -----------------------------------
    
    if (bracket.pendingByeSelection) {
      const byePlayer = pickByePlayer(bracket.pendingByeSelection)
      if (byePlayer) bracket = advanceWinnerStage2Elim(bracket, bracket.rounds.length - 1, null, null, byePlayer.id)
    }
    const s3 = { type: 'knockout', players: seededKnockout, bracket }
    
    setTournament(prev => {
      const u = { ...prev, stage2: s3 }
      upsertHistory(u)
      stackRef.current.forEach((f, i) => {
        stackRef.current[i] = { ...f, tournament: u }
      })
      return u
    })
    navigate('stage2', { groups: currentGroups, stage2: s3 })
  }, [upsertHistory, navigate])

  const handleRestore = useCallback((entry, targetView = 'groups') => {
    stackRef.current = [HOME_FRAME]
    window.history.replaceState({ depth: 1 }, '')

    if (entry.type === 'group') {
      const hasStage2  = !!(entry.stage2)
      const gGroups    = entry.groups || null
      const gStage2    = entry.stage2 || null

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
    if (typeof syncHistory === 'function') {
      syncHistory(merged)
    }

    setTournament(prev => {
      if (!prev) return prev
      const incoming = merged.find(t => t.id === prev.id)
      
      if (incoming) {
        if (incoming.groups) setGroups(incoming.groups)
        if (incoming.stage2) setStage2(incoming.stage2)
        
        stackRef.current.forEach((f, i) => {
          if (f.tournament?.id === incoming.id) {
            stackRef.current[i] = {
              ...f,
              tournament: incoming,
              groups: incoming.groups || f.groups,
              stage2: incoming.stage2 || f.stage2
            }
          }
        })
        return incoming
      }
      return prev
    })
  }, [syncHistory])


  const topFrame      = stackRef.current[stackRef.current.length - 1]
  const renderGroups  = topFrame?.view === 'groups'  ? (topFrame.groups  ?? groups)  : groups
  const renderStage2  = topFrame?.view === 'stage2'  ? (topFrame.stage2  ?? stage2)  : stage2

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
            onClick={handleLogoClick}
          >
            <span className="hide-mob">New </span>Draw
          </button>
          <button
            className={`nav-pill${view === 'dashboard' ? ' active' : ''}`}
            onClick={handleDashboard}
          >
            History {history.filter(h => h.isArchived).length > 0 &&
              <span className="nav-count">{history.filter(h => h.isArchived).length}</span>}
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
              history={history}
            />
          </div>
        )}

        {view === 'bracket' && tournament && (
          <BracketView tournament={tournament} onUpdate={handleBracketUpdate} onReset={handleHome} />
        )}

        {view === 'groups' && renderGroups && (
          <GroupView
            groups={renderGroups}
            onGroupsUpdate={handleGroupsUpdate}
            onBack={handleLogoClick}
            onAdvanceToStage2={handleAdvanceToStage2}
            hasStage2={!!(tournament?.stage2)}
            onGoToStage2={() => navigate('stage2', { 
              tournament: tournament, 
              groups: renderGroups, 
              stage2: tournament?.stage2 
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
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
