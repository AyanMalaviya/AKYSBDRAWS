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
  const [view, setView]             = useState('home')
  const [tournament, setTournament] = useState(null)
  const [groups, setGroups]         = useState(null)
  const { history, upsertHistory, deleteEntry, deleteAll, restoreEntry, archiveEntry } = useHistory()

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

  // ── History restore ──
  const handleRestore = (entry) => {
    setTournament(entry)
    if (entry.type === 'group') {
      setGroups(entry.groups)
      setView('groups')
    } else {
      setGroups(null)
      setView('bracket')
    }
  }

  const handleHome  = () => { setTournament(null); setGroups(null); setView('home') }

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
            History {history.filter(h => h.isArchived).length > 0 && <span className="nav-count">{history.filter(h => h.isArchived).length}</span>}
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
              if (entry) {
                handleRestore(entry)
              } else {
                alert("Tournament data not found in history. It may have been cleared.")
              }
            }}
            history={history}
          />
        )}
        {view === 'bracket' && tournament && (
          <BracketView tournament={tournament} onUpdate={handleBracketUpdate} onReset={handleHome} />
        )}
        {view === 'groups' && groups && (
          // Passing down handleHome to the integrated toolbar inside GroupView
          <GroupView groups={groups} onGroupsUpdate={handleGroupsUpdate} onBack={handleHome} />
        )}
      </main>
      <Footer />
    </div>
  )
}