import React, { useState, useMemo, useRef } from 'react'
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

function MatchRow({ match, onResult }) {
  const isDone = !!match.winner
  return (
    <div className={`gm-row${isDone ? ' gm-done' : ''}`}>
      <button
        className={`gm-player${match.winner?.id === match.p1.id ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner?.id === match.p1.id ? null : match.p1)}
      >
        <span className={`tag ${TAG_META[match.p1.tag || 'C']?.badge || 'tag-blue'}`} style={{ marginRight: 6 }}>
          {match.p1.tag || 'C'}
        </span>
        {match.p1.name}
      </button>

      <span className="gm-vs">vs</span>

      <button
        className={`gm-player${match.winner?.id === match.p2.id ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner?.id === match.p2.id ? null : match.p2)}
      >
        <span className={`tag ${TAG_META[match.p2.tag || 'C']?.badge || 'tag-blue'}`} style={{ marginRight: 6 }}>
          {match.p2.tag || 'C'}
        </span>
        {match.p2.name}
      </button>

      <button
        className={`gm-draw${match.winner === 'draw' ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner === 'draw' ? null : 'draw')}
      >D</button>
    </div>
  )
}

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
                i < 2       ? 'gs-top'    : '',
                isAdv       ? 'gs-winner' : '',
                isTied      ? 'gs-tied'   : '',
              ].filter(Boolean).join(' ')}
            >
              <td>{i + 1}</td>
              <td>
                {i === 0 && isAdv && <span title="Winner">🏆 </span>}
                {i === 1 && isAdv && <span title="Runner-up">⭐ </span>}
                {isTied          && <span title="Tied">⚖️ </span>}
                <span className={`tag ${TAG_META[s.tag || 'C']?.badge || 'tag-blue'}`} style={{ marginRight: 6 }}>
                  {s.tag || 'C'}
                </span>
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

function TieBreakerPanel({ groupName, tiedPlayers, eliminatedIds, onEliminate, slot }) {
  const remaining = tiedPlayers.filter(p => !eliminatedIds.includes(p.id))
  const resolved  = remaining.length === 1
  return (
    <motion.div className="tb-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="tb-header">
        <span className="tb-icon">⚡</span>
        <div>
          <div className="tb-title">Tie-breaker: {groupName} ({slot === 1 ? 'Runner-up slot' : '1st place'})</div>
          <div className="tb-sub">
            {resolved
              ? `✅ ${remaining[0].name} advances as ${slot === 1 ? 'runner-up' : 'winner'}`
              : `${remaining.length} players tied! Tap ❌ to eliminate`}
          </div>
        </div>
      </div>
      {!resolved && (
        <div className="tb-players">
          {remaining.map(p => (
            <div key={p.id} className="tb-player-row">
              <span className={`tag ${TAG_META[p.tag || 'C']?.badge || 'tag-blue'}`}>{p.tag || 'C'}</span>
              <span className="tb-player-name">{p.name}</span>
              <span className="tb-player-pts">{p.points ?? 0}pts • {p.wins ?? 0}W</span>
              <button className="tb-eliminate-btn" onClick={() => onEliminate(p.id)} title={`Eliminate ${p.name}`}>❌</button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function GroupCard({ group, allGroups, onUpdate, isEditing, onEditAction, eliminatedIds, onEliminate }) {
  const [showStandings, setShowStandings] = useState(false)

  const done    = group.matches.filter(m => m.winner).length
  const total   = group.matches.length
  const pct     = total ? Math.round((done / total) * 100) : 0
  const allDone = done === total && total > 0

  const { advancers, tied, needsTieBreak } = allDone
    ? getGroupAdvancerInfo(group)
    : { advancers: [], tied: [], needsTieBreak: false }

  const remainingTied = tied.filter(p => !eliminatedIds.includes(p.id))
  const tieResolved   = needsTieBreak ? remainingTied.length === 1 : true

  const finalWinner    = advancers[0] || null
  const finalRunnerUp  = needsTieBreak
    ? (tieResolved ? remainingTied[0] : null)
    : (advancers[1] || null)

  const advancerIds = [
    finalWinner?.id,
    finalRunnerUp?.id,
  ].filter(Boolean)

  const tiedIds = needsTieBreak && !tieResolved ? tied.map(t => t.id) : []

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
          {group.players.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
              No players. Delete this group or add players below.
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
              >✖</button>
            </div>
          ))}
          <button
            onClick={() => onEditAction('add_player', group.id)}
            style={{ marginTop: 8, background: 'rgba(0,212,255,0.05)', border: '1px dashed rgba(0,212,255,0.3)', color: 'var(--neon-blue)', padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}
          >+ Add Player to {group.name}</button>
        </div>
      ) : (
        <>
          {allDone && (finalWinner || finalRunnerUp) && (
            <motion.div className="gc-winner-banner" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Advancing to Stage 2</div>
                
                {finalWinner && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>🏆</span>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{finalWinner.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
                      {group.standings.find(s=>s.id===finalWinner.id)?.points ?? 0}pts
                    </span>
                  </div>
                )}
                {finalRunnerUp && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>⭐</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--muted)' }}>{finalRunnerUp.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
                      {group.standings.find(s=>s.id===finalRunnerUp.id)?.points ?? 0}pts
                    </span>
                  </div>
                )}
                {needsTieBreak && !tieResolved && (
                  <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 6, fontWeight: 600 }}>⚠️ Runner-up slot tied. Resolve below</div>
                )}
              </div>
            </motion.div>
          )}

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
              slot={1}
            />
          )}

          <div className="gc-matches">
            {group.matches.map(m => (
              <MatchRow key={m.id} match={m} onResult={w => onUpdate(group.id, m.id, w)} />
            ))}
          </div>

          <button className="gc-standings-toggle" onClick={() => setShowStandings(s => !s)}>
            {showStandings ? '▼ Hide Standings' : '▶ Standings'}
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

export default function GroupView({ groups, onGroupsUpdate, onBack, onAdvanceToStage2, hasStage2 }) {
  const [isEditing, setIsEditing]         = useState(false)
  const [draftGroups, setDraftGroups]     = useState(null)
  const [confirmed, setConfirmed]         = useState(false)

  const gridRef = useRef(null)
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

  // Clear tie-breakers for a specific group when its match scores are edited
  const handleUpdateMatch = (groupId, matchId, winner) => {
    const clearedGroups = groups.map(g => g.id === groupId ? { ...g, eliminatedIds: [] } : g)
    onGroupsUpdate(recordGroupResult(clearedGroups, groupId, matchId, winner))
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
  
  // Save tie-breaker eliminations directly into the group object so they persist across unmounts!
  const handleEliminate = (groupId, playerId) => {
    const nextGroups = groups.map(g => {
      if (g.id === groupId) {
        return { ...g, eliminatedIds: [...(g.eliminatedIds || []), playerId] }
      }
      return g
    })
    onGroupsUpdate(nextGroups)
  }

  const SCROLL_AMOUNT = 360
  const scrollLeft  = () => gridRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' })
  const scrollRight = () => gridRef.current?.scrollBy({ left:  SCROLL_AMOUNT, behavior: 'smooth' })

  const allGroupsDone = !isEditing && groups.every(
    g => g.matches.every(m => m.winner !== null) && g.matches.length > 0
  )

  const groupAdvancerData = useMemo(() => {
    if (!allGroupsDone) return []
    return groups.map(g => {
      const { advancers, tied, needsTieBreak } = getGroupAdvancerInfo(g)
      const winner   = advancers[0] || null
      let runnerUp   = null
      let tieResolved = true

      if (needsTieBreak) {
        const elims = g.eliminatedIds || []
        const remaining = tied.filter(p => !elims.includes(p.id))
        tieResolved = remaining.length === 1
        runnerUp    = tieResolved ? remaining[0] : null
      } else {
        runnerUp = advancers[1] || null
      }

      const enrich = (p) => {
        if (!p) return null
        const s = g.standings.find(st => st.id === p.id)
        return s ? { ...p, ...s } : p
      }

      return {
        groupId:   g.id,
        groupName: g.name,
        winner:    enrich(winner),
        runnerUp:  enrich(runnerUp),
        hasTie:    needsTieBreak,
        tieResolved,
      }
    })
  }, [allGroupsDone, groups])

  const allTiesResolved = allGroupsDone &&
    groupAdvancerData.every(d => d.winner && d.runnerUp)

  // PERFECT CROSS-MATCHING LOGIC
  const allAdvancers = useMemo(() => {
    let winners = groupAdvancerData.map(d => ({ ...d.winner, groupId: d.groupId })).filter(p => p && p.id);
    let runnersUp = groupAdvancerData.map(d => ({ ...d.runnerUp, groupId: d.groupId })).filter(p => p && p.id);

    const tagVal = { A: 3, B: 2, C: 1 };
    
    // Stable Sorts using localeCompare to prevent IDs from randomly swapping positions on unmount!
    winners.sort((a, b) => 
      (tagVal[b.tag || 'C'] - tagVal[a.tag || 'C']) || 
      ((b.points || 0) - (a.points || 0)) || 
      a.id.localeCompare(b.id)
    );
    
    runnersUp.sort((a, b) => 
      (tagVal[a.tag || 'C'] - tagVal[b.tag || 'C']) || 
      ((a.points || 0) - (b.points || 0)) || 
      a.id.localeCompare(b.id)
    );

    const out = [];
    const N = Math.max(winners.length, runnersUp.length);
    
    for (let i = 0; i < N; i++) {
      let w = winners[i];
      let ruIdx = -1;
      
      for (let j = 0; j < runnersUp.length; j++) {
        if (runnersUp[j] && (!w || runnersUp[j].groupId !== w.groupId)) {
          ruIdx = j;
          break;
        }
      }
      
      if (ruIdx === -1 && runnersUp.length > 0) {
        ruIdx = 0; 
      }
      
      if (w) out.push(w);
      if (ruIdx !== -1) {
        out.push(runnersUp[ruIdx]);
        runnersUp.splice(ruIdx, 1);
      }
    }
    
    return out;
  }, [groupAdvancerData])

  return (
    <div className="group-view" style={{ paddingTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24, background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border2)' }}>
        {!isEditing ? (
          <>
            <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ padding: '8px 16px' }}>⬅ Back to Setup</button>
            <button
              onClick={handleStartEdit}
              className="btn btn-sm"
              style={{ padding: '8px 16px', background: 'rgba(0,212,255,0.1)', color: 'var(--neon-blue)', border: '1px solid rgba(0,212,255,0.4)' }}
            >✏️ Edit Rosters &amp; Groups</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon-pink)', boxShadow: '0 0 8px var(--neon-pink)' }} />
              <strong style={{ color: 'var(--text)', fontSize: 14 }}>Draft Mode - changes not saved yet</strong>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCancelEdit} className="btn btn-ghost btn-sm" style={{ padding: '8px 16px', color: 'var(--muted)' }}>Cancel</button>
              <button
                onClick={handleSaveEdit}
                className="btn btn-sm"
                style={{ padding: '8px 16px', background: 'rgba(52,211,153,0.2)', color: 'var(--neon-green)', border: '1px solid var(--neon-green)' }}
              >✅ Save &amp; Apply Matches</button>
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
            Scores are preserved. New players get matches auto-generated.
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {allGroupsDone && !isEditing && (
          <motion.div className="gv-summary" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="gv-summary-title">🎉 Group Stage Complete</div>
            {!allTiesResolved ? (
              <div className="gv-summary-notice">
                ⚠️ Some groups still have unresolved runner-up ties. Resolve them in each group first.
              </div>
            ) : (
              <>
                <div className="gv-summary-subtitle">
                  2 players per group advancing to Stage 2 (Knockout) — {allAdvancers.length} total:
                </div>
                
                <div className="gv-summary-list">
                  {groupAdvancerData.map(d => (
                    <div key={d.groupId} className="gv-summary-group-block">
                      <div className="gv-summary-group-name">{d.groupName}</div>
                      {d.winner && (
                        <div className="gv-summary-item">
                          <span className="gv-summary-pos">🏆</span>
                          <span className="gv-summary-name">{d.winner.name}</span>
                          <span className="gv-summary-pts">{d.winner.points ?? 0} pts</span>
                        </div>
                      )}
                      {d.runnerUp && (
                        <div className="gv-summary-item" style={{ opacity: 0.8 }}>
                          <span className="gv-summary-pos">⭐</span>
                          <span className="gv-summary-name">{d.runnerUp.name}</span>
                          <span className="gv-summary-pts">{d.runnerUp.points ?? 0} pts</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {(!confirmed && !hasStage2) ? (
                  <button className="gv-confirm-btn" onClick={() => setConfirmed(true)}>
                    ✓ Confirm {allAdvancers.length} Players
                  </button>
                ) : (
                  <motion.div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 16 }}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  >
                    <div style={{ color: 'var(--neon-green)', fontSize: 13, fontWeight: 600 }}>
                      ✅ {allAdvancers.length} players {hasStage2 ? 'advanced to' : 'confirmed for'} Stage 2.
                    </div>
                    <button
                      className="gv-advance-btn"
                      onClick={() => onAdvanceToStage2 && onAdvanceToStage2(allAdvancers)}
                      style={hasStage2 ? { background: 'rgba(255,215,0,0.15)', color: 'var(--neon-yellow)', border: '1px solid var(--neon-yellow)' } : {}}
                    >
                      {hasStage2 ? '▶ Open Stage 2 Bracket' : 'Stage 2 - Knockout 🏆'}
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {activeGroups.length > 2 && (
        <div className="groups-scroll-nav">
          <button className="scroll-nav-btn" onClick={scrollLeft} aria-label="Scroll left">❮</button>
          <span className="scroll-nav-hint">{activeGroups.length} groups • swipe or scroll</span>
          <button className="scroll-nav-btn" onClick={scrollRight} aria-label="Scroll right">❯</button>
        </div>
      )}

      <div ref={gridRef} className="tag-groups-grid">
        {activeGroups.map(g => (
          <GroupCard
            key={g.id}
            group={g}
            allGroups={activeGroups}
            onUpdate={handleUpdateMatch}
            isEditing={isEditing}
            onEditAction={handleEditAction}
            eliminatedIds={g.eliminatedIds || []}
            onEliminate={(playerId) => handleEliminate(g.id, playerId)}
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