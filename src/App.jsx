import React, { useState, useCallback } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import Dashboard from './components/Dashboard.jsx'
import { generateBracket } from './engine/bracketEngine.js'
import { useHistory } from './hooks/useHistory.js'

export default function App() {
  const [view, setView] = useState('home')
  const [tournament, setTournament] = useState(null)
  const { history, upsertHistory, deleteEntry, deleteAll, restoreEntry } = useHistory()

  const handleStart = ({ format, players }) => {
    const t = {
      id: Date.now().toString(), // stable ID for this tournament session
      format,
      players,
      bracket: generateBracket(format, players),
    }
    setTournament(t)
    upsertHistory(t) // save once on creation
    setView('bracket')
  }

  const handleBracketUpdate = useCallback((updatedBracket) => {
    setTournament(prev => {
      const updated = { ...prev, bracket: updatedBracket }
      upsertHistory(updated) // upserts same entry, never duplicates
      return updated
    })
  }, [upsertHistory])

  const handleRestore = (entry) => {
    setTournament(restoreEntry(entry))
    setView('bracket')
  }

  const handleHome = () => { setTournament(null); setView('home') }

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
        {view !== 'dashboard' && !tournament && <Setup onStart={handleStart} />}
        {view === 'bracket' && tournament && (
          <BracketView tournament={tournament} onUpdate={handleBracketUpdate} onReset={handleHome} />
        )}
      </main>
    </div>
  )
}
