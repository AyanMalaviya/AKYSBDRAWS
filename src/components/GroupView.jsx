import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TAG_META,
  recordGroupResult,
  recordGroupResultWithScore,
  getGroupAdvancerInfo,
  renameGroup,
  addPlayerToGroup,
  removePlayerFromGroup,
  movePlayerBetweenGroups,
  updatePlayerProps,
  createNewGroup,
  deleteGroup,
} from '../engine/groupEngine.js'
import Scoreboard from './Scoreboard.jsx'
import '../group.css'

// Returns the CSS color for a given tag letter
const tagColor = (tag) => TAG_META[tag || 'C']?.color || TAG_META['C'].color

// ── Score Entry Modal ─────────────────────────────────────────────────
function ScoreModal({ match, onConfirm, onClose }) {
  const [s1, setS1] = useState(match.score1 ?? '')
  const [s2, setS2] = useState(match.score2 ?? '')
  const v1 = s1 === '' ? null : Number(s1)
  const v2 = s2 === '' ? null : Number(s2)
  const ready = v1 !== null && v2 !== null && !isNaN(v1) && !isNaN(v2) && v1 >= 0 && v2 >= 0
  let preview = null
  if (ready) {
    if (v1 > v2)      preview = { label: `${match.p1.name} wins`, color: 'var(--green)' }
    else if (v2 > v1) preview = { label: `${match.p2.name} wins`, color: 'var(--green)' }
    else              preview = { label: 'Draw', color: 'var(--gold-light)' }
  }
  const handleKey = e => { if (e.key === 'Enter' && ready) onConfirm(v1, v2) }
  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div className="modal-box" initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }} style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--white-soft)' }}>📊 Enter Score</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: tagColor(match.p1.tag), marginBottom: 8 }}>{match.p1.name}</div>
            <input type="number" min={0} value={s1} onChange={e => setS1(e.target.value)} onKeyDown={handleKey} autoFocus placeholder="0" style={{ width: '100%', padding: '12px 8px', textAlign: 'center', fontSize: 28, fontWeight: 800, background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--white-soft)', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }} />
          </div>
          <div style={{ flexShrink: 0, textAlign: 'center' }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: 2 }}>VS</div></div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: tagColor(match.p2.tag), marginBottom: 8 }}>{match.p2.name}</div>
            <input type="number" min={0} value={s2} onChange={e => setS2(e.target.value)} onKeyDown={handleKey} placeholder="0" style={{ width: '100%', padding: '12px 8px', textAlign: 'center', fontSize: 28, fontWeight: 800, background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--white-soft)', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }} />
          </div>
        </div>
        <div style={{ minHeight: 24, textAlign: 'center', marginBottom: 16 }}>
          {preview && (<motion.div key={preview.label} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 13, fontWeight: 700, color: preview.color }}>{preview.label}</motion.div>)}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" style={{ flex: 2, opacity: ready ? 1 : 0.4, cursor: ready ? 'pointer' : 'not-allowed' }} disabled={!ready} onClick={() => onConfirm(v1, v2)}>✓ Confirm</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Match Row ─────────────────────────────────────────────────────────
const MatchRow = memo(function MatchRow({ match, onResult, onScoreEntry }) {
  const isDone = !!match.winner
  const hasScore = match.score1 != null && match.score2 != null
  return (
    <div className={`gm-row${isDone ? ' gm-done' : ''}`}>
      <button className={`gm-player${match.winner?.id === match.p1.id ? ' gm-win' : ''}`} onClick={() => onResult(match.winner?.id === match.p1.id ? null : match.p1)}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: tagColor(match.p1.tag), fontWeight: 700 }}>{match.p1.name}</span>
        {hasScore && match.winner?.id === match.p1.id && <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 800, color: 'var(--green)', paddingLeft: 6 }}>{match.score1}–{match.score2}</span>}
      </button>
      <span className="gm-vs">{hasScore && match.winner === 'draw' ? <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-light)' }}>{match.score1}–{match.score2}</span> : 'vs'}</span>
      <button className={`gm-player${match.winner?.id === match.p2.id ? ' gm-win' : ''}`} onClick={() => onResult(match.winner?.id === match.p2.id ? null : match.p2)}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: tagColor(match.p2.tag), fontWeight: 700 }}>{match.p2.name}</span>
        {hasScore && match.winner?.id === match.p2.id && <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 800, color: 'var(--green)', paddingLeft: 6 }}>{match.score2}–{match.score1}</span>}
      </button>
      <button className="gm-draw" title="Enter score" onClick={() => onScoreEntry(match)} style={{ fontSize: 14, minWidth: 34 }}>📊</button>
      <button className={`gm-draw${match.winner === 'draw' ? ' gm-win' : ''}`} onClick={() => onResult(match.winner === 'draw' ? null : 'draw')} title="Mark as draw">D</button>
    </div>
  )
}, (prev, next) => prev.match === next.match)

// ── Standings Table ───────────────────────────────────────────────────
function StandingsTable({ standings, advancerIds, tiedIds }) {
  const hasScoreData = standings.some(s => s.scoredFor > 0 || s.scoredAgainst > 0)
  return (
    <table className="gs-table">
      <thead>
        <tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th>{hasScoreData && <th title="Score Difference">SD</th>}</tr>
      </thead>
      <tbody>
        {standings.map((s, i) => {
          const isAdv = advancerIds?.includes(s.id)
          const isTied = tiedIds?.includes(s.id)
          return (
            <tr key={s.id} className={[i < 2 ? 'gs-top' : '', isAdv ? 'gs-winner' : '', isTied ? 'gs-tied' : ''].filter(Boolean).join(' ')}>
              <td>{i + 1}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', minWidth: 0 }}>
                  {i === 0 && isAdv && <span style={{ flexShrink: 0 }}>🏆</span>}
                  {i === 1 && isAdv && <span style={{ flexShrink: 0 }}>⭐</span>}
                  {isTied && <span style={{ flexShrink: 0 }}>⚖️</span>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: tagColor(s.tag), fontWeight: 700 }}>{s.name}</span>
                </div>
              </td>
              <td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td>
              <td><strong>{s.points}</strong></td>
              {hasScoreData && <td style={{ color: s.scoreDiff > 0 ? 'var(--green)' : s.scoreDiff < 0 ? '#e05b4e' : 'var(--muted)', fontWeight: 700 }}>{s.scoreDiff > 0 ? '+' : ''}{s.scoreDiff ?? 0}</td>}
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
          <div className="tb-title">Tie-breaker: {groupName} (slot {slot})</div>
          <div className="tb-sub">{resolved ? `✅ ${remaining[0].name} advances` : `${remaining.length} players tied! Tap ❌ to eliminate`}</div>
        </div>
      </div>
      {!resolved && (
        <div className="tb-players">
          {remaining.map(p => (
            <div key={p.id} className="tb-player-row">
              <span className="tb-player-name" style={{ color: tagColor(p.tag), fontWeight: 700 }}>{p.name}</span>
              <span className="tb-player-pts">{p.points ?? 0}pts • {p.wins ?? 0}W</span>
              <button className="tb-eliminate-btn" onClick={() => onEliminate(p.id)} title={`Eliminate ${p.name}`}>❌</button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── Select Advancers Modal ────────────────────────────────────────────
function SelectAdvancersModal({ groups, defaultCount, onConfirm, onClose }) {
  const allPlayers = useMemo(() => {
    const rows = []
    groups.forEach(g => {
      g.standings.forEach((s, rank) => {
        rows.push({ ...s, groupId: g.id, groupName: g.name, rank })
      })
    })
    rows.sort((a, b) =>
      (b.points    ?? 0) - (a.points    ?? 0) ||
      (b.scoreDiff ?? 0) - (a.scoreDiff ?? 0) ||
      (b.scoredFor ?? 0) - (a.scoredFor ?? 0) ||
      (a.name ?? '').localeCompare(b.name ?? '')
    )
    return rows
  }, [groups])

  const [selected, setSelected] = useState(() => new Set(allPlayers.slice(0, defaultCount).map(p => p.id)))

  const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectTop = (n) => setSelected(new Set(allPlayers.slice(0, n).map(p => p.id)))

  const count    = selected.size
  const hasScores = allPlayers.some(p => p.scoredFor > 0 || p.scoredAgainst > 0)
  const posEmoji = ['🏆','⭐','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣']

  const quickOptions = []
  for (let n = 2; n <= Math.min(allPlayers.length - 1, 12); n += (allPlayers.length > 10 ? 2 : 1)) quickOptions.push(n)

  return (
    <div className="modal-overlay" style={{ zIndex: 3000, alignItems: 'flex-start', paddingTop: 32 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        style={{ background: 'rgba(16,14,31,0.98)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: 20, padding: '24px 0 0', width: '100%', maxWidth: 560, maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', boxShadow: '0 0 60px rgba(139,92,246,0.18), 0 24px 64px rgba(0,0,0,0.7)' }}
      >
        <div style={{ padding: '0 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--white-soft)' }}>🏆 Select Advancers</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>All players ranked by points across all groups</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 99, padding: '4px 14px', fontSize: 13, fontWeight: 800, color: 'var(--purple-light)', flexShrink: 0 }}>{count} selected</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Quick:</div>
            {quickOptions.map(n => (
              <button key={n} onClick={() => selectTop(n)} style={{ padding: '4px 11px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: count === n ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${count === n ? 'rgba(212,160,23,0.5)' : 'rgba(255,255,255,0.1)'}`, color: count === n ? 'var(--gold-light)' : 'var(--muted)', transition: 'all 0.15s' }}>Top {n}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
          {allPlayers.map((p, globalRank) => {
            const isSelected = selected.has(p.id)
            return (
              <button key={p.id} onClick={() => toggle(p.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', textAlign: 'left', background: isSelected ? 'rgba(34,214,122,0.10)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isSelected ? 'rgba(34,214,122,0.42)' : 'rgba(255,255,255,0.07)'}`, boxShadow: isSelected ? '0 0 12px rgba(34,214,122,0.09)' : 'none', transition: 'all 0.15s' }}>
                <div style={{ width: 26, flexShrink: 0, textAlign: 'center', fontSize: 14 }}>
                  {isSelected ? (posEmoji[Array.from(selected).indexOf(p.id)] || '✅') : <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>#{globalRank + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: tagColor(p.tag), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {p.groupName} · #{p.rank + 1} in group · {p.wins}W {p.draws}D {p.losses}L
                    {hasScores && p.scoreDiff != null ? ` · SD ${p.scoreDiff > 0 ? '+' : ''}${p.scoreDiff}` : ''}
                  </div>
                </div>
                <div style={{ flexShrink: 0, background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 800, color: 'var(--gold-light)' }}>{p.points ?? 0} pts</div>
                <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isSelected ? 'var(--green)' : 'rgba(255,255,255,0.18)'}`, background: isSelected ? 'rgba(34,214,122,0.25)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--green)', transition: 'all 0.15s' }}>{isSelected ? '✓' : ''}</div>
              </button>
            )
          })}
        </div>

        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-sm" style={{ flex: 2, background: count === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(34,214,122,0.14)', border: `1px solid ${count === 0 ? 'var(--border2)' : 'rgba(34,214,122,0.45)'}`, color: count === 0 ? 'var(--muted)' : 'var(--green)', fontWeight: 800, fontSize: 14, opacity: count === 0 ? 0.5 : 1, cursor: count === 0 ? 'not-allowed' : 'pointer', padding: '10px 0' }} disabled={count === 0} onClick={() => onConfirm(allPlayers.filter(p => selected.has(p.id)))}>
            Advance {count} Player{count !== 1 ? 's' : ''} →
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function GroupCard({ group, allGroups, onUpdate, onUpdateWithScore, isEditing, onEditAction, eliminatedIds, onEliminate, advancersPerGroup }) {
  const [showStandings, setShowStandings] = useState(false)
  const [scoreModal, setScoreModal]       = useState(null)

  const done    = group.matches.filter(m => m.winner).length
  const total   = group.matches.length
  const pct     = total ? Math.round((done / total) * 100) : 0
  const allDone = done === total && total > 0

  const maxForThisGroup = Math.max(1, group.players.length - 1)
  const count = Math.min(advancersPerGroup || 2, maxForThisGroup)

  const { advancers, tied, needsTieBreak } = allDone
    ? getGroupAdvancerInfo(group, count)
    : { advancers: [], tied: [], needsTieBreak: false }

  const remainingTied = tied.filter(p => !eliminatedIds.includes(p.id))
  const tieResolved   = needsTieBreak ? remainingTied.length <= (count - advancers.length) : true

  const finalAdvancers = needsTieBreak
    ? [...advancers, ...remainingTied.slice(0, count - advancers.length)]
    : advancers.slice(0, count)

  const advancerIds = finalAdvancers.map(p => p.id).filter(Boolean)
  const tiedIds     = needsTieBreak && !tieResolved ? tied.map(t => t.id) : []
  const posEmoji    = ['🏆', '⭐', '🥉', '4️⃣', '5️⃣']

  return (
    <motion.div className={`group-card${allDone && !isEditing ? ' group-card--done' : ''}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <AnimatePresence>
        {scoreModal && (
          <ScoreModal match={scoreModal} onClose={() => setScoreModal(null)}
            onConfirm={(v1, v2) => { onUpdateWithScore(group.id, scoreModal.id, v1, v2); setScoreModal(null) }}
          />
        )}
      </AnimatePresence>

      <div className="gc-header">
        {isEditing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <input value={group.name} onChange={e => onEditAction('rename_group', group.id, null, e.target.value)}
              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--purple-light)', padding: '8px 12px', borderRadius: 6, fontSize: 15, fontWeight: 'bold' }} />
            <button onClick={() => onEditAction('delete_group', group.id)} title="Delete this group"
              style={{ flexShrink: 0, background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.35)', color: '#e05b4e', padding: '8px 12px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🗑 Delete</button>
          </div>
        ) : (
          <div className="gc-title-row">
            <span className="gc-name" style={{ color: 'var(--purple-light)' }}>{group.name}</span>
            <span className="gc-count">{group.players.length} players · top {count} advance</span>
          </div>
        )}
        {!isEditing && (
          <>
            <div className="gc-progress-bar"><div className="gc-progress-fill" style={{ width: `${pct}%`, background: 'var(--purple-light)' }} /></div>
            <div className="gc-progress-label">{done}/{total} matches done</div>
          </>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
          {group.players.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>No players. Delete this group or add players below.</div>
          )}
          {group.players.map(p => (
            <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
              <input value={p.name} onChange={e => onEditAction('update_player', group.id, p.id, { name: e.target.value })} placeholder="Player Name"
                style={{ flex: '1 1 80px', minWidth: 60, background: 'none', border: 'none', color: tagColor(p.tag), borderBottom: `1px solid ${tagColor(p.tag)}44`, padding: 6, fontSize: 14, fontWeight: 700, outline: 'none' }} />
              <select value={p.tag} onChange={e => onEditAction('update_player', group.id, p.id, { tag: e.target.value })}
                style={{ flexShrink: 0, width: 48, background: 'var(--surface)', border: `1px solid ${TAG_META[p.tag || 'C'].color}`, color: TAG_META[p.tag || 'C'].color, padding: '6px 4px', borderRadius: 6, fontWeight: 'bold', outline: 'none', textAlign: 'center', cursor: 'pointer' }}>
                <option value="A">A</option><option value="B">B</option><option value="C">C</option>
              </select>
              <select value={group.id} onChange={e => onEditAction('move_player', group.id, p.id, e.target.value)}
                style={{ flexShrink: 0, width: 88, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', padding: 6, borderRadius: 6, fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                {allGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button onClick={() => onEditAction('remove_player', group.id, p.id)} title="Remove Player"
                style={{ flexShrink: 0, background: 'none', border: 'none', color: '#e05b4e', cursor: 'pointer', padding: 6, fontSize: 16 }}>✖</button>
            </div>
          ))}
          <button onClick={() => onEditAction('add_player', group.id)}
            style={{ marginTop: 8, background: 'rgba(139,92,246,0.05)', border: '1px dashed rgba(139,92,246,0.3)', color: 'var(--purple-light)', padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>+ Add Player to {group.name}</button>
        </div>
      ) : (
        <>
          {allDone && finalAdvancers.length > 0 && (
            <motion.div className="gc-winner-banner" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Advancing</div>
                {finalAdvancers.map((p, idx) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: idx < finalAdvancers.length - 1 ? 4 : 0 }}>
                    <span style={{ fontSize: 15 }}>{posEmoji[idx] || '▶'}</span>
                    <span style={{ fontWeight: idx === 0 ? 800 : 700, fontSize: idx === 0 ? 14 : 13, color: tagColor(p.tag) }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>{group.standings.find(s => s.id === p.id)?.points ?? 0}pts</span>
                  </div>
                ))}
                {needsTieBreak && !tieResolved && <div style={{ fontSize: 11, color: 'var(--gold-light)', marginTop: 6, fontWeight: 600 }}>⚠️ Tie at boundary — resolve below</div>}
              </div>
            </motion.div>
          )}
          {allDone && needsTieBreak && (
            <TieBreakerPanel
              groupName={group.name}
              tiedPlayers={tied.map(p => ({ ...p, points: group.standings.find(s => s.id === p.id)?.points ?? 0, wins: group.standings.find(s => s.id === p.id)?.wins ?? 0, scoreDiff: group.standings.find(s => s.id === p.id)?.scoreDiff ?? 0 }))}
              eliminatedIds={eliminatedIds} onEliminate={onEliminate} slot={advancers.length + 1}
            />
          )}
          <div className="gc-matches">
            {group.matches.map(m => (
              <MatchRow key={m.id} match={m} onResult={w => onUpdate(group.id, m.id, w)} onScoreEntry={match => setScoreModal(match)} />
            ))}
          </div>
          <button className="gc-standings-toggle" onClick={() => setShowStandings(s => !s)}>
            {showStandings ? '▼ Hide Standings' : '▶ Standings'}
          </button>
          <AnimatePresence>
            {showStandings && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                <StandingsTable standings={group.standings} advancerIds={allDone ? advancerIds : []} tiedIds={allDone ? tiedIds : []} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}

export default function GroupView({ groups, onGroupsUpdate, onBack, onAdvanceToStage2, hasStage2, onGoToStage2 }) {
  const [isEditing, setIsEditing]                   = useState(false)
  const [draftGroups, setDraftGroups]               = useState(null)
  const [showAdvancerModal, setShowAdvancerModal]   = useState(false)
  const [advancersPerGroup, setAdvancersPerGroup]   = useState(2)
  const [stage2Type, setStage2Type]                 = useState('knockout')
  const [confirmedAdvancers, setConfirmedAdvancers] = useState(null)
  const [showStage2Config, setShowStage2Config]     = useState(false)

  const onGroupsUpdateRef    = useRef(onGroupsUpdate)
  const onAdvanceToStage2Ref = useRef(onAdvanceToStage2)
  useEffect(() => { onGroupsUpdateRef.current    = onGroupsUpdate    }, [onGroupsUpdate])
  useEffect(() => { onAdvanceToStage2Ref.current = onAdvanceToStage2 }, [onAdvanceToStage2])

  const gridRef     = useRef(null)
  const groupsRef   = useRef(groups)
  groupsRef.current = groups

  const activeGroups = isEditing && draftGroups ? draftGroups : groups

  const maxAdvancers = useMemo(() => {
    if (!groups.length) return 4
    const maxSize = Math.max(...groups.map(g => g.players.length))
    return Math.max(1, maxSize - 1)
  }, [groups])

  const safeAdvancers = Math.min(advancersPerGroup, maxAdvancers)

  const handleStartEdit = useCallback(() => {
    setDraftGroups(structuredClone(groupsRef.current))
    setIsEditing(true)
  }, [])

  const handleSaveEdit = useCallback(() => {
    setDraftGroups(prev => { onGroupsUpdateRef.current(prev); return null })
    setIsEditing(false)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setDraftGroups(null)
  }, [])

  const resetStage2Flow = useCallback(() => {
    setConfirmedAdvancers(null)
    setShowStage2Config(false)
    setShowAdvancerModal(false)
  }, [])

  const handleUpdateMatch = useCallback((groupId, matchId, winner) => {
    const currentGroups = groupsRef.current
    const cleared = currentGroups.map(g => g.id === groupId ? { ...g, eliminatedIds: [] } : g)
    onGroupsUpdateRef.current(recordGroupResult(cleared, groupId, matchId, winner))
    resetStage2Flow()
  }, [resetStage2Flow])

  const handleUpdateMatchWithScore = useCallback((groupId, matchId, s1, s2) => {
    const currentGroups = groupsRef.current
    const cleared = currentGroups.map(g => g.id === groupId ? { ...g, eliminatedIds: [] } : g)
    onGroupsUpdateRef.current(recordGroupResultWithScore(cleared, groupId, matchId, s1, s2))
    resetStage2Flow()
  }, [resetStage2Flow])

  const handleEditAction = useCallback((action, groupId, playerId, payload) => {
    setDraftGroups(prev => {
      if (!prev) return prev
      let next = prev
      if (action === 'rename_group')  next = renameGroup(next, groupId, payload)
      if (action === 'add_player')    next = addPlayerToGroup(next, groupId)
      if (action === 'remove_player') next = removePlayerFromGroup(next, groupId, playerId)
      if (action === 'update_player') next = updatePlayerProps(next, groupId, playerId, payload)
      if (action === 'move_player')   next = movePlayerBetweenGroups(next, groupId, playerId, payload)
      if (action === 'delete_group')  next = deleteGroup(next, groupId)
      return next
    })
  }, [])

  const handleCreateGroup = useCallback(() => {
    setDraftGroups(prev => createNewGroup(prev))
  }, [])

  const handleEliminate = useCallback((groupId, playerId) => {
    const currentGroups = groupsRef.current
    onGroupsUpdateRef.current(
      currentGroups.map(g =>
        g.id === groupId ? { ...g, eliminatedIds: [...(g.eliminatedIds || []), playerId] } : g
      )
    )
    resetStage2Flow()
  }, [resetStage2Flow])

  const SCROLL_AMOUNT = 360
  const scrollLeft  = () => gridRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' })
  const scrollRight = () => gridRef.current?.scrollBy({ left:  SCROLL_AMOUNT, behavior: 'smooth' })

  const allGroupsDone = !isEditing && groups.every(
    g => g.matches.every(m => m.winner !== null) && g.matches.length > 0
  )

  const unresolvedGroups = useMemo(() => {
    if (!allGroupsDone) return []
    return groups.filter(g => {
      const maxForG = Math.max(1, g.players.length - 1)
      const count = Math.min(safeAdvancers, maxForG)
      const { advancers, tied, needsTieBreak } = getGroupAdvancerInfo(g, count)
      const elims = g.eliminatedIds || []
      const remainingTied = tied.filter(p => !elims.includes(p.id))
      const slotsLeft = count - advancers.length
      return needsTieBreak && remainingTied.length > slotsLeft
    })
  }, [allGroupsDone, groups, safeAdvancers])

  const allTiesResolved = unresolvedGroups.length === 0

  const defaultSelectCount = useMemo(() => {
    const total = groups.reduce((sum, g) => sum + g.players.length, 0)
    const effectiveTotal = groups.reduce((sum, g) => {
      return sum + Math.min(safeAdvancers, Math.max(1, g.players.length - 1))
    }, 0)
    return Math.max(1, Math.min(effectiveTotal, total - 1))
  }, [groups, safeAdvancers])

  const finalAdvancerList = useMemo(() => {
    if (confirmedAdvancers) return confirmedAdvancers
    const rows = []
    groups.forEach(g => {
      g.standings.forEach((s, rank) => rows.push({ ...s, groupId: g.id, groupName: g.name, rank }))
    })
    rows.sort((a, b) =>
      (b.points ?? 0) - (a.points ?? 0) ||
      (b.scoreDiff ?? 0) - (a.scoreDiff ?? 0) ||
      (b.scoredFor ?? 0) - (a.scoredFor ?? 0) ||
      (a.name ?? '').localeCompare(b.name ?? '')
    )
    return rows.slice(0, defaultSelectCount)
  }, [confirmedAdvancers, groups, defaultSelectCount])

  const handleAdvancerConfirm = useCallback((picked) => {
    setConfirmedAdvancers(picked)
    setShowAdvancerModal(false)
    setShowStage2Config(true)
  }, [])

  const handleLaunchStage2 = useCallback(() => {
    if (confirmedAdvancers?.length && onAdvanceToStage2Ref.current) {
      onAdvanceToStage2Ref.current(finalAdvancerList, stage2Type)
    }
  }, [confirmedAdvancers, finalAdvancerList, stage2Type])

  const posEmoji = ['🏆', '⭐', '🥉', '4️⃣', '5️⃣']

  return (
    <div className="group-view" style={{ paddingTop: 10 }}>
      {!isEditing && groups.length > 0 && (
        <Scoreboard groups={groups} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24, background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border2)' }}>
        {!isEditing ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ padding: '8px 16px' }}>⬅ Back to Setup</button>
              <button onClick={handleStartEdit} className="btn btn-sm" style={{ padding: '8px 16px', background: 'rgba(139,92,246,0.1)', color: 'var(--purple-light)', border: '1px solid rgba(139,92,246,0.4)' }}>✏️ Edit Rosters &amp; Groups</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginLeft: 'auto' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7 }}>Advancing / Group</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => { setAdvancersPerGroup(n); resetStage2Flow() }}
                    style={{ width: 34, height: 34, borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer', background: safeAdvancers === n ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${safeAdvancers === n ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`, color: safeAdvancers === n ? 'var(--purple-light)' : 'var(--muted)' }}>{n}</button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%' }}>
            <button onClick={handleCancelEdit} className="btn btn-ghost btn-sm">✕ Cancel</button>
            <button onClick={handleCreateGroup} className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--purple-light)', border: '1px solid rgba(139,92,246,0.4)' }}>+ New Group</button>
            <button onClick={handleSaveEdit} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>✓ Save Changes</button>
          </div>
        )}
      </div>

      <div ref={gridRef} className="group-grid" style={{ overflowX: 'auto', paddingBottom: 8 }}>
        {activeGroups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            allGroups={activeGroups}
            onUpdate={handleUpdateMatch}
            onUpdateWithScore={handleUpdateMatchWithScore}
            isEditing={isEditing}
            onEditAction={handleEditAction}
            eliminatedIds={group.eliminatedIds || []}
            onEliminate={(playerId) => handleEliminate(group.id, playerId)}
            advancersPerGroup={safeAdvancers}
          />
        ))}
      </div>

      {allGroupsDone && !isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 24, background: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: '16px 20px', border: '1px solid rgba(212,160,23,0.25)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20 }}>🏆</span>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--gold-light)' }}>Group Stage Complete!</div>
            {!allTiesResolved && (
              <div style={{ fontSize: 12, color: 'var(--gold-light)', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 8, padding: '3px 10px', fontWeight: 700 }}>⚠️ Resolve ties above first</div>
            )}
          </div>

          {hasStage2 ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                <strong style={{ color: 'var(--white-soft)' }}>Stage 2 has already been generated.</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, minWidth: 180, fontWeight: 800 }}
                  onClick={onGoToStage2}
                >
                  🚀 Go to Stage 2 →
                </button>
              </div>
            </motion.div>
          ) : showStage2Config && confirmedAdvancers ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
                <strong style={{ color: 'var(--green)' }}>{confirmedAdvancers.length} players</strong> selected to advance
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {[{ id: 'knockout', label: '🥊 Single Elimination', desc: 'Knockout bracket' }, { id: 'groups', label: '👥 New Group Stage', desc: 'Draw into new groups' }].map(opt => (
                  <button key={opt.id} onClick={() => setStage2Type(opt.id)}
                    style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', background: stage2Type === opt.id ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${stage2Type === opt.id ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`, color: stage2Type === opt.id ? 'var(--purple-light)' : 'var(--muted)', transition: 'all 0.15s' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowStage2Config(false); setConfirmedAdvancers(null) }}>← Change Players</button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, opacity: allTiesResolved ? 1 : 0.4, cursor: allTiesResolved ? 'pointer' : 'not-allowed' }}
                  disabled={!allTiesResolved}
                  onClick={handleLaunchStage2}
                >
                  🚀 Launch Stage 2
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                <strong style={{ color: 'var(--white-soft)' }}>{finalAdvancerList.length} players</strong> from group standings ready to advance.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-sm"
                  style={{ flex: 1, minWidth: 160, opacity: allTiesResolved ? 1 : 0.4, cursor: allTiesResolved ? 'pointer' : 'not-allowed', background: 'rgba(34,214,122,0.1)', border: '1px solid rgba(34,214,122,0.4)', color: 'var(--green)', fontWeight: 800 }}
                  disabled={!allTiesResolved}
                  onClick={() => {
                    setConfirmedAdvancers(null)
                    setShowAdvancerModal(true)
                  }}
                >✏️ Select / Review Players</button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 2, minWidth: 180, opacity: allTiesResolved ? 1 : 0.4, cursor: allTiesResolved ? 'pointer' : 'not-allowed' }}
                  disabled={!allTiesResolved}
                  onClick={() => {
                    setConfirmedAdvancers(finalAdvancerList)
                    setShowStage2Config(true)
                  }}
                >🏆 Advance Top {finalAdvancerList.length} →</button>
              </div>
            </>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {showAdvancerModal && (
          <SelectAdvancersModal
            groups={groups}
            defaultCount={defaultSelectCount}
            onConfirm={handleAdvancerConfirm}
            onClose={() => setShowAdvancerModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
