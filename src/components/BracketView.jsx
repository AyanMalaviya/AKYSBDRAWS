import React from 'react'
import { motion } from 'framer-motion'
import SingleElimBracket from './brackets/SingleElimBracket.jsx'
import DoubleElimBracket from './brackets/DoubleElimBracket.jsx'
import RoundRobinBracket from './brackets/RoundRobinBracket.jsx'
import SwissBracket from './brackets/SwissBracket.jsx'
import { FORMATS } from '../engine/bracketEngine.js'

export default function BracketView({ tournament, onUpdate }) {
  const { format, bracket } = tournament
  const fmt = FORMATS.find(f => f.id === format)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className={`tag ${fmt?.color}`}>{fmt?.tag}</span>
        <span style={{ fontWeight: 800, fontSize: 16 }}>{fmt?.label}</span>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>· {tournament.players.length} players</span>
        {bracket.champion && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{
              marginLeft: 'auto', background: 'rgba(255,180,0,0.15)', color: '#fbbf24',
              padding: '5px 16px', borderRadius: 99, fontSize: 13, fontWeight: 800,
              border: '1px solid rgba(255,180,0,0.35)',
              boxShadow: '0 0 16px rgba(255,180,0,0.2)'
            }}>
            🏆 {bracket.champion.name}
          </motion.span>
        )}
      </div>
      <div className="landscape-hint">↔️ Rotate to landscape for best bracket view</div>
      {format === 'single_elim' && <SingleElimBracket bracket={bracket} onUpdate={onUpdate} />}
      {format === 'double_elim' && <DoubleElimBracket bracket={bracket} onUpdate={onUpdate} />}
      {format === 'round_robin' && <RoundRobinBracket bracket={bracket} onUpdate={onUpdate} />}
      {format === 'swiss'       && <SwissBracket bracket={bracket} onUpdate={onUpdate} players={tournament.players} />}
    </motion.div>
  )
}
