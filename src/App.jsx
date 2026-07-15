import React, { useState, useCallback, useEffect } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import GroupView from './components/GroupView.jsx'
import Dashboard from './components/Dashboard.jsx'
import Footer from './components/Footer.jsx'
import { generateBracket, generateSingleElim } from './engine/bracketEngine.js'
import { generateGroups } from './engine/groupEngine.js'
import { useHistory } from './hooks/useHistory.js'

export default function App() {
  const [view, setView]             = useState('home')
  const [tournament, setTournament] = useState(null)
  const [groups, setGroups]         = useState(null)
  const [stage2, setStage2]         = useState(null)   // { players, bracket }
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const { history, upsertHistory, deleteEntry, deleteAll, archiveEntry } = useHistory()

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
    const t = { id: Date.now().toString(), format, players, bracket: generateBracket(format, players), isArchived: true }
    setTournament(t); upsertHistory(t); setGroups(null); setStage2(null); setView('bracket')
  }
  const handleBracketUpdate = useCallback((updatedBracket) => {
    setTournament(prev => { const u = { ...prev, bracket: updatedBracket }; upsertHistory(u); return u })
  }, [upsertHistory])

  // ── Group mode ──
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

  // ── Advance group winners into a Stage 2 Single-Elimination bracket ──
  // advancers = one winner object per group, already enriched with W/D/L/pts from standings
  const handleAdvanceToStage2 = useCallback((advancers) => {
    const bracket = generateSingleElim(advancers)
    const s2 = { players: advancers, bracket }
    setStage2(s2)
    setTournament(prev => {
      const u = { ...prev, stage2: s2 }
      upsertHistory(u); return u
    })
    setView('stage2')
  }, [upsertHistory])

  const handleStage2BracketUpdate = useCallback((updatedBracket) => {
    setStage2(prev => {
      const s2 = { ...prev, bracket: updatedBracket }
      setTournament(t => {
        const u = { ...t, stage2: s2 }; upsertHistory(u); return u
      })
      return s2
    })
  }, [upsertHistory])

  // ── History restore ──
  const handleRestore = (entry) => {
    setTournament(entry)
    if (entry.type === 'group') {
      setGroups(entry.groups || null)
      if (entry.stage2) {
        setStage2(entry.stage2)
        // Restore to whichever view was last active — default to groups so
        // the user can see group results and navigate forward themselves
      }
      setView('groups')
    } else {
      setGroups(null); setStage2(null); setView('bracket')
    }
  }

  const handleHome = () => { setTournament(null); setGroups(null); setStage2(null); setView('home') }

  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-brand" onClick={handleHome}>
          <img src="/AKYSBLogoCircle.png" alt="AKYSB Logo"
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
            onAdvanceToStage2={handleAdvanceToStage2}
          />
        )}
        {view === 'stage2' && stage2 && (
          <div>
            {/* Stage 2 header banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'linear-gradient(90deg, rgba(255,215,0,0.08), rgba(0,212,255,0.06))',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: 12, padding: '12px 20px', marginBottom: 16,
            }}>
              <span style={{ fontSize: 24 }}>🏅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--neon-blue)' }}>Stage 2 — Knockout</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {stage2.players.length} players · single elimination · group winners only
                </div>
              </div>
              <button
                onClick={() => setView('groups')}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--muted)', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
              >← Stage 1 Groups</button>
            </div>

            {/* Reuse BracketView with a synthetic tournament object */}
            <BracketView
              tournament={{
                id: (tournament?.id || 'stage2') + '_s2',
                format: 'single_elim',
                players: stage2.players,
                bracket: stage2.bracket,
              }}
              onUpdate={handleStage2BracketUpdate}
              onReset={handleHome}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
