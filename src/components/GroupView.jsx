import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TAG_META } from '../engine/groupEngine.js'
import { recordGroupResult } from '../engine/groupEngine.js'

function MatchRow({ match, onResult }) {
  const isDone = !!match.winner
  return (
    <div className={`gm-row${isDone ? ' gm-done' : ''}`}>
      <button
        className={`gm-player${match.winner?.id === match.p1.id ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner?.id === match.p1.id ? null : match.p1)}
        title={`${match.p1.name} wins`}
      >
        {match.p1.name}
      </button>
      <span className="gm-vs">vs</span>
      <button
        className={`gm-player${match.winner?.id === match.p2.id ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner?.id === match.p2.id ? null : match.p2)}
        title={`${match.p2.name} wins`}
      >
        {match.p2.name}
      </button>
      <button
        className={`gm-draw${match.winner === 'draw' ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner === 'draw' ? null : 'draw')}
        title="Draw"
      >D</button>
    </div>
  )
}

function StandingsTable({ standings }) {
  return (
    <table className="gs-table">
      <thead>
        <tr>
          <th>#</th><th>Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => (
          <tr key={s.id} className={i === 0 ? 'gs-top' : ''}>
            <td>{i + 1}</td>
            <td>{s.name}</td>
            <td>{s.played}</td>
            <td>{s.wins}</td>
            <td>{s.draws}</td>
            <td>{s.losses}</td>
            <td><strong>{s.points}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GroupCard({ group, onUpdate }) {
  const [showStandings, setShowStandings] = useState(false)
  const meta = TAG_META[group.tag]
  const done = group.matches.filter(m => m.winner).length
  const total = group.matches.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const handleResult = (matchId, winner) => {
    onUpdate(group.id, matchId, winner)
  }

  return (
    <motion.div
      className="group-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ '--tag-color': meta.color, '--tag-glow': meta.glow }}
    >
      {/* Header */}
      <div className="gc-header">
        <div className="gc-title-row">
          <span className="gc-tag" style={{ background: meta.color }}>{group.tag}</span>
          <span className="gc-name">{group.name}</span>
          <span className="gc-count">{group.players.length} players</span>
        </div>
        <div className="gc-progress-bar">
          <div className="gc-progress-fill" style={{ width: `${pct}%`, background: meta.color }} />
        </div>
        <div className="gc-progress-label">{done}/{total} matches done</div>
      </div>

      {/* Matches */}
      <div className="gc-matches">
        {group.matches.map(m => (
          <MatchRow key={m.id} match={m} onResult={w => handleResult(m.id, w)} />
        ))}
      </div>

      {/* Standings toggle */}
      <button className="gc-standings-toggle" onClick={() => setShowStandings(s => !s)}>
        {showStandings ? '▲ Hide Standings' : '▼ Standings'}
      </button>
      <AnimatePresence>
        {showStandings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <StandingsTable standings={group.standings} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function GroupView({ groups, onGroupsUpdate }) {
  const handleUpdate = (groupId, matchId, winner) => {
    onGroupsUpdate(recordGroupResult(groups, groupId, matchId, winner))
  }

  // Separate by tag order
  const tagOrder = ['A', 'B', 'C']
  const byTag = tagOrder.map(tag => groups.filter(g => g.tag === tag)).filter(arr => arr.length > 0)

  return (
    <div className="group-view">
      {byTag.map((tagGroups, ti) => {
        const tag = tagGroups[0].tag
        const meta = TAG_META[tag]
        return (
          <div key={tag} className="tag-section">
            <div className="tag-section-header" style={{ color: meta.color, textShadow: `0 0 10px ${meta.glow}` }}>
              <span className="ts-badge" style={{ background: meta.color }}>Tier {tag}</span>
              <span className="ts-label">{meta.label} Players</span>
              <span className="ts-count">{tagGroups.length} group{tagGroups.length > 1 ? 's' : ''}</span>
            </div>
            <div className="tag-groups-grid">
              {tagGroups.map(g => (
                <GroupCard key={g.id} group={g} onUpdate={handleUpdate} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
