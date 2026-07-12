import React, { useState } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import Dashboard from './components/Dashboard.jsx'
import { generateBracket } from './engine/bracketEngine.js'
import { useHistory } from './hooks/useHistory.js'

export default function App() {
  const [view, setView] = useState('home') // 'home' | 'bracket' | 'dashboard'
  const [tournament, setTournament] = useState(null)
  const { history, saveToHistory, deleteEntry, deleteAll, restoreEntry } = useHistory()

  const handleStart = ({ format, players }) => {
    setTournament({ format, players, bracket: generateBracket(format, players) })
    setView('bracket')
  }

  const handleBracketUpdate = (updatedBracket) => {
    setTournament(prev => {
      const updated = { ...prev, bracket: updatedBracket }
      saveToHistory(updated) // auto-save on every update
      return updated
    })
  }

  const handleRestore = (entry) => {
    setTournament(restoreEntry(entry))
    setView('bracket')
  }

  const handleHome = () => {
    setTournament(null)
    setView('home')
  }

  return (
    <div className="app-shell">
      {/* ── Top Nav ── */}
      <header className="topnav">
        <div className="topnav-left" onClick={handleHome} style={{ cursor: 'pointer' }}>
          <span className="topnav-logo">🏆</span>
          <span className="topnav-title">AKYSBDRAWS</span>
          <span className="topnav-sub">Tournament Draw</span>
        </div>
        <nav className="topnav-right">
          <button
            className={`nav-btn ${view === 'home' || view === 'bracket' ? 'nav-btn-active' : ''}`}
            onClick={handleHome}
          >New Draw</button>
          <button
            className={`nav-btn ${view === 'dashboard' ? 'nav-btn-active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            History
            {history.length > 0 && <span className="nav-badge">{history.length}</span>}
          </button>
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard
            history={history}
            onRestore={handleRestore}
            onDelete={deleteEntry}
            onDeleteAll={deleteAll}
          />
        )}
        {(view === 'home' || view === 'bracket') && !tournament && (
          <Setup onStart={handleStart} />
        )}
        {view === 'bracket' && tournament && (
          <BracketView
            tournament={tournament}
            onUpdate={handleBracketUpdate}
            onReset={handleHome}
          />
        )}
      </main>
    </div>
  )
}
