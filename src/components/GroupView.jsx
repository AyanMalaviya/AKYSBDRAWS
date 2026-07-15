import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TAG_META,
  recordGroupResult,
  getGroupAdvancerInfo,
  renameGroup,
  addPlayerToGroup,
  removePlayerFromGroup,
  movePlayerBetweenGroups,
  updatePlayerProps,
  createNewGroup,
  deleteGroup,
} from '../engine/groupEngine.js'
import '../group.css'

// ─────────────────────────────────────────
// Match row
// ─────────────────────────────────────────
function MatchRow({ match, onResult }) {
  const isDone = !!match.winner
  return (
    <div className={`gm-row${isDone ? ' gm-done' : ''}`}>
      <button
        className={`gm-player${match.winner?.id === match.p1.id ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner?.id === match.p1.id ? null : match.p1)}
      >
        <span style={{ background: TAG_META[match.p1.tag || 'C'].color, width: 8, height: 8, borderRadius: 4, display: 'inline-block', marginRight: 6, flexShrink: 0 }} />
        {match.p1.name}
      </button>
      <span className="gm-vs">vs</span>
      <button
        className={`gm-player${match.winner?.id === match.p2.id ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner?.id === match.p2.id ? null : match.p2)}
      >
        <span style={{ background: TAG_META[match.p2.tag || 'C'].color, width: 8, height: 8, borderRadius: 4, display: 'inline-block', marginRight: 6, flexShrink: 0 }} />
        {match.p2.name}
      </button>
      <button
        className={`gm-draw${match.winner === 'draw' ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner === 'draw' ? null : 'draw')}
      >D</button>
    </div>
  )
}

// ─────────────────────────────────────────
// Standings table
// ─────────────────────────────────────────
function StandingsTable({ standings, advancerIds, tiedIds }) {
  return (
    <table className="gs-table">
      <thead><tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead>
      <tbody>
        {standings.map((s, i) => {
          const isAdv  = advancerIds?.includes(s.id)
          const isTied = tiedIds?.includes(s.id)
          return (
            <tr
              key={s.id}
              className={[
                i === 0 ? 'gs-top' : '',
                isAdv  ? 'gs-winner' : '',
                isTied ? 'gs-tied'   : '',
              ].filter(Boolean).join(' ')}
            >
              <td>{i + 1}</td>
              <td>
                {isAdv && i === 0 && <span title="Winner">👑 </span>}
                {isAdv && i > 0  && <span title="Runner-up">✅ </span>}
                {isTied          && <span title="Tied — needs tiebreak">⚠️ </span>}
                <span style={{ color: TAG_META[s.tag || 'C'].color, fontWeight: 900, marginRight: 6 }}>{s.tag}</span>
                {s.name}
              </td>
              <td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td>
              <td><strong>{s.points}</strong></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ─────────────────────────────────────────
// Tie-breaker panel (shown inside a finished group when a tie exists)
// ─────────────────────────────────────────
function TieBreakerPanel({ groupName, tiedPlayers, eliminatedIds, onEliminate }) {
  const remaining = tiedPlayers.filter(p => !eliminatedIds.includes(p.id))
  const resolved  = remaining.length === 1

  return (
    <motion.div
      className="tb-panel"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    >
      <div className="tb-header">
        <span className="tb-icon">⚠️</span>
        <div>
          <div className="tb-title">Tie-breaker — {groupName}</div>
          <div className="tb-sub">
            {resolved
              ? `✅ ${remaining[0].name} advances as runner-up`
              : `${remaining.length} players tied on points & wins — tap ✕ to eliminate`}
          </div>
        </div>
      </div>
      {!resolved && (
        <div className="tb-players">
          {remaining.map(p => (
            <div key={p.id} className="tb-player-row">
              <span style={{ color: TAG_META[p.tag || 'C'].color, fontWeight: 900, marginRight: 6 }}>{p.tag}</span>
              <span className="tb-player-name">{p.name}</span>
              <span className="tb-player-pts">{p.points ?? 0}pts · {p.wins ?? 0}W</span>
              <button
                className="tb-eliminate-btn"
                onClick={() => onEliminate(p.id)}
                title={`Eliminate ${p.name}`}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────
// Group card
// ─────────────────────────────────────────
function GroupCard({ group, allGroups, onUpdate, isEditing, onEditAction, eliminatedIds, onEliminate }) {
  const [showStandings, setShowStandings] = useState(false)
  const done    = group.matches.filter(m => m.winner).length
  const total   = group.matches.length
  const pct     = total ? Math.round((done / total) * 100) : 0
  const allDone = done === total && total > 0
  const isEmpty = group.players.length === 0

  const { advancers, tied, needsTieBreak } = allDone ? getGroupAdvancerInfo(group) : { advancers: [], tied: [], needsTieBreak: false }

  // After user eliminates down to 1 tied player, the survivor joins advancers
  const remainingTied   = tied.filter(p => !eliminatedIds.includes(p.id))
  const tieResolved     = needsTieBreak && remainingTied.length === 1
  const confirmedAdvancers = tieResolved
    ? [...advancers, remainingTied[0]]
    : needsTieBreak ? advancers : advancers

  const advancerIds = confirmedAdvancers.map(a => a.id)
  const tiedIds     = needsTieBreak && !tieResolved ? tied.map(t => t.id) : []

  return (
    <motion.div
      className={`group-card${allDone && !isEditing ? ' group-card--done' : ''}`}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    >
      <div className="gc-header">
        {isEditing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <input
              value={group.name}
              onChange={e => onEditAction('rename_group', group.id, null, e.target.value)}
              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--neon-blue)', padding: '8px 12px', borderRadius: 6, fontSize: 15, fontWeight: 'bold' }}
            />
            <button
              onClick={() => onEditAction('delete_group', group.id)}
              title="Delete this group"
              style={{ flexShrink: 0, background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.35)', color: 'var(--neon-pink)', padding: '8px 12px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >🗑 Delete</button>
          </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
          {isEmpty && (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
              No players — delete this group or add players below.
            </div>
          )}
          {group.players.map(p => (
            <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
              <input
                value={p.name}
                onChange={e => onEditAction('update_player', group.id, p.id, { name: e.target.value })}
                placeholder="Player Name"
                style={{ flex: '1 1 80px', minWidth: 60, background: 'none', border: 'none', color: 'var(--text)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: 6, fontSize: 14, outline: 'none' }}
              />
              <select
                value={p.tag}
                onChange={e => onEditAction('update_player', group.id, p.id, { tag: e.target.value })}
                style={{ flexShrink: 0, width: 48, background: 'var(--surface)', border: `1px solid ${TAG_META[p.tag || 'C'].color}`, color: TAG_META[p.tag || 'C'].color, padding: '6px 4px', borderRadius: 6, fontWeight: 'bold', outline: 'none', textAlign: 'center', cursor: 'pointer' }}
              >
                <option value="A">A</option><option value="B">B</option><option value="C">C</option>
              </select>
              <select
                value={group.id}
                onChange={e => onEditAction('move_player', group.id, p.id, e.target.value)}
                style={{ flexShrink: 0, width: 88, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', padding: 6, borderRadius: 6, fontSize: 12, outline: 'none', cursor: 'pointer' }}
              >
                {allGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button
                onClick={() => onEditAction('remove_player', group.id, p.id)}
                title="Remove Player"
                style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', padding: 6, fontSize: 16 }}
              >✕</button>
            </div>
          ))}
          <button
            onClick={() => onEditAction('add_player', group.id)}
            style={{ marginTop: 8, background: 'rgba(0,212,255,0.05)', border: '1px dashed rgba(0,212,255,0.3)', color: 'var(--neon-blue)', padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}
          >+ Add Player to {group.name}</button>
        </div>
      ) : (
        <>
          {/* Advancers banner (after all matches done) */}
          {allDone && (confirmedAdvancers.length > 0 || needsTieBreak) && (
            <motion.div className="gc-winner-banner" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                {confirmedAdvancers.map((adv, idx) => (
                  <div key={adv.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: idx === 0 ? 20 : 16 }}>{idx === 0 ? '👑' : '✅'}</span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{idx === 0 ? 'Winner' : 'Runner-up'}</div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{adv.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{adv.wins}W · {adv.draws}D · {adv.losses}L · {adv.points}pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tie-breaker panel — shown when tie exists and not yet resolved */}
          {allDone && needsTieBreak && (
            <TieBreakerPanel
              groupName={group.name}
              tiedPlayers={tied.map(p => ({
                ...p,
                points: group.standings.find(s => s.id === p.id)?.points ?? 0,
                wins:   group.standings.find(s => s.id === p.id)?.wins   ?? 0,
              }))}
              eliminatedIds={eliminatedIds}
              onEliminate={onEliminate}
            />
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
                <StandingsTable
                  standings={group.standings}
                  advancerIds={allDone ? advancerIds : []}
                  tiedIds={allDone ? tiedIds : []}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────
// Main GroupView
// ─────────────────────────────────────────
export default function GroupView({ groups, onGroupsUpdate, onBack, onAdvanceToRound2 }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftGroups, setDraftGroups] = useState(null)
  // eliminatedIds: Set of player IDs eliminated in tie-breakers (per this session)
  const [eliminatedIds, setEliminatedIds] = useState([])
  // confirmed: user has reviewed advancers and clicked "Confirm"
  const [confirmed, setConfirmed] = useState(false)

  const activeGroups = isEditing && draftGroups ? draftGroups : groups

  const handleStartEdit = () => {
    setDraftGroups(JSON.parse(JSON.stringify(groups)))
    setIsEditing(true)
    setConfirmed(false)
  }
  const handleSaveEdit = () => {
    onGroupsUpdate(draftGroups)
    setIsEditing(false)
    setDraftGroups(null)
    setConfirmed(false)
  }
  const handleCancelEdit = () => {
    setIsEditing(false)
    setDraftGroups(null)
  }
  const handleUpdateMatch = (groupId, matchId, winner) => {
    onGroupsUpdate(recordGroupResult(groups, groupId, matchId, winner))
    setConfirmed(false)
  }
  const handleEditAction = (action, groupId, playerId, payload) => {
    let next = draftGroups
    if (action === 'rename_group')  next = renameGroup(next, groupId, payload)
    if (action === 'add_player')    next = addPlayerToGroup(next, groupId)
    if (action === 'remove_player') next = removePlayerFromGroup(next, groupId, playerId)
    if (action === 'update_player') next = updatePlayerProps(next, groupId, playerId, payload)
    if (action === 'move_player')   next = movePlayerBetweenGroups(next, groupId, playerId, payload)
    if (action === 'delete_group')  next = deleteGroup(next, groupId)
    setDraftGroups(next)
  }
  const handleCreateGroup = () => setDraftGroups(createNewGroup(draftGroups))

  const handleEliminate = (playerId) => {
    setEliminatedIds(prev => [...prev, playerId])
  }

  // ── Advance logic ──
  // All groups must be done
  const allGroupsDone = !isEditing && groups.every(
    g => g.matches.every(m => m.winner !== null) && g.matches.length > 0
  )

  // Per group: compute advancer info taking eliminatedIds into account
  const groupAdvancerData = useMemo(() => {
    if (!allGroupsDone) return []
    return groups.map(g => {
      const { advancers, tied, needsTieBreak } = getGroupAdvancerInfo(g)
      const remainingTied = tied.filter(p => !eliminatedIds.includes(p.id))
      const tieResolved   = needsTieBreak && remainingTied.length === 1
      const finalAdvancers = tieResolved
        ? [...advancers, remainingTied[0]]
        : needsTieBreak ? advancers : advancers
      return {
        groupId: g.id,
        groupName: g.name,
        advancers: finalAdvancers,
        needsTieBreak,
        tieResolved,
        remainingTied,
      }
    })
  }, [allGroupsDone, groups, eliminatedIds])

  // Can confirm only when every group has exactly 2 advancers resolved
  const allTiesResolved = allGroupsDone && groupAdvancerData.every(
    d => !d.needsTieBreak || d.tieResolved
  )
  const allAdvancers = groupAdvancerData.flatMap(d => d.advancers)

  return (
    <div className="group-view" style={{ paddingTop: 10 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24, background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border2)' }}>
        {!isEditing ? (
          <>
            <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ padding: '8px 16px' }}>← Back to Setup</button>
            <button
              onClick={handleStartEdit}
              className="btn btn-sm"
              style={{ padding: '8px 16px', background: 'rgba(0,212,255,0.1)', color: 'var(--neon-blue)', border: '1px solid rgba(0,212,255,0.4)' }}
            >⚙️ Edit Rosters & Groups</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon-pink)', boxShadow: '0 0 8px var(--neon-pink)' }} />
              <strong style={{ color: 'var(--text)', fontSize: 14 }}>Draft Mode — changes not saved yet</strong>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCancelEdit} className="btn btn-ghost btn-sm" style={{ padding: '8px 16px', color: 'var(--muted)' }}>Cancel</button>
              <button
                onClick={handleSaveEdit}
                className="btn btn-sm"
                style={{ padding: '8px 16px', background: 'rgba(52,211,153,0.2)', color: 'var(--neon-green)', border: '1px solid var(--neon-green)' }}
              >✓ Save & Apply Matches</button>
            </div>
          </>
        )}
      </div>

      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 20, padding: 12, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--neon-blue)', borderRadius: 8, fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start' }}
        >
          <span style={{ fontSize: 18 }}>💡</span>
          <div>
            <strong>Draft Mode:</strong> Rename groups, move/add/remove players, or delete empty groups.
            Existing scores are preserved. New players get fresh matches auto-generated.
          </div>
        </motion.div>
      )}

      {/* ── All-groups-done summary + confirm + advance ── */}
      <AnimatePresence>
        {allGroupsDone && !isEditing && (
          <motion.div
            className="gv-summary"
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          >
            <div className="gv-summary-title">🏆 Group Stage Complete</div>

            {!allTiesResolved ? (
              <div className="gv-summary-notice">
                ⚠️ Resolve all tie-breakers in each group before confirming advancers.
              </div>
            ) : (
              <>
                <div className="gv-summary-subtitle">Top 2 advancing from each group:</div>
                <div className="gv-summary-list">
                  {groupAdvancerData.map(d => (
                    <div key={d.groupId} className="gv-summary-group-block">
                      <div className="gv-summary-group-name">{d.groupName}</div>
                      {d.advancers.map((w, i) => (
                        <div key={w.id} className="gv-summary-item">
                          <span className="gv-summary-pos">{i === 0 ? '👑' : '✅'}</span>
                          <span className="gv-summary-name">{w.name}</span>
                          <span className="gv-summary-pts">{w.points} pts</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {!confirmed ? (
                  <button
                    className="gv-confirm-btn"
                    onClick={() => setConfirmed(true)}
                  >
                    ✓ Confirm Advancing Players
                  </button>
                ) : (
                  <motion.div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 16 }}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  >
                    <div style={{ color: 'var(--neon-green)', fontSize: 13, fontWeight: 600 }}>✅ {allAdvancers.length} players confirmed</div>
                    <button
                      className="gv-advance-btn"
                      onClick={() => onAdvanceToRound2 && onAdvanceToRound2(allAdvancers)}
                    >
                      Round 2 →
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Group cards grid ── */}
      <div className="tag-groups-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {activeGroups.map(g => (
          <GroupCard
            key={g.id}
            group={g}
            allGroups={activeGroups}
            onUpdate={handleUpdateMatch}
            isEditing={isEditing}
            onEditAction={handleEditAction}
            eliminatedIds={eliminatedIds}
            onEliminate={handleEliminate}
          />
        ))}
        {isEditing && (
          <div
            onClick={handleCreateGroup}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,212,255,0.03)', border: '2px dashed rgba(0,212,255,0.3)', borderRadius: 16, minHeight: 200, cursor: 'pointer' }}
          >
            <div style={{ fontSize: 32, color: 'var(--neon-blue)', marginBottom: 8 }}>+</div>
            <div style={{ color: 'var(--neon-blue)', fontWeight: 'bold' }}>Create New Group</div>
          </div>
        )}
      </div>
    </div>
  )
}
