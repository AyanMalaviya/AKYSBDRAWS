import React, { useState, useCallback, useEffect } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import GroupView from './components/GroupView.jsx'
import Dashboard from './components/Dashboard.jsx'
import Footer from './components/Footer.jsx'
import { generateBracket } from './engine/bracketEngine.js'
import { generateGroups } from './engine/groupEngine.js'
import { useHistory } from './hooks/useHistory.js'

export default function App() {
  const [view, setView]             = useState('home')
  const [tournament, setTournament] = useState(null)
  const [groups, setGroups]         = useState(null)
  // round2Players: confirmed advancers from Round 1 group stage
  const [round2Players, setRound2Players] = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const { history, upsertHistory, deleteEntry, deleteAll, restoreEntry, archiveEntry } = useHistory()

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

  // ── Bracket mode ──
  const handleStart = ({ format, players }) => {
    const t = {
      id: Date.now().toString(),
      format, players,
      bracket: generateBracket(format, players),
      isArchived: true
    }
    setTournament(t)
    upsertHistory(t)
    setGroups(null)
    setRound2Players(null)
    setView('bracket')
  }

  const handleBracketUpdate = useCallback((updatedBracket) => {
    setTournament(prev => {
      const updated = { ...prev, bracket: updatedBracket }
      upsertHistory(updated)
      return updated
    })
  }, [upsertHistory])

  // ── Group mode (Round 1) ──
  const handleGroupStart = ({ id, title, players, groupSize }) => {
    const g = generateGroups(players, groupSize)
    const t = {
      id: id || Date.now().toString(),
      type: 'group',
      title: title || 'Group Draw',
      players,
      groupSize,
      groups: g,
      isArchived: false
    }
    setTournament(t)
    setGroups(g)
    setRound2Players(null)
    upsertHistory(t)
    setView('groups')
  }

  const handleGroupsUpdate = useCallback((updatedGroups) => {
    setGroups(updatedGroups)
    setTournament(prev => {
      if (!prev) return prev
      const updated = { ...prev, groups: updatedGroups }
      upsertHistory(updated)
      return updated
    })
  }, [upsertHistory])

  // ── Advance to Round 2 ──
  // Called when user clicks "Round 2 →" after confirming advancers.
  // groupSize for R2 = ceil(advancers.length / ceil(advancers.length / 4))
  // (aim for groups of ~4, same engine)
  const handleAdvanceToRound2 = useCallback((advancers) => {
    const idealGroupSize = Math.max(3, Math.round(advancers.length / Math.max(1, Math.round(advancers.length / 4))))
    const r2Groups = generateGroups(advancers, idealGroupSize)
    setRound2Players(advancers)
    setGroups(r2Groups)
    setTournament(prev => {
      const updated = {
        ...prev,
        round: 2,
        round2Players: advancers,
        round2Groups: r2Groups,
      }
      upsertHistory(updated)
      return updated
    })
    setView('round2')
  }, [upsertHistory])

  // ── History restore ──
  const handleRestore = (entry) => {
    setTournament(entry)
    if (entry.type === 'group') {
      if (entry.round === 2 && entry.round2Groups) {
        setGroups(entry.round2Groups)
        setRound2Players(entry.round2Players || null)
        setView('round2')
      } else {
        setGroups(entry.groups)
        setRound2Players(null)
        setView('groups')
      }
    } else {
      setGroups(null)
      setRound2Players(null)
      setView('bracket')
    }
  }

  const handleGroupsUpdateRound2 = useCallback((updatedGroups) => {
    setGroups(updatedGroups)
    setTournament(prev => {
      if (!prev) return prev
      const updated = { ...prev, round2Groups: updatedGroups }
      upsertHistory(updated)
      return updated
    })
  }, [upsertHistory])

  const handleHome = () => {
    setTournament(null); setGroups(null); setRound2Players(null); setView('home')
  }

  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-brand" onClick={handleHome}>
          <img
            src="/AKYSBLogoCircle.png"
            alt="AKYSB Logo"
            style={{ height: 40, width: 40, borderRadius: '50%', boxShadow: '0 0 12px rgba(0,212,255,0.4)' }}
          />
          <div>
            <div className="brand-name">AKYSB <span className="brand-accent">DRAWS</span></div>
            <div className="brand-sub">Tournament Draw Manager</div>
          </div>
        </div>
        <nav className="topnav-nav">
          {deferredPrompt && (
            <button className="nav-pill nav-install-btn" onClick={handleInstallClick}>
              <span className="hide-mob">↓ Install </span>App
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
            onOpenGroup={(id) => {
              const entry = history.find(e => e.id === id)
              if (entry) handleRestore(entry)
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
            onAdvanceToRound2={handleAdvanceToRound2}
          />
        )}
        {view === 'round2' && groups && (
          <div>
            {/* Round 2 banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'linear-gradient(90deg, rgba(255,215,0,0.08), rgba(0,212,255,0.06))',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: 12, padding: '12px 20px', marginBottom: 8,
            }}>
              <span style={{ fontSize: 24 }}>🏅</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--neon-blue)' }}>Stage 2 — Round 2</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {round2Players?.length ?? groups.flatMap(g => g.players).length} players · new groups from Round 1 advancers
                </div>
              </div>
              <button
                onClick={() => { setView('groups'); /* go back to R1 view without resetting */ }}
                style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--muted)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
              >← Round 1</button>
            </div>
            <GroupView
              groups={groups}
              onGroupsUpdate={handleGroupsUpdateRound2}
              onBack={() => setView('groups')}
              onAdvanceToRound2={null} /* disable further advance for now */
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
