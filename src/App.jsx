import React, { useState, useCallback, useEffect } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import GroupView from './components/GroupView.jsx'
import Dashboard from './components/Dashboard.jsx'
import Footer from './components/Footer.jsx'
import { generateBracket, generateStage2Elim, advanceWinnerStage2Elim } from './engine/bracketEngine.js'
import { generateGroups, reassignTagsByStandings } from './engine/groupEngine.js'
import { useHistory } from './hooks/useHistory.js'

export default function App() {
  const [view, setView]             = useState('home')
  const [tournament, setTournament] = useState(null)
  const [groups, setGroups]         = useState(null)
  const [stage2, setStage2]         = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const { history, upsertHistory, deleteEntry, deleteAll, archiveEntry } = useHistory()

  useEffect(() => {
    window.history.replaceState({ view: 'home' }, '')
    const handlePopState = (e) => {
      if (e.state && e.state.view) setView(e.state.view)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((newView) => {
    window.history.pushState({ view: newView }, '')
    setView(newView)
  }, [])

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

  const handleStart = ({ format, players }) => {
    const t = { id: Date.now().toString(), format, players, bracket: generateBracket(format, players), isArchived: true }
    setTournament(t); upsertHistory(t); setGroups(null); setStage2(null); setView('bracket')
  }

  const handleBracketUpdate = useCallback((updatedBracket) => {
    setTournament(prev => {
      const isFinished = !!updatedBracket.champion
      const u = { ...prev, bracket: updatedBracket }
      if (isFinished) u.isArchived = true
      upsertHistory(u)
      return u
    })
  }, [upsertHistory])

  const handleGroupStart = ({ id, title, players, groupSize }) => {
    const g = generateGroups(players, groupSize)
    const t = { id: id || Date.now().toString(), type: 'group', title: title || 'Group Draw', players, groupSize, groups: g, isArchived: false }
    setTournament(t); setGroups(g); setStage2(null); upsertHistory(t); setView('groups')
  }

  const handleGroupsUpdate = useCallback((updatedGroups) => {
    setGroups(updatedGroups)
    setTournament(prev => {
      if (!prev) return prev
      const u = { ...prev, groups: updatedGroups }; upsertHistory(u); return u
    })
  }, [upsertHistory])

  /**
   * Called by GroupView when user clicks "Proceed to Stage 2".
   * stage2Type: 'knockout' | 'groups'
   */
  const handleAdvanceToStage2 = useCallback((advancers, stage2Type = 'knockout') => {
    if (stage2Type === 'groups') {
      // Reassign A/B/C tags based on stage-1 performance before the new draw.
      // This ensures A players are seeded into different groups (A never vs A).
      const seededAdvancers = reassignTagsByStandings(advancers)
      const groupSize = Math.max(3, Math.round(seededAdvancers.length / Math.max(2, Math.round(seededAdvancers.length / 4))))
      const newGroups = generateGroups(seededAdvancers, groupSize)
      const s2 = { type: 'groups', players: seededAdvancers, groups: newGroups, groupSize }

      setStage2(s2)
      setGroups(newGroups)
      setTournament(prev => {
        const u = { ...prev, stage2: s2, groups: newGroups }
        upsertHistory(u)
        return u
      })
      navigate('stage2')
      return
    }

    // --- Knockout path ---
    const prevIds = tournament?.stage2?.players?.map(p => p.id).join(',') || ''
    const newIds  = advancers.map(p => p.id).join(',')

    if (tournament?.stage2 && tournament.stage2.type !== 'groups' && prevIds === newIds) {
      setStage2(tournament.stage2)
      setView('stage2')
      return
    }

    const bracket = generateStage2Elim(advancers)
    const s2 = { type: 'knockout', players: advancers, bracket }
    setStage2(s2)
    setTournament(prev => {
      const u = { ...prev, stage2: s2 }; upsertHistory(u); return u
    })
    navigate('stage2')
  }, [tournament, upsertHistory, navigate])

  const handleStage2BracketUpdate = useCallback((updatedBracket) => {
    setStage2(prev => {
      const s2 = { ...prev, bracket: updatedBracket }
      setTournament(t => {
        const isFinished = !!updatedBracket.champion
        const u = { ...t, stage2: s2 }
        if (isFinished) u.isArchived = true
        upsertHistory(u)
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
        const u = { ...t, stage2: s2 }; upsertHistory(u); return u
      })
      return s2
    })
  }, [upsertHistory])

  /** Stage 2 groups → Stage 3: same tag-reassignment logic applied again */
  const handleAdvanceToStage3 = useCallback((advancers, stage2Type = 'knockout') => {
    if (stage2Type === 'groups') {
      const seededAdvancers = reassignTagsByStandings(advancers)
      const groupSize = Math.max(3, Math.round(seededAdvancers.length / Math.max(2, Math.round(seededAdvancers.length / 4))))
      const newGroups = generateGroups(seededAdvancers, groupSize)
      const s3 = { type: 'groups', players: seededAdvancers, groups: newGroups, groupSize }
      setStage2(s3)
      setGroups(newGroups)
      setTournament(prev => { const u = { ...prev, stage2: s3, groups: newGroups }; upsertHistory(u); return u })
      navigate('stage2')
      return
    }
    const bracket = generateStage2Elim(advancers)
    const s3 = { type: 'knockout', players: advancers, bracket }
    setStage2(s3)
    setTournament(prev => { const u = { ...prev, stage2: s3 }; upsertHistory(u); return u })
    navigate('stage2')
  }, [upsertHistory, navigate])

  const handleRestore = (entry, targetView = 'groups') => {
    setTournament(entry)
    if (entry.type === 'group') {
      setGroups(entry.groups || null)
      setStage2(entry.stage2 || null)
      navigate((targetView === 'stage2' && entry.stage2) ? 'stage2' : 'groups')
    } else {
      setGroups(null); setStage2(null); navigate('bracket')
    }
  }

  const handleHome = () => { setTournament(null); setGroups(null); setStage2(null); navigate('home') }

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
          <img src="/AKYSBLogoCircle.png" alt="AKYSB Logo"
            style={{ height: 40, width: 40, borderRadius: '50%', boxShadow: '0 0 12px rgba(139,92,246,0.4)' }}
          />
          <div>
            <div className="brand-name">AKYSB <span className="brand-accent">DRAWS</span></div>
            <div className="brand-sub">Tournament Draw Manager</div>
          </div>
        </div>
        <nav className="topnav-nav">
          {deferredPrompt && (
            <button className="nav-pill nav-install-btn" onClick={handleInstallClick}>
              <span className="hide-mob">⭐ Install </span>App
            </button>
          )}
          <button className={`nav-pill${view !== 'dashboard' ? ' active' : ''}`} onClick={handleHome}>
            <span className="hide-mob">New </span>Draw
          </button>
          <button className={`nav-pill${view === 'dashboard' ? ' active' : ''}`} onClick={() => setView('dashboard')}>
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
                onClick={() => setView('groups')}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--muted)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
              >🔙 Stage 1</button>
            </div>

            {stage2.type === 'groups' && stage2.groups && (
              <GroupView
                groups={stage2.groups}
                onGroupsUpdate={handleStage2GroupsUpdate}
                onBack={() => setView('groups')}
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
