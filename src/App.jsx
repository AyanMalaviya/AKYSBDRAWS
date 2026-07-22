import React, { useState, useCallback, useEffect, useRef } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import GroupView from './components/GroupView.jsx'
import Dashboard from './components/Dashboard.jsx'
import Footer from './components/Footer.jsx'
import { generateBracket, generateStage2Elim, advanceWinnerStage2Elim } from './engine/bracketEngine.js'
import { generateGroups, reassignTagsByStandings } from './engine/groupEngine.js'
import { useHistory } from './hooks/useHistory.js'

// ── Navigation Stack ──────────────────────────────────────────────────────────
//
// We maintain our own in-memory stack of { view, tournament, groups, stage2 }
// frames. Every navigate() push appends a frame and calls window.history.pushState
// so the browser back button fires popstate. On popstate we pop our own stack
// instead of trying to reconstruct state from the History API state object.
//
// Rules:
//   • The stack ALWAYS has at least one frame (home). We never pop the last one
//     so the app never exits on back-swipe.
//   • navigate() clears frames above the current pointer when branching.
//   • handleHome() resets to a single home frame.
//   • Opening a tournament pushes frames for each stage it already has so that
//     back from stage2 lands on groups, and back from groups lands on home.
// ─────────────────────────────────────────────────────────────────────────────

const HOME_FRAME = { view: 'home', tournament: null, groups: null, stage2: null }

export default function App() {
  // Current rendered state
  const [view, setView]             = useState('home')
  const [tournament, setTournament] = useState(null)
  const [groups, setGroups]         = useState(null)
  const [stage2, setStage2]         = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  const { history, upsertHistory, deleteEntry, deleteAll, archiveEntry } = useHistory()

  // In-memory navigation stack
  const stackRef = useRef([HOME_FRAME])
  // Flag so popstate handler knows we triggered push ourselves
  const isPushingRef = useRef(false)

  // ── Apply a frame to React state ─────────────────────────────────────────
  const applyFrame = useCallback((frame) => {
    setView(frame.view)
    setTournament(frame.tournament)
    setGroups(frame.groups)
    setStage2(frame.stage2)
  }, [])

  // ── Push a new navigation frame ──────────────────────────────────────────
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

  // ── Initialise: seed browser history with one entry so first back is ours
  useEffect(() => {
    window.history.replaceState({ depth: 1 }, '')

    const handlePopState = () => {
      if (isPushingRef.current) return
      const stack = stackRef.current
      if (stack.length <= 1) {
        // Never exit — re-push so the browser thinks there is still something
        isPushingRef.current = true
        window.history.pushState({ depth: 1 }, '')
        isPushingRef.current = false
        return
      }
      // Pop our own stack
      stack.pop()
      const prev = stack[stack.length - 1]
      applyFrame(prev)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [applyFrame])

  // ── PWA install prompt ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  // ── Reset to home ────────────────────────────────────────────────────────
  const handleHome = useCallback(() => {
    stackRef.current = [HOME_FRAME]
    // Replace browser history so there are no stale entries
    window.history.replaceState({ depth: 1 }, '')
    applyFrame(HOME_FRAME)
  }, [applyFrame])

  // ── Bracket draw ─────────────────────────────────────────────────────────
  const handleStart = ({ format, players }) => {
    const t = {
      id: Date.now().toString(), format, players,
      bracket: generateBracket(format, players),
      isArchived: true,
    }
    upsertHistory(t)
    // home → bracket
    stackRef.current = [HOME_FRAME]
    navigate('bracket', { tournament: t, groups: null, stage2: null })
  }

  const handleBracketUpdate = useCallback((updatedBracket) => {
    setTournament(prev => {
      const isFinished = !!updatedBracket.champion
      const u = { ...prev, bracket: updatedBracket }
      if (isFinished) u.isArchived = true
      upsertHistory(u)
      // Update the current stack frame in place so back-swipe restores correctly
      const stack = stackRef.current
      if (stack.length > 0) stack[stack.length - 1] = { ...stack[stack.length - 1], tournament: u }
      return u
    })
  }, [upsertHistory])

  // ── Group draw ───────────────────────────────────────────────────────────
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
      // Patch every groups frame in the stack
      stackRef.current.forEach((f, i) => {
        if (f.view === 'groups') stackRef.current[i] = { ...f, groups: updatedGroups, tournament: u }
      })
      return u
    })
  }, [upsertHistory])

  // ── Stage 2 ──────────────────────────────────────────────────────────────
  const handleAdvanceToStage2 = useCallback((advancers, stage2Type = 'knockout') => {
    if (stage2Type === 'groups') {
      const seededAdvancers = reassignTagsByStandings(advancers)
      const groupSize = Math.max(3, Math.round(seededAdvancers.length / Math.max(2, Math.round(seededAdvancers.length / 4))))
      const newGroups = generateGroups(seededAdvancers, groupSize)
      const s2 = { type: 'groups', players: seededAdvancers, groups: newGroups, groupSize }
      setTournament(prev => {
        const u = { ...prev, stage2: s2, groups: newGroups }
        upsertHistory(u)
        stackRef.current.forEach((f, i) => {
          if (f.view === 'groups') stackRef.current[i] = { ...f, groups: newGroups, tournament: u }
        })
        return u
      })
      navigate('stage2', { groups: newGroups, stage2: s2 })
      return
    }

    const prevIds = tournament?.stage2?.players?.map(p => p.id).join(',') || ''
    const newIds  = advancers.map(p => p.id).join(',')
    if (tournament?.stage2 && tournament.stage2.type !== 'groups' && prevIds === newIds) {
      navigate('stage2', { tournament, groups, stage2: tournament.stage2 })
      return
    }

    const bracket = generateStage2Elim(advancers)
    const s2 = { type: 'knockout', players: advancers, bracket }
    setTournament(prev => {
      const u = { ...prev, stage2: s2 }
      upsertHistory(u)
      stackRef.current.forEach((f, i) => {
        if (f.view === 'groups') stackRef.current[i] = { ...f, tournament: u }
      })
      return u
    })
    navigate('stage2', { groups, stage2: s2 })
  }, [tournament, groups, upsertHistory, navigate])

  const handleStage2BracketUpdate = useCallback((updatedBracket) => {
    setStage2(prev => {
      const s2 = { ...prev, bracket: updatedBracket }
      setTournament(t => {
        const isFinished = !!updatedBracket.champion
        const u = { ...t, stage2: s2 }
        if (isFinished) u.isArchived = true
        upsertHistory(u)
        stackRef.current.forEach((f, i) => {
          if (f.view === 'stage2') stackRef.current[i] = { ...f, stage2: s2, tournament: u }
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
          if (f.view === 'stage2') stackRef.current[i] = { ...f, stage2: s2, groups: updatedGroups, tournament: u }
        })
        return u
      })
      return s2
    })
  }, [upsertHistory])

  const handleAdvanceToStage3 = useCallback((advancers, stage2Type = 'knockout') => {
    if (stage2Type === 'groups') {
      const seededAdvancers = reassignTagsByStandings(advancers)
      const groupSize = Math.max(3, Math.round(seededAdvancers.length / Math.max(2, Math.round(seededAdvancers.length / 4))))
      const newGroups = generateGroups(seededAdvancers, groupSize)
      const s3 = { type: 'groups', players: seededAdvancers, groups: newGroups, groupSize }
      setTournament(prev => {
        const u = { ...prev, stage2: s3, groups: newGroups }
        upsertHistory(u)
        return u
      })
      navigate('stage2', { groups: newGroups, stage2: s3 })
      return
    }
    const bracket = generateStage2Elim(advancers)
    const s3 = { type: 'knockout', players: advancers, bracket }
    setTournament(prev => {
      const u = { ...prev, stage2: s3 }
      upsertHistory(u)
      return u
    })
    navigate('stage2', { groups, stage2: s3 })
  }, [groups, upsertHistory, navigate])

  // ── Restore from History / Setup lobby ──────────────────────────────────
  //
  // When opening a tournament that already has stages, we push frames for
  // every stage so back-swipe traverses: stage2 → groups → home.
  //
  const handleRestore = useCallback((entry, targetView = 'groups') => {
    // Always start from a clean home base
    stackRef.current = [HOME_FRAME]
    window.history.replaceState({ depth: 1 }, '')

    if (entry.type === 'group') {
      const hasStage2  = !!(entry.stage2)
      const gGroups    = entry.groups || null
      const gStage2    = entry.stage2 || null

      // Push groups frame first
      const groupsFrame = { view: 'groups', tournament: entry, groups: gGroups, stage2: null }
      stackRef.current.push(groupsFrame)
      isPushingRef.current = true
      window.history.pushState({ depth: stackRef.current.length }, '')
      isPushingRef.current = false

      if (hasStage2 && targetView === 'stage2') {
        // Push stage2 frame on top
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
      // Plain bracket
      const bracketFrame = { view: 'bracket', tournament: entry, groups: null, stage2: null }
      stackRef.current.push(bracketFrame)
      isPushingRef.current = true
      window.history.pushState({ depth: stackRef.current.length }, '')
      isPushingRef.current = false
      applyFrame(bracketFrame)
    }
  }, [applyFrame])

  // ── Dashboard navigation (uses navigate so back works) ───────────────────
  const handleDashboard = useCallback(() => {
    navigate('dashboard', { tournament, groups, stage2 })
  }, [navigate, tournament, groups, stage2])

  // ─────────────────────────────────────────────────────────────────────────

  const s2BannerStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'linear-gradient(90deg, rgba(212,160,23,0.08), rgba(139,92,246,0.06))',
    border: '1px solid rgba(212,160,23,0.28)',
    borderRadius: 12, padding: '12px 20px', marginBottom: 16,
  }

  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-brand" onClick={handleHome}>
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
            History {history.filter(h => h.isArchived).length > 0 &&
              <span className="nav-count">{history.filter(h => h.isArchived).length}</span>}
          </button>
        </nav>
      </header>

      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard history={history} onRestore={handleRestore} onDelete={deleteEntry} onDeleteAll={deleteAll} />
        )}

        {view === 'home' && (
          <Setup
            onStart={handleStart}
            onGroupStart={handleGroupStart}
            onArchiveGroup={archiveEntry}
            onOpenGroup={(id, targetView = 'groups') => {
              const entry = history.find(e => e.id === id)
              if (entry) handleRestore(entry, targetView)
              else alert('Tournament data not found in history.')
            }}
            history={history}
          />
        )}

        {view === 'bracket' && tournament && (
          <BracketView tournament={tournament} onUpdate={handleBracketUpdate} onReset={handleHome} />
        )}

        {view === 'groups' && groups && (
          <GroupView
            groups={groups}
            onGroupsUpdate={handleGroupsUpdate}
            onBack={handleHome}
            onAdvanceToStage2={handleAdvanceToStage2}
            hasStage2={!!stage2}
          />
        )}

        {view === 'stage2' && stage2 && (
          <div>
            <div style={s2BannerStyle}>
              <span style={{ fontSize: 24 }}>🏆</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--gold-light)' }}>
                  Stage 2 — {stage2.type === 'groups' ? 'New Groups' : 'Knockout'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {stage2.players.length} players advancing
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

            {stage2.type === 'groups' && stage2.groups && (
              <GroupView
                groups={stage2.groups}
                onGroupsUpdate={handleStage2GroupsUpdate}
                onBack={() => window.history.back()}
                onAdvanceToStage2={handleAdvanceToStage3}
                hasStage2={false}
              />
            )}

            {stage2.type === 'knockout' && stage2.bracket && (
              <>
                {stage2.bracket.pendingByeSelection && (
                  <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-box">
                      <div className="modal-icon">⭐</div>
                      <div className="modal-msg" style={{ marginBottom: 16 }}>
                        <strong>Odd number of players!</strong><br /><br />
                        Select the highest scorer to receive a bye.
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {stage2.bracket.pendingByeSelection.map(p => (
                          <button key={p.id} className="btn btn-primary" onClick={() => {
                            handleStage2BracketUpdate(
                              advanceWinnerStage2Elim(stage2.bracket, stage2.bracket.rounds.length - 1, null, null, p.id)
                            )
                          }}>
                            Give Bye to {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <BracketView
                  tournament={{
                    id: (tournament?.id || 'stage2') + '_s2',
                    format: 'stage2_elim',
                    players: stage2.players,
                    bracket: stage2.bracket,
                  }}
                  onUpdate={handleStage2BracketUpdate}
                  onReset={handleHome}
                />
              </>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
