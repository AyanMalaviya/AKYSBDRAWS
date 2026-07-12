import React from 'react'
import SingleElimBracket from './brackets/SingleElimBracket.jsx'
import DoubleElimBracket from './brackets/DoubleElimBracket.jsx'
import RoundRobinBracket from './brackets/RoundRobinBracket.jsx'
import SwissBracket from './brackets/SwissBracket.jsx'
import { FORMATS } from '../engine/bracketEngine.js'

export default function BracketView({ tournament, onUpdate }) {
  const { format, bracket } = tournament
  const fmt = FORMATS.find(f => f.id === format)

  return (
    <div>
      {/* Bracket header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span className={`tag ${fmt?.color}`}>{fmt?.tag}</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{fmt?.label}</span>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>· {tournament.players.length} players</span>
        {bracket.champion && (
          <span style={{
            marginLeft: 'auto', background: '#854d0e', color: '#fef08a',
            padding: '4px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700
          }}>🏆 {bracket.champion.name}</span>
        )}
      </div>

      {/* Landscape scroll hint on portrait mobile */}
      <div className="landscape-hint">
        ↔ Rotate to landscape for best view
      </div>

      {format === 'single_elim' && <SingleElimBracket bracket={bracket} onUpdate={onUpdate} />}
      {format === 'double_elim' && <DoubleElimBracket bracket={bracket} onUpdate={onUpdate} />}
      {format === 'round_robin' && <RoundRobinBracket bracket={bracket} onUpdate={onUpdate} />}
      {format === 'swiss'       && <SwissBracket bracket={bracket} onUpdate={onUpdate} players={tournament.players} />}
    </div>
  )
}
