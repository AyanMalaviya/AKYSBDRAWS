import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TAG_META, 
  recordGroupResult, 
  getGroupWinner,
  renameGroup,
  addPlayerToGroup,
  removePlayerFromGroup,
  movePlayerBetweenGroups,
  updatePlayerProps,
  createNewGroup
} from '../engine/groupEngine.js'

function MatchRow({ match, onResult }) {
  const isDone = !!match.winner
  return (
    <div className={`gm-row${isDone ? ' gm-done' : ''}`}>
      <button
        className={`gm-player${match.winner?.id === match.p1.id ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner?.id === match.p1.id ? null : match.p1)}
      >
        <span className={`tag-dot`} style={{ background: TAG_META[match.p1.tag || 'C'].color, width: 8, height: 8, borderRadius: 4, display: 'inline-block', marginRight: 6 }}></span>
        {match.p1.name}
      </button>
      <span className="gm-vs">vs</span>
      <button
        className={`gm-player${match.winner?.id === match.p2.id ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner?.id === match.p2.id ? null : match.p2)}
      >
        <span className={`tag-dot`} style={{ background: TAG_META[match.p2.tag || 'C'].color, width: 8, height: 8, borderRadius: 4, display: 'inline-block', marginRight: 6 }}></span>
        {match.p2.name}
      </button>
      <button
        className={`gm-draw${match.winner === 'draw' ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner === 'draw' ? null : 'draw')}
      >D</button>
    </div>
  )
}

function StandingsTable({ standings, winnerId }) {
  return (
    <table className="gs-table">
      <thead><tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead>
      <tbody>
        {standings.map((s, i) => (
          <tr key={s.id} className={[i === 0 ? 'gs-top' : '', s.id === winnerId ? 'gs-winner' : ''].filter(Boolean).join(' ')}>
            <td>{i + 1}</td>
            <td>
              {s.id === winnerId && <span className="gs-crown" title="Group Winner">👑 </span>}
              <span style={{ color: TAG_META[s.tag || 'C'].color, fontWeight: 900, marginRight: 6 }}>{s.tag}</span>
              {s.name}
            </td>
            <td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td>
            <td><strong>{s.points}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GroupCard({ group, allGroups, onUpdate, isEditing, onEditAction }) {
  const [showStandings, setShowStandings] = useState(false)
  const done = group.matches.filter(m => m.winner).length
  const total = group.matches.length
  const pct = total ? Math.round((done / total) * 100) : 0
  const allDone = done === total && total > 0
  const winner = getGroupWinner(group)

  return (
    <motion.div className={`group-card${allDone && !isEditing ? ' group-card--done' : ''}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      
      <div className="gc-header">
        {isEditing ? (
          <input 
            value={group.name} 
            onChange={(e) => onEditAction('rename_group', group.id, null, e.target.value)}
            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--neon-blue)', padding: '8px 12px', borderRadius: '6px', fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}
          />
        ) : (
          <div className="gc-title-row">
            <span className="gc-name" style={{ color: 'var(--neon-blue)' }}>{group.name}</span>
            <span className="gc-count">{group.players.length} players</span>
          </div>
        )}

        {!isEditing && (
          <>
            <div className="gc-progress-bar">
              <div className="gc-progress-fill" style={{ width: `${pct}%`, background: 'var(--neon-blue)' }} />
            </div>
            <div className="gc-progress-label">{done}/{total} matches done</div>
          </>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
          {group.players.map(p => (
            <div key={p.id} style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              
              {/* 1. Name Field: Forced to take max width */}
              <input 
                value={p.name} 
                onChange={(e) => onEditAction('update_player', group.id, p.id, { name: e.target.value })}
                placeholder="Player Name"
                style={{ flex: '1 1 100%', minWidth: '80px', background: 'none', border: 'none', color: 'var(--text)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '6px', fontSize: '14px', outline: 'none' }}
              />

              {/* 2. Tag Dropdown: Fixed small width */}
              <select 
                value={p.tag} 
                onChange={(e) => onEditAction('update_player', group.id, p.id, { tag: e.target.value })}
                style={{ flexShrink: 0, width: '48px', background: 'var(--bg-dark)', border: `1px solid ${TAG_META[p.tag || 'C'].color}`, color: TAG_META[p.tag || 'C'].color, padding: '6px 4px', borderRadius: '6px', fontWeight: 'bold', outline: 'none', textAlign: 'center', cursor: 'pointer' }}>
                <option value="A">A</option><option value="B">B</option><option value="C">C</option>
              </select>
              
              {/* 3. Group Movement Dropdown: Fixed medium width */}
              <select 
                value={group.id} 
                onChange={(e) => onEditAction('move_player', group.id, p.id, e.target.value)}
                style={{ flexShrink: 0, width: '90px', background: 'var(--bg-dark)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', padding: '6px', borderRadius: '6px', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                {allGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              
              {/* 4. Delete Button */}
              <button 
                onClick={() => onEditAction('remove_player', group.id, p.id)}
                title="Remove Player"
                style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', padding: '6px', fontSize: 16, display: 'flex', alignItems: 'center' }}>
                ✕
              </button>
            </div>
          ))}
          <button 
            onClick={() => onEditAction('add_player', group.id)}
            style={{ marginTop: 12, background: 'rgba(0,212,255,0.05)', border: '1px dashed rgba(0,212,255,0.3)', color: 'var(--neon-blue)', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', transition: 'background 0.2s' }}>
            + Add Player to {group.name}
          </button>
        </div>
      ) : (
        <>
          {allDone && winner && (
            <motion.div className="gc-winner-banner" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <span className="gc-winner-icon">👑</span>
              <div>
                <div className="gc-winner-label">Group Winner</div>
                <div className="gc-winner-name">{winner.name}</div>
                <div className="gc-winner-stats">{winner.wins}W · {winner.draws}D · {winner.losses}L · {winner.points}pts</div>
              </div>
            </motion.div>
          )}

          <div className="gc-matches">
            {group.matches.map(m => (
              <MatchRow key={m.id} match={m} onResult={w => onUpdate(group.id, m.id, w)} />
            ))}
          </div>

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
                <StandingsTable standings={group.standings} winnerId={allDone && winner ? winner.id : null} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}

export default function GroupView({ groups, onGroupsUpdate, onBack }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftGroups, setDraftGroups] = useState(null)

  // Determines if UI reads from active state or draft state
  const activeGroups = isEditing && draftGroups ? draftGroups : groups;

  const handleStartEdit = () => {
    // Deep clone the groups array for our Sandbox Draft Mode
    setDraftGroups(JSON.parse(JSON.stringify(groups)))
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    onGroupsUpdate(draftGroups) // Pushes to App.jsx to save to LocalStorage and triggers Re-Render
    setIsEditing(false)
    setDraftGroups(null)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setDraftGroups(null)
  }

  const handleUpdateMatch = (groupId, matchId, winner) => {
    onGroupsUpdate(recordGroupResult(groups, groupId, matchId, winner))
  }

  const handleEditAction = (action, groupId, playerId, payload) => {
    let next = draftGroups
    if (action === 'rename_group')  next = renameGroup(next, groupId, payload)
    if (action === 'add_player')    next = addPlayerToGroup(next, groupId)
    if (action === 'remove_player') next = removePlayerFromGroup(next, groupId, playerId)
    if (action === 'update_player') next = updatePlayerProps(next, groupId, playerId, payload)
    if (action === 'move_player')   next = movePlayerBetweenGroups(next, groupId, payload, playerId)
    setDraftGroups(next) // Update local draft state only!
  }

  const handleCreateGroup = () => {
    setDraftGroups(createNewGroup(draftGroups))
  }

  const allGroupsDone = !isEditing && groups.every(g => g.matches.every(m => m.winner !== null) && g.matches.length > 0)
  const groupWinners = !isEditing ? groups.map(g => getGroupWinner(g)).filter(Boolean) : []

  return (
    <div className="group-view" style={{ paddingTop: 10 }}>
      {/* Dynamic Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border2)' }}>
        
        {!isEditing ? (
          <>
            <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ padding: '8px 16px' }}>
              ← Back to Setup
            </button>
            <button 
              onClick={handleStartEdit} 
              className="btn btn-sm"
              style={{ padding: '8px 16px', background: 'rgba(0,212,255,0.1)', color: 'var(--neon-blue)', border: '1px solid rgba(0,212,255,0.4)' }}
            >
              ⚙️ Edit Rosters & Groups
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-pink)', boxShadow: '0 0 8px var(--neon-pink)' }}></div>
              <strong style={{ color: 'var(--text)', fontSize: '14px' }}>Draft Mode</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleCancelEdit} className="btn btn-ghost btn-sm" style={{ padding: '8px 16px', color: 'var(--muted)' }}>
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="btn btn-sm" style={{ padding: '8px 16px', background: 'rgba(52, 211, 153, 0.2)', color: 'var(--neon-green)', border: '1px solid var(--neon-green)' }}>
                ✓ Save & Apply Matches
              </button>
            </div>
          </>
        )}
      </div>

      {isEditing && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20, padding: 12, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--neon-blue)', borderRadius: 8, fontSize: 13, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <div>
            <strong>Smart Updates:</strong> Existing match scores will be safely preserved! Adding a new player will generate matches just for them. Removing a player will void their played matches and instantly recalculate the remaining group standings.
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {allGroupsDone && groupWinners.length > 0 && (
          <motion.div className="gv-summary" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="gv-summary-title">🏆 Group Stage Complete — Advancing Players</div>
            <div className="gv-summary-list">
              {groupWinners.map((w, i) => (
                <div key={w.id} className="gv-summary-item">
                  <span className="gv-summary-pos">{i + 1}</span>
                  <span className="gv-summary-name">{w.name}</span>
                  <span className="gv-summary-pts">{w.points} pts</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="tag-groups-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {activeGroups.map(g => (
          <GroupCard 
            key={g.id} 
            group={g} 
            allGroups={activeGroups}
            onUpdate={handleUpdateMatch} 
            isEditing={isEditing}
            onEditAction={handleEditAction}
          />
        ))}
        
        {isEditing && (
          <div 
            onClick={handleCreateGroup}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,212,255,0.03)', border: '2px dashed rgba(0,212,255,0.3)', borderRadius: '16px', minHeight: '200px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ fontSize: 32, color: 'var(--neon-blue)', marginBottom: 8 }}>+</div>
            <div style={{ color: 'var(--neon-blue)', fontWeight: 'bold' }}>Create New Group</div>
          </div>
        )}
      </div>
    </div>
  )
}