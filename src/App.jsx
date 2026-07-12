import React, { useState, useCallback } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import GroupView from './components/GroupView.jsx'
import Dashboard from './components/Dashboard.jsx'
import Footer from './components/Footer.jsx'
import { generateBracket } from './engine/bracketEngine.js'
import { generateGroups } from './engine/groupEngine.js'
import { useHistory } from './hooks/useHistory.js'

export default function App() {
  const [view, setView]           = useState('home')
  const [tournament, setTournament] = useState(null)
  const [groups, setGroups]       = useState(null)   // group draw state
  const { history, upsertHistory, deleteEntry, deleteAll, restoreEntry } = useHistory()

  // ── Bracket mode ──
  const handleStart = ({ format, players }) => {
    const t = {
      id: Date.now().toString(),
      format, players,
      bracket: generateBracket(format, players),
    }
    setTournament(t)
    upsertHistory(t)
    setGroups(null)
    setView('bracket')
  }

  const handleBracketUpdate = useCallback((updatedBracket) => {
    setTournament(prev => {
      const updated = { ...prev, bracket: updatedBracket }
      upsertHistory(updated)
      return updated
    })
  }, [upsertHistory])

  // ── Group mode ──
  const handleGroupStart = ({ players, groupSize }) => {
    const g = generateGroups(players, groupSize)
    setGroups(g)
    setTournament(null)
    setView('groups')
  }

  const handleGroupsUpdate = useCallback((updatedGroups) => {
    setGroups(updatedGroups)
  }, [])

  // ── History restore ──
  const handleRestore = (entry) => {
    setTournament(restoreEntry(entry))
    setGroups(null)
    setView('bracket')
  }

  const handleHome = () => { setTournament(null); setGroups(null); setView('home') }

  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-brand" onClick={handleHome}>
          <span className="brand-trophy">🏆</span>
          <div>
            <div className="brand-name">AKYSB <span className="brand-accent">DRAWS</span></div>
            <div className="brand-sub">Tournament Draw Manager</div>
          </div>
        </div>
        <nav className="topnav-nav">
          <button className={`nav-pill${view !== 'dashboard' ? ' active' : ''}`} onClick={handleHome}>
            New Draw
          </button>
          <button className={`nav-pill${view === 'dashboard' ? ' active' : ''}`} onClick={() => setView('dashboard')}>
            History {history.length > 0 && <span className="nav-count">{history.length}</span>}
          </button>
        </nav>
      </header>

      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard history={history} onRestore={handleRestore} onDelete={deleteEntry} onDeleteAll={deleteAll} />
        )}
        {view === 'home' && <Setup onStart={handleStart} onGroupStart={handleGroupStart} />}
        {view === 'bracket' && tournament && (
          <BracketView tournament={tournament} onUpdate={handleBracketUpdate} onReset={handleHome} />
        )}
        {view === 'groups' && groups && (
          <GroupView groups={groups} onGroupsUpdate={handleGroupsUpdate} />
        )}
      </main>

      <Footer />
    </div>
  )
}
