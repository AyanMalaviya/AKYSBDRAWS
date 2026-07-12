import React, { useState } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import { generateBracket } from './engine/bracketEngine.js'

export default function App() {
  const [tournament, setTournament] = useState(null)

  const handleStart = ({ format, players }) => {
    setTournament({ format, players, bracket: generateBracket(format, players) })
  }

  const handleBracketUpdate = (updatedBracket) => {
    setTournament(prev => ({ ...prev, bracket: updatedBracket }))
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>🏆 AKYSBDRAWS</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>Tournament Draw Manager</p>
        </div>
        {tournament && (
          <button className="btn btn-ghost" onClick={() => setTournament(null)}>← New Tournament</button>
        )}
      </div>
      {!tournament
        ? <Setup onStart={handleStart} />
        : <BracketView tournament={tournament} onUpdate={handleBracketUpdate} onReset={() => setTournament(null)} />}
    </div>
  )
}
