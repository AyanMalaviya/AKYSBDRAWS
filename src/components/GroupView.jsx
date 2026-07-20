import React, { useState, useMemo, useRef } from 'react'
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
import '../group.css'

// Tiny inline tag — used in standings and match rows where space is tight
const TinyTag = ({ tag }) => (
  <span
    className={`tag ${TAG_META[tag || 'C']?.badge || 'tag-green'}`}
    style={{
      fontSize: 8,
      padding: '1px 5px',
      letterSpacing: 0.5,
      flexShrink: 0,
      lineHeight: 1.4,
    }}
  >
    {tag || 'C'}
  </span>
)

// ── Score Entry Modal ─────────────────────────────────────────────────
function ScoreModal({ match, onConfirm, onClose }) {
  const [s1, setS1] = useState(match.score1 ?? '')
  const [s2, setS2] = useState(match.score2 ?? '')

  const v1 = s1 === '' ? null : Number(s1)
  const v2 = s2 === '' ? null : Number(s2)
  const ready = v1 !== null && v2 !== null && !isNaN(v1) && !isNaN(v2) && v1 >= 0 && v2 >= 0

  let preview = null
  if (ready) {
    if (v1 > v2)       preview = { label: `${match.p1.name} wins`, color: 'var(--green)' }
    else if (v2 > v1)  preview = { label: `${match.p2.name} wins`, color: 'var(--green)' }
    else               preview = { label: 'Draw', color: 'var(--gold-light)' }
  }

  const handleKey = e => { if (e.key === 'Enter' && ready) onConfirm(v1, v2) }

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 2000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        className="modal-box"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        style={{ width: '100%', maxWidth: 360 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--white-soft)' }}>📊 Enter Score</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}
          >✕</button>
        </div>

        {/* Players + inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          {/* P1 */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}>
              <TinyTag tag={match.p1.tag} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white-soft)', marginBottom: 8 }}>{match.p1.name}</div>
            <input
              type="number" min={0}
              value={s1}
              onChange={e => setS1(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
              placeholder="0"
              style={{
                width: '100%', padding: '12px 8px', textAlign: 'center',
                fontSize: 28, fontWeight: 800,
                background: 'var(--surface3)', border: '1px solid var(--border2)',
                borderRadius: 10, color: 'var(--white-soft)', outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
              }}
            />
          </div>

          {/* VS divider */}
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: 2 }}>VS</div>
          </div>

          {/* P2 */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}>
              <TinyTag tag={match.p2.tag} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white-soft)', marginBottom: 8 }}>{match.p2.name}</div>
            <input
              type="number" min={0}
              value={s2}
              onChange={e => setS2(e.target.value)}
              onKeyDown={handleKey}
              placeholder="0"
              style={{
                width: '100%', padding: '12px 8px', textAlign: 'center',
                fontSize: 28, fontWeight: 800,
                background: 'var(--surface3)', border: '1px solid var(--border2)',
                borderRadius: 10, color: 'var(--white-soft)', outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        </div>

        {/* Live preview */}
        <div style={{ minHeight: 24, textAlign: 'center', marginBottom: 16 }}>
          {preview && (
            <motion.div
              key={preview.label}
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 13, fontWeight: 700, color: preview.color }}
            >
              {preview.label}
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ flex: 1 }}
            onClick={onClose}
          >Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 2, opacity: ready ? 1 : 0.4, cursor: ready ? 'pointer' : 'not-allowed' }}
            disabled={!ready}
            onClick={() => onConfirm(v1, v2)}
          >✓ Confirm</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Match Row ─────────────────────────────────────────────────────────
function MatchRow({ match, onResult, onScoreEntry }) {
  const isDone = !!match.winner
  const hasScore = match.score1 != null && match.score2 != null

  return (
    <div className={`gm-row${isDone ? ' gm-done' : ''}`}>
      <button
        className={`gm-player${match.winner?.id === match.p1.id ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner?.id === match.p1.id ? null : match.p1)}
      >
        <TinyTag tag={match.p1.tag} />
        <span style={{ marginLeft: 5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.p1.name}
        </span>
        {hasScore && match.winner?.id === match.p1.id && (
          <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 800, color: 'var(--green)', paddingLeft: 6 }}>
            {match.score1}–{match.score2}
          </span>
        )}
      </button>

      <span className="gm-vs">
        {hasScore && match.winner === 'draw'
          ? <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-light)' }}>{match.score1}–{match.score2}</span>
          : 'vs'
        }
      </span>

      <button
        className={`gm-player${match.winner?.id === match.p2.id ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner?.id === match.p2.id ? null : match.p2)}
      >
        <TinyTag tag={match.p2.tag} />
        <span style={{ marginLeft: 5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.p2.name}
        </span>
        {hasScore && match.winner?.id === match.p2.id && (
          <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 800, color: 'var(--green)', paddingLeft: 6 }}>
            {match.score2}–{match.score1}
          </span>
        )}
      </button>

      {/* Score entry button */}
      <button
        className="gm-draw"
        title="Enter score"
        onClick={() => onScoreEntry(match)}
        style={{ fontSize: 14, minWidth: 34 }}
      >📊</button>

      {/* Quick draw toggle */}
      <button
        className={`gm-draw${match.winner === 'draw' ? ' gm-win' : ''}`}
        onClick={() => onResult(match.winner === 'draw' ? null : 'draw')}
        title="Mark as draw"
      >D</button>
    </div>
  )
}

// ── Standings Table ───────────────────────────────────────────────────
function StandingsTable({ standings, advancerIds, tiedIds }) {
  const hasScoreData = standings.some(s => s.scoredFor > 0 || s.scoredAgainst > 0)
  return (
    <table className="gs-table">
      <thead>
        <tr>
          <th>#</th><th>Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th>
          {hasScoreData && <th title="Score Difference">SD</th>}
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => {
          const isAdv  = advancerIds?.includes(s.id)
          const isTied = tiedIds?.includes(s.id)
          return (
            <tr
              key={s.id}
              className={[
                i < 2    ? 'gs-top'    : '',
                isAdv    ? 'gs-winner' : '',
                isTied   ? 'gs-tied'   : '',
              ].filter(Boolean).join(' ')}
            >
              <td>{i + 1}</td>
              <td>
                {/* Single flex row — emoji + tiny tag + name, no wrapping */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', minWidth: 0 }}>
                  {i === 0 && isAdv && <span title="Winner" style={{ flexShrink: 0 }}>🏆</span>}
                  {i === 1 && isAdv && <span title="Runner-up" style={{ flexShrink: 0 }}>⭐</span>}
                  {isTied           && <span title="Tied" style={{ flexShrink: 0 }}>⚖️</span>}
                  <TinyTag tag={s.tag} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </span>
                </div>
              </td>
              <td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td>
              <td><strong>{s.points}</strong></td>
              {hasScoreData && (
                <td style={{ color: s.scoreDiff > 0 ? 'var(--green)' : s.scoreDiff < 0 ? '#e05b4e' : 'var(--muted)', fontWeight: 700 }}>
                  {s.scoreDiff > 0 ? '+' : ''}{s.scoreDiff ?? 0}
                </td>
              )}
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
          <div className="tb-sub">
            {resolved
              ? `✅ ${remaining[0].name} advances`
              : `${remaining.length} players tied! Tap ❌ to eliminate`}
          </div>
        </div>
      </div>
      {!resolved && (
        <div className="tb-players">
          {remaining.map(p => (
            <div key={p.id} className="tb-player-row">
              <TinyTag tag={p.tag} />
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

function GroupCard({ group, allGroups, onUpdate, onUpdateWithScore, isEditing, onEditAction, eliminatedIds, onEliminate, advancersPerGroup }) {
  const [showStandings, setShowStandings] = useState(false)
  const [scoreModal, setScoreModal]       = useState(null)

  const done    = group.matches.filter(m => m.winner).length
  const total   = group.matches.length
  const pct     = total ? Math.round((done / total) * 100) : 0
  const allDone = done === total && total > 0

  const count = advancersPerGroup || 2

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

  const posEmoji = ['🏆', '⭐', '🥉', '4️⃣', '5️⃣']

  return (
    <motion.div
      className={`group-card${allDone && !isEditing ? ' group-card--done' : ''}`}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    >
      {/* Score Modal */}
      <AnimatePresence>
        {scoreModal && (
          <ScoreModal
            match={scoreModal}
            onClose={() => setScoreModal(null)}
            onConfirm={(v1, v2) => {
              onUpdateWithScore(group.id, scoreModal.id, v1, v2)
              setScoreModal(null)
            }}
          />
        )}
      </AnimatePresence>

      <div className="gc-header">
        {isEditing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <input
              value={group.name}
              onChange={e => onEditAction('rename_group', group.id, null, e.target.value)}
              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--purple-light)', padding: '8px 12px', borderRadius: 6, fontSize: 15, fontWeight: 'bold' }}
            />
            <button
              onClick={() => onEditAction('delete_group', group.id)}
              title="Delete this group"
              style={{ flexShrink: 0, background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.35)', color: '#e05b4e', padding: '8px 12px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >🗑 Delete</button>
          </div>
        ) : (
          <div className="gc-title-row">
            <span className="gc-name" style={{ color: 'var(--purple-light)' }}>{group.name}</span>
            <span className="gc-count">{group.players.length} players · top {Math.min(count, group.players.length - 1 || count)} advance</span>
          </div>
        )}

        {!isEditing && (
          <>
            <div className="gc-progress-bar">
              <div className="gc-progress-fill" style={{ width: `${pct}%`, background: 'var(--purple-light)' }} />
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
                style={{ flexShrink: 0, background: 'none', border: 'none', color: '#e05b4e', cursor: 'pointer', padding: 6, fontSize: 16 }}
              >✖</button>
            </div>
          ))}
          <button
            onClick={() => onEditAction('add_player', group.id)}
            style={{ marginTop: 8, background: 'rgba(139,92,246,0.05)', border: '1px dashed rgba(139,92,246,0.3)', color: 'var(--purple-light)', padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}
          >+ Add Player to {group.name}</button>
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
                    <span style={{ fontWeight: idx === 0 ? 800 : 700, fontSize: idx === 0 ? 14 : 13, color: idx === 0 ? 'var(--white-soft)' : 'var(--muted)' }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
                      {group.standings.find(s => s.id === p.id)?.points ?? 0}pts
                    </span>
                  </div>
                ))}
                {needsTieBreak && !tieResolved && (
                  <div style={{ fontSize: 11, color: 'var(--gold-light)', marginTop: 6, fontWeight: 600 }}>⚠️ Tie at boundary — resolve below</div>
                )}
              </div>
            </motion.div>
          )}

          {allDone && needsTieBreak && (
            <TieBreakerPanel
              groupName={group.name}
              tiedPlayers={tied.map(p => ({
                ...p,
                points:    group.standings.find(s => s.id === p.id)?.points    ?? 0,
                wins:      group.standings.find(s => s.id === p.id)?.wins      ?? 0,
                scoreDiff: group.standings.find(s => s.id === p.id)?.scoreDiff ?? 0,
              }))}
              eliminatedIds={eliminatedIds}
              onEliminate={onEliminate}
              slot={advancers.length + 1}
            />
          )}

          <div className="gc-matches">
            {group.matches.map(m => (
              <MatchRow
                key={m.id}
                match={m}
                onResult={w => onUpdate(group.id, m.id, w)}
                onScoreEntry={match => setScoreModal(match)}
              />
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

// ── Stage 2 Config Panel ──────────────────────────────────────────────
function Stage2ConfigPanel({ advancersPerGroup, maxAdvancers, onChangeAdvancers, stage2Type, onChangeType, onConfirm, onLaunch, hasStage2, totalAdvancers }) {
  const presets = [1, 2, 3, 4].filter(n => n <= maxAdvancers)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(139,92,246,0.06)',
        border: '1px solid rgba(139,92,246,0.25)',
        borderRadius: 14, padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Players advancing per group</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {presets.map(n => (
            <button key={n} onClick={() => onChangeAdvancers(n)} className={`btn btn-sm${advancersPerGroup === n ? ' btn-primary' : ' btn-ghost'}`} style={{ minWidth: 44 }}>{n}</button>
          ))}
          <input
            type="number" min={1} max={maxAdvancers} value={advancersPerGroup}
            onChange={e => { const v = Math.max(1, Math.min(maxAdvancers, Number(e.target.value) || 1)); onChangeAdvancers(v) }}
            style={{ width: 64, padding: '5px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'var(--surface3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>→ <strong style={{ color: 'var(--white-soft)' }}>{totalAdvancers}</strong> total players advance</div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Stage 2 format</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { id: 'knockout', label: '⚡ Knockout', desc: 'Single-elimination bracket' },
            { id: 'groups',   label: '🔄 New Groups', desc: 'Re-draw into new groups' },
          ].map(opt => (
            <button key={opt.id} onClick={() => onChangeType(opt.id)} style={{ flex: 1, minWidth: 140, padding: '12px 16px', borderRadius: 12, cursor: 'pointer', background: stage2Type === opt.id ? 'rgba(212,160,23,0.1)' : 'var(--surface3)', border: `1px solid ${stage2Type === opt.id ? 'rgba(212,160,23,0.45)' : 'var(--border2)'}`, color: stage2Type === opt.id ? 'var(--gold-light)' : 'var(--muted)', textAlign: 'left', position: 'relative', top: 0, boxShadow: stage2Type === opt.id ? '0 3px 0 0 #7a5500, 0 0 12px rgba(212,160,23,0.12), inset 0 1px 0 rgba(255,255,255,0.07)' : '0 2px 0 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)', transition: 'all 0.15s' }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{opt.label}</div>
              <div style={{ fontSize: 11, marginTop: 3, opacity: 0.75 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {!hasStage2 ? (
        <button className="gv-advance-btn" style={{ alignSelf: 'center' }} onClick={onConfirm}>Confirm &amp; Proceed to Stage 2 🏆</button>
      ) : (
        <button className="gv-advance-btn" style={{ alignSelf: 'center', background: 'rgba(212,160,23,0.15)', color: 'var(--gold-light)', border: '1px solid var(--gold-light)' }} onClick={onLaunch}>▶ Open Stage 2</button>
      )}
    </motion.div>
  )
}

export default function GroupView({ groups, onGroupsUpdate, onBack, onAdvanceToStage2, hasStage2 }) {
  const [isEditing, setIsEditing]             = useState(false)
  const [draftGroups, setDraftGroups]         = useState(null)
  const [showConfig, setShowConfig]           = useState(false)
  const [advancersPerGroup, setAdvancersPerGroup] = useState(2)
  const [stage2Type, setStage2Type]           = useState('knockout')

  const gridRef = useRef(null)
  const activeGroups = isEditing && draftGroups ? draftGroups : groups

  const maxAdvancers = useMemo(() => {
    if (!groups.length) return 4
    const minSize = Math.min(...groups.map(g => g.players.length))
    return Math.max(1, minSize - 1)
  }, [groups])

  const safeAdvancers = Math.min(advancersPerGroup, maxAdvancers)

  const handleStartEdit = () => { setDraftGroups(JSON.parse(JSON.stringify(groups))); setIsEditing(true) }
  const handleSaveEdit  = () => { onGroupsUpdate(draftGroups); setIsEditing(false); setDraftGroups(null) }
  const handleCancelEdit = () => { setIsEditing(false); setDraftGroups(null) }

  const handleUpdateMatch = (groupId, matchId, winner) => {
    const clearedGroups = groups.map(g => g.id === groupId ? { ...g, eliminatedIds: [] } : g)
    onGroupsUpdate(recordGroupResult(clearedGroups, groupId, matchId, winner))
    setShowConfig(false)
  }

  const handleUpdateMatchWithScore = (groupId, matchId, s1, s2) => {
    const clearedGroups = groups.map(g => g.id === groupId ? { ...g, eliminatedIds: [] } : g)
    onGroupsUpdate(recordGroupResultWithScore(clearedGroups, groupId, matchId, s1, s2))
    setShowConfig(false)
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

  const handleEliminate = (groupId, playerId) => {
    onGroupsUpdate(groups.map(g =>
      g.id === groupId ? { ...g, eliminatedIds: [...(g.eliminatedIds || []), playerId] } : g
    ))
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
      const count = Math.min(safeAdvancers, g.players.length - 1 || 1)
      const { advancers, tied, needsTieBreak } = getGroupAdvancerInfo(g, count)
      const elims = g.eliminatedIds || []
      const remainingTied = tied.filter(p => !elims.includes(p.id))
      const slotsLeft = count - advancers.length
      const tieResolved = needsTieBreak ? remainingTied.length <= slotsLeft : true
      const finalAdvancers = needsTieBreak
        ? [...advancers, ...remainingTied.slice(0, slotsLeft)]
        : advancers.slice(0, count)
      const enrich = p => { if (!p) return null; const s = g.standings.find(st => st.id === p.id); return s ? { ...p, ...s } : p }
      return { groupId: g.id, groupName: g.name, advancers: finalAdvancers.map(enrich).filter(Boolean), hasTie: needsTieBreak, tieResolved }
    })
  }, [allGroupsDone, groups, safeAdvancers])

  const allTiesResolved = allGroupsDone && groupAdvancerData.every(d => d.tieResolved)

  const allAdvancers = useMemo(() => {
    if (!allGroupsDone || !allTiesResolved) return []
    const slots = Array.from({ length: safeAdvancers }, (_, slotIdx) =>
      groupAdvancerData.map(d => d.advancers[slotIdx]).filter(Boolean).map(p => ({ ...p }))
    )
    const tagVal = { A: 3, B: 2, C: 1 }
    slots.forEach((arr, si) => {
      if (si % 2 === 1) arr.sort((a, b) => (tagVal[a.tag||'C']-tagVal[b.tag||'C']) || ((a.points||0)-(b.points||0)) || a.id.localeCompare(b.id))
      else              arr.sort((a, b) => (tagVal[b.tag||'C']-tagVal[a.tag||'C']) || ((b.points||0)-(a.points||0)) || a.id.localeCompare(b.id))
    })
    const out = []
    const maxLen = Math.max(...slots.map(s => s.length))
    for (let i = 0; i < maxLen; i++) slots.forEach(slot => { if (slot[i]) out.push(slot[i]) })
    return out
  }, [allGroupsDone, allTiesResolved, groupAdvancerData, safeAdvancers])

  const handleLaunchStage2 = () => onAdvanceToStage2 && onAdvanceToStage2(allAdvancers, stage2Type)
  const posEmoji = ['🏆', '⭐', '🥉', '4️⃣', '5️⃣']

  return (
    <div className="group-view" style={{ paddingTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24, background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border2)' }}>
        {!isEditing ? (
          <>
            <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ padding: '8px 16px' }}>⬅ Back to Setup</button>
            <button onClick={handleStartEdit} className="btn btn-sm" style={{ padding: '8px 16px', background: 'rgba(139,92,246,0.1)', color: 'var(--purple-light)', border: '1px solid rgba(139,92,246,0.4)' }}>✏️ Edit Rosters &amp; Groups</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', boxShadow: '0 0 8px var(--gold)' }} />
              <strong style={{ color: 'var(--text)', fontSize: 14 }}>Draft Mode — changes not saved yet</strong>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCancelEdit} className="btn btn-ghost btn-sm" style={{ padding: '8px 16px', color: 'var(--muted)' }}>Cancel</button>
              <button onClick={handleSaveEdit} className="btn btn-green btn-sm" style={{ padding: '8px 16px' }}>✅ Save &amp; Apply</button>
            </div>
          </>
        )}
      </div>

      {isEditing && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20, padding: 12, background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--purple-light)', borderRadius: 8, fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <div><strong>Draft Mode:</strong> Rename groups, move/add/remove players, or delete empty groups. Scores are preserved. New players get matches auto-generated.</div>
        </motion.div>
      )}

      <AnimatePresence>
        {allGroupsDone && !isEditing && (
          <motion.div className="gv-summary" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="gv-summary-title">🎉 Group Stage Complete</div>
            {!allTiesResolved ? (
              <div className="gv-summary-notice">⚠️ Some groups still have unresolved ties. Resolve them in each group first.</div>
            ) : (
              <>
                <div className="gv-summary-list">
                  {groupAdvancerData.map(d => (
                    <div key={d.groupId} className="gv-summary-group-block">
                      <div className="gv-summary-group-name">{d.groupName}</div>
                      {d.advancers.map((p, idx) => (
                        <div key={p.id} className="gv-summary-item" style={{ opacity: idx === 0 ? 1 : 0.8 }}>
                          <span className="gv-summary-pos">{posEmoji[idx] || '▶'}</span>
                          <span className="gv-summary-name">{p.name}</span>
                          <span className="gv-summary-pts">{p.points ?? 0} pts</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {!showConfig && !hasStage2 && (
                  <button className="gv-confirm-btn" onClick={() => setShowConfig(true)}>⚙️ Configure Stage 2 ({allAdvancers.length} players)</button>
                )}
                {(showConfig || hasStage2) && (
                  <Stage2ConfigPanel
                    advancersPerGroup={safeAdvancers} maxAdvancers={maxAdvancers}
                    onChangeAdvancers={n => setAdvancersPerGroup(n)}
                    stage2Type={stage2Type} onChangeType={setStage2Type}
                    onConfirm={handleLaunchStage2} onLaunch={handleLaunchStage2}
                    hasStage2={hasStage2} totalAdvancers={allAdvancers.length}
                  />
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
            onUpdateWithScore={handleUpdateMatchWithScore}
            isEditing={isEditing}
            onEditAction={handleEditAction}
            eliminatedIds={g.eliminatedIds || []}
            onEliminate={(playerId) => handleEliminate(g.id, playerId)}
            advancersPerGroup={safeAdvancers}
          />
        ))}
        {isEditing && (
          <div onClick={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.03)', border: '2px dashed rgba(139,92,246,0.3)', borderRadius: 16, minHeight: 200, cursor: 'pointer' }}>
            <div style={{ fontSize: 32, color: 'var(--purple-light)', marginBottom: 8 }}>+</div>
            <div style={{ color: 'var(--purple-light)', fontWeight: 'bold' }}>Create New Group</div>
          </div>
        )}
      </div>
    </div>
  )
}
