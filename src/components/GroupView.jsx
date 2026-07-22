import React, { useState, useMemo, useRef, useCallback, memo } from 'react'
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

// ── Static animation variants (defined outside to avoid re-creation per render)
const MODAL_VARIANTS = {
  initial: { opacity: 0, scale: 0.92, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit:    { opacity: 0, scale: 0.92, y: 20 },
}
const CARD_VARIANTS = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}
const FADE_SLIDE = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0 },
}
const WINNER_VARIANTS = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
}
const ADVANCER_MODAL_VARIANTS = {
  initial: { opacity: 0, scale: 0.94, y: 24 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit:    { opacity: 0, scale: 0.94, y: 24 },
}
const POS_EMOJI = ['🏆', '⭐', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣']
const SCROLL_AMOUNT = 360

// ── Confirm Modal (reused for all dangerous actions) ──────────────────
const ConfirmModal = memo(function ConfirmModal({ msg, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 2500 }}>
      <motion.div className="modal-box"
        initial={{ scale: 0.88, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}>
        <div className="modal-icon">⚠️</div>
        <div className="modal-msg">{msg}</div>
        <div className="modal-btns">
          <button className="btn btn-ghost" onClick={onCancel} style={{ minWidth: 90 }}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} style={{ minWidth: 90 }}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  )
})

// ── TinyTag — pure, no internal state, memoised ───────────────────────
const TinyTag = memo(({ tag }) => (
  <span
    className={`tag ${TAG_META[tag || 'C']?.badge || 'tag-green'}`}
    style={{ fontSize: 8, padding: '1px 5px', letterSpacing: 0.5, flexShrink: 0, lineHeight: 1.4 }}
  >{tag || 'C'}</span>
))
TinyTag.displayName = 'TinyTag'

// ── Score Entry Modal ─────────────────────────────────────────────────
const ScoreModal = memo(function ScoreModal({ match, onConfirm, onClose }) {
  const [s1, setS1] = useState(match.score1 ?? '')
  const [s2, setS2] = useState(match.score2 ?? '')
  const v1 = s1 === '' ? null : Number(s1)
  const v2 = s2 === '' ? null : Number(s2)
  const ready = v1 !== null && v2 !== null && !isNaN(v1) && !isNaN(v2) && v1 >= 0 && v2 >= 0

  const preview = useMemo(() => {
    if (!ready) return null
    if (v1 > v2) return { label: `${match.p1.name} wins`, color: 'var(--green)' }
    if (v2 > v1) return { label: `${match.p2.name} wins`, color: 'var(--green)' }
    return { label: 'Draw', color: 'var(--gold-light)' }
  }, [ready, v1, v2, match.p1.name, match.p2.name])

  const handleKey     = useCallback((e) => { if (e.key === 'Enter' && ready) onConfirm(v1, v2) }, [ready, v1, v2, onConfirm])
  const handleConfirm = useCallback(() => onConfirm(v1, v2), [onConfirm, v1, v2])

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div className="modal-box" variants={MODAL_VARIANTS} initial="initial" animate="animate" exit="exit" style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--white-soft)' }}>📊 Enter Score</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}><TinyTag tag={match.p1.tag} /></div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white-soft)', marginBottom: 8 }}>{match.p1.name}</div>
            <input type="number" min={0} value={s1} onChange={e => setS1(e.target.value)} onKeyDown={handleKey} autoFocus placeholder="0" style={{ width: '100%', padding: '12px 8px', textAlign: 'center', fontSize: 28, fontWeight: 800, background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--white-soft)', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }} />
          </div>
          <div style={{ flexShrink: 0, textAlign: 'center' }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: 2 }}>VS</div></div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}><TinyTag tag={match.p2.tag} /></div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white-soft)', marginBottom: 8 }}>{match.p2.name}</div>
            <input type="number" min={0} value={s2} onChange={e => setS2(e.target.value)} onKeyDown={handleKey} placeholder="0" style={{ width: '100%', padding: '12px 8px', textAlign: 'center', fontSize: 28, fontWeight: 800, background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--white-soft)', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }} />
          </div>
        </div>
        <div style={{ minHeight: 24, textAlign: 'center', marginBottom: 16 }}>
          {preview && (
            <motion.div key={preview.label} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 13, fontWeight: 700, color: preview.color }}>
              {preview.label}
            </motion.div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" style={{ flex: 2, opacity: ready ? 1 : 0.4, cursor: ready ? 'pointer' : 'not-allowed' }} disabled={!ready} onClick={handleConfirm}>✓ Confirm</button>
        </div>
      </motion.div>
    </div>
  )
})

// ── Match Row ─────────────────────────────────────────────────────────
const MatchRow = memo(function MatchRow({ match, onResult, onScoreEntry }) {
  const isDone  = !!match.winner
  const hasScore = match.score1 != null && match.score2 != null

  const handleP1Click   = useCallback(() => onResult(match.winner?.id === match.p1.id ? null : match.p1), [match, onResult])
  const handleP2Click   = useCallback(() => onResult(match.winner?.id === match.p2.id ? null : match.p2), [match, onResult])
  const handleDrawClick = useCallback(() => onResult(match.winner === 'draw' ? null : 'draw'), [match, onResult])
  const handleScoreClick = useCallback(() => onScoreEntry(match), [match, onScoreEntry])

  return (
    <div className={`gm-row${isDone ? ' gm-done' : ''}`}>
      <button className={`gm-player${match.winner?.id === match.p1.id ? ' gm-win' : ''}`} onClick={handleP1Click}>
        <TinyTag tag={match.p1.tag} />
        <span style={{ marginLeft: 5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.p1.name}</span>
        {hasScore && match.winner?.id === match.p1.id && <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 800, color: 'var(--green)', paddingLeft: 6 }}>{match.score1}–{match.score2}</span>}
      </button>
      <span className="gm-vs">{hasScore && match.winner === 'draw' ? <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-light)' }}>{match.score1}–{match.score2}</span> : 'vs'}</span>
      <button className={`gm-player${match.winner?.id === match.p2.id ? ' gm-win' : ''}`} onClick={handleP2Click}>
        <TinyTag tag={match.p2.tag} />
        <span style={{ marginLeft: 5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.p2.name}</span>
        {hasScore && match.winner?.id === match.p2.id && <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 800, color: 'var(--green)', paddingLeft: 6 }}>{match.score2}–{match.score1}</span>}
      </button>
      <button className="gm-draw" title="Enter score" onClick={handleScoreClick} style={{ fontSize: 14, minWidth: 34 }}>📊</button>
      <button className={`gm-draw${match.winner === 'draw' ? ' gm-win' : ''}`} onClick={handleDrawClick} title="Mark as draw">D</button>
    </div>
  )
})

// ── Standings Table ───────────────────────────────────────────────────
const StandingsTable = memo(function StandingsTable({ standings, advancerIds, tiedIds }) {
  const hasScoreData = useMemo(() => standings.some(s => s.scoredFor > 0 || s.scoredAgainst > 0), [standings])
  return (
    <table className="gs-table">
      <thead>
        <tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th>{hasScoreData && <th title="Score Difference">SD</th>}</tr>
      </thead>
      <tbody>
        {standings.map((s, i) => {
          const isAdv  = advancerIds?.includes(s.id)
          const isTied = tiedIds?.includes(s.id)
          return (
            <tr key={s.id} className={[i < 2 ? 'gs-top' : '', isAdv ? 'gs-winner' : '', isTied ? 'gs-tied' : ''].filter(Boolean).join(' ')}>
              <td>{i + 1}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', minWidth: 0 }}>
                  {i === 0 && isAdv && <span style={{ flexShrink: 0 }}>🏆</span>}
                  {i === 1 && isAdv && <span style={{ flexShrink: 0 }}>⭐</span>}
                  {isTied && <span style={{ flexShrink: 0 }}>⚖️</span>}
                  <TinyTag tag={s.tag} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
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
})

// ── Tie Breaker Panel ─────────────────────────────────────────────────
const TieBreakerPanel = memo(function TieBreakerPanel({ groupName, tiedPlayers, eliminatedIds, onEliminate, slot }) {
  const remaining = useMemo(() => tiedPlayers.filter(p => !eliminatedIds.includes(p.id)), [tiedPlayers, eliminatedIds])
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
})

// ── Select Advancers Modal ────────────────────────────────────────────
const SelectAdvancersModal = memo(function SelectAdvancersModal({ groups, defaultCount, onConfirm, onClose }) {
  const allPlayers = useMemo(() => {
    const rows = []
    groups.forEach(g => {
      g.standings.forEach((s, rank) => rows.push({ ...s, groupId: g.id, groupName: g.name, rank }))
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

  const toggle    = useCallback((id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }), [])
  const selectTop = useCallback((n) => setSelected(new Set(allPlayers.slice(0, n).map(p => p.id))), [allPlayers])

  const count     = selected.size
  const hasScores = useMemo(() => allPlayers.some(p => p.scoredFor > 0 || p.scoredAgainst > 0), [allPlayers])

  const quickOptions = useMemo(() => {
    const opts = []
    for (let n = 2; n <= Math.min(allPlayers.length - 1, 12); n += (allPlayers.length > 10 ? 2 : 1)) opts.push(n)
    return opts
  }, [allPlayers.length])

  const handleConfirm = useCallback(() => onConfirm(allPlayers.filter(p => selected.has(p.id))), [onConfirm, allPlayers, selected])
  const selectedArr   = useMemo(() => Array.from(selected), [selected])

  return (
    <div className="modal-overlay" style={{ zIndex: 3000, alignItems: 'flex-start', paddingTop: 32 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div
        variants={ADVANCER_MODAL_VARIANTS}
        initial="initial" animate="animate" exit="exit"
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
                  {isSelected ? (POS_EMOJI[selectedArr.indexOf(p.id)] || '✅') : <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>#{globalRank + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <TinyTag tag={p.tag} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--green)' : 'var(--white-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
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
          <button className="btn btn-sm" style={{ flex: 2, background: count === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(34,214,122,0.14)', border: `1px solid ${count === 0 ? 'var(--border2)' : 'rgba(34,214,122,0.45)'}`, color: count === 0 ? 'var(--muted)' : 'var(--green)', fontWeight: 800, fontSize: 14, opacity: count === 0 ? 0.5 : 1, cursor: count === 0 ? 'not-allowed' : 'pointer', padding: '10px 0' }} disabled={count === 0} onClick={handleConfirm}>
            Advance {count} Player{count !== 1 ? 's' : ''} →
          </button>
        </div>
      </motion.div>
    </div>
  )
})

// ── Group Card ────────────────────────────────────────────────────────
const GroupCard = memo(function GroupCard({ group, allGroups, onUpdate, onUpdateWithScore, isEditing, onEditAction, eliminatedIds, onEliminate, advancersPerGroup }) {
  const [showStandings, setShowStandings] = useState(false)
  const [scoreModal, setScoreModal]       = useState(null)
  // Confirmation state for destructive edit actions
  const [confirmDeleteGroup,  setConfirmDeleteGroup]  = useState(false)
  const [confirmRemovePlayer, setConfirmRemovePlayer] = useState(null) // player id

  const done    = useMemo(() => group.matches.filter(m => m.winner).length, [group.matches])
  const total   = group.matches.length
  const pct     = total ? Math.round((done / total) * 100) : 0
  const allDone = done === total && total > 0

  const maxForThisGroup = Math.max(1, group.players.length - 1)
  const count = Math.min(advancersPerGroup || 2, maxForThisGroup)

  const advancerInfo = useMemo(() => {
    if (!allDone) return { advancers: [], tied: [], needsTieBreak: false }
    return getGroupAdvancerInfo(group, count)
  }, [allDone, group, count])

  const { advancers, tied, needsTieBreak } = advancerInfo

  const remainingTied = useMemo(() => tied.filter(p => !eliminatedIds.includes(p.id)), [tied, eliminatedIds])
  const tieResolved   = needsTieBreak ? remainingTied.length <= (count - advancers.length) : true

  const finalAdvancers = useMemo(() => {
    if (needsTieBreak) return [...advancers, ...remainingTied.slice(0, count - advancers.length)]
    return advancers.slice(0, count)
  }, [needsTieBreak, advancers, remainingTied, count])

  const advancerIds = useMemo(() => finalAdvancers.map(p => p.id).filter(Boolean), [finalAdvancers])
  const tiedIds     = useMemo(() => needsTieBreak && !tieResolved ? tied.map(t => t.id) : [], [needsTieBreak, tieResolved, tied])

  const tieBreakerPlayers = useMemo(() => tied.map(p => ({
    ...p,
    points:    group.standings.find(s => s.id === p.id)?.points    ?? 0,
    wins:      group.standings.find(s => s.id === p.id)?.wins      ?? 0,
    scoreDiff: group.standings.find(s => s.id === p.id)?.scoreDiff ?? 0,
  })), [tied, group.standings])

  const handleScoreModalClose   = useCallback(() => setScoreModal(null), [])
  const handleScoreModalConfirm = useCallback((v1, v2) => {
    onUpdateWithScore(group.id, scoreModal.id, v1, v2)
    setScoreModal(null)
  }, [group.id, scoreModal, onUpdateWithScore])

  const toggleStandings = useCallback(() => setShowStandings(s => !s), [])

  return (
    <motion.div className={`group-card${allDone && !isEditing ? ' group-card--done' : ''}`} variants={CARD_VARIANTS} initial="initial" animate="animate">
      <AnimatePresence>
        {scoreModal && (
          <ScoreModal match={scoreModal} onClose={handleScoreModalClose} onConfirm={handleScoreModalConfirm} />
        )}
        {confirmDeleteGroup && (
          <ConfirmModal
            msg={`Delete the entire group "${group.name}"? All players and matches in this group will be removed.`}
            confirmLabel="Delete Group"
            onConfirm={() => { onEditAction('delete_group', group.id); setConfirmDeleteGroup(false) }}
            onCancel={() => setConfirmDeleteGroup(false)}
          />
        )}
        {confirmRemovePlayer !== null && (
          <ConfirmModal
            msg={`Remove "${group.players.find(p => p.id === confirmRemovePlayer)?.name || 'this player'}" from ${group.name}?`}
            confirmLabel="Remove"
            onConfirm={() => { onEditAction('remove_player', group.id, confirmRemovePlayer); setConfirmRemovePlayer(null) }}
            onCancel={() => setConfirmRemovePlayer(null)}
          />
        )}
      </AnimatePresence>

      <div className="gc-header">
        {isEditing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <input value={group.name} onChange={e => onEditAction('rename_group', group.id, null, e.target.value)}
              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--purple-light)', padding: '8px 12px', borderRadius: 6, fontSize: 15, fontWeight: 'bold' }} />
            <button onClick={() => setConfirmDeleteGroup(true)} title="Delete this group"
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
                style={{ flex: '1 1 80px', minWidth: 60, background: 'none', border: 'none', color: 'var(--text)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: 6, fontSize: 14, outline: 'none' }} />
              <select value={p.tag} onChange={e => onEditAction('update_player', group.id, p.id, { tag: e.target.value })}
                style={{ flexShrink: 0, width: 48, background: 'var(--surface)', border: `1px solid ${TAG_META[p.tag || 'C'].color}`, color: TAG_META[p.tag || 'C'].color, padding: '6px 4px', borderRadius: 6, fontWeight: 'bold', outline: 'none', textAlign: 'center', cursor: 'pointer' }}>
                <option value="A">A</option><option value="B">B</option><option value="C">C</option>
              </select>
              <select value={group.id} onChange={e => onEditAction('move_player', group.id, p.id, e.target.value)}
                style={{ flexShrink: 0, width: 88, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', padding: 6, borderRadius: 6, fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                {allGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button onClick={() => setConfirmRemovePlayer(p.id)} title="Remove Player"
                style={{ flexShrink: 0, background: 'none', border: 'none', color: '#e05b4e', cursor: 'pointer', padding: 6, fontSize: 16 }}>✖</button>
            </div>
          ))}
          <button onClick={() => onEditAction('add_player', group.id)}
            style={{ marginTop: 8, background: 'rgba(139,92,246,0.05)', border: '1px dashed rgba(139,92,246,0.3)', color: 'var(--purple-light)', padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>+ Add Player to {group.name}</button>
        </div>
      ) : (
        <>
          {allDone && finalAdvancers.length > 0 && (
            <motion.div className="gc-winner-banner" variants={WINNER_VARIANTS} initial="initial" animate="animate">
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Advancing</div>
                {finalAdvancers.map((p, idx) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: idx < finalAdvancers.length - 1 ? 4 : 0 }}>
                    <span style={{ fontSize: 15 }}>{POS_EMOJI[idx] || '▶'}</span>
                    <span style={{ fontWeight: idx === 0 ? 800 : 700, fontSize: idx === 0 ? 14 : 13, color: idx === 0 ? 'var(--white-soft)' : 'var(--muted)' }}>{p.name}</span>
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
              tiedPlayers={tieBreakerPlayers}
              eliminatedIds={eliminatedIds}
              onEliminate={onEliminate}
              slot={advancers.length + 1}
            />
          )}
          <div className="gc-matches">
            {group.matches.map(m => (
              <MatchRow key={m.id} match={m} onResult={w => onUpdate(group.id, m.id, w)} onScoreEntry={setScoreModal} />
            ))}
          </div>
          <button className="gc-standings-toggle" onClick={toggleStandings}>
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
})

// ── Main GroupView ────────────────────────────────────────────────────
export default function GroupView({ groups, onGroupsUpdate, onBack, onAdvanceToStage2, hasStage2 }) {
  const [isEditing, setIsEditing]                   = useState(false)
  const [draftGroups, setDraftGroups]               = useState(null)
  const [showAdvancerModal, setShowAdvancerModal]   = useState(false)
  const [advancersPerGroup, setAdvancersPerGroup]   = useState(2)
  const [stage2Type, setStage2Type]                 = useState('knockout')
  const [confirmedAdvancers, setConfirmedAdvancers] = useState(null)
  const [showStage2Config, setShowStage2Config]     = useState(false)

  const gridRef      = useRef(null)
  const activeGroups = isEditing && draftGroups ? draftGroups : groups

  const maxAdvancers = useMemo(() => {
    if (!groups.length) return 4
    const maxSize = Math.max(...groups.map(g => g.players.length))
    return Math.max(1, maxSize - 1)
  }, [groups])

  const safeAdvancers = Math.min(advancersPerGroup, maxAdvancers)

  const handleStartEdit  = useCallback(() => { setDraftGroups(JSON.parse(JSON.stringify(groups))); setIsEditing(true) }, [groups])
  const handleSaveEdit   = useCallback(() => { onGroupsUpdate(draftGroups); setIsEditing(false); setDraftGroups(null) }, [draftGroups, onGroupsUpdate])
  const handleCancelEdit = useCallback(() => { setIsEditing(false); setDraftGroups(null) }, [])

  const resetStage2Flow = useCallback(() => { setConfirmedAdvancers(null); setShowStage2Config(false); setShowAdvancerModal(false) }, [])

  const handleUpdateMatch = useCallback((groupId, matchId, winner) => {
    const cleared = groups.map(g => g.id === groupId ? { ...g, eliminatedIds: [] } : g)
    onGroupsUpdate(recordGroupResult(cleared, groupId, matchId, winner))
    resetStage2Flow()
  }, [groups, onGroupsUpdate, resetStage2Flow])

  const handleUpdateMatchWithScore = useCallback((groupId, matchId, s1, s2) => {
    const cleared = groups.map(g => g.id === groupId ? { ...g, eliminatedIds: [] } : g)
    onGroupsUpdate(recordGroupResultWithScore(cleared, groupId, matchId, s1, s2))
    resetStage2Flow()
  }, [groups, onGroupsUpdate, resetStage2Flow])

  const handleEditAction = useCallback((action, groupId, playerId, payload) => {
    setDraftGroups(prev => {
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

  const handleCreateGroup = useCallback(() => setDraftGroups(prev => createNewGroup(prev)), [])

  const handleEliminate = useCallback((groupId, playerId) => {
    onGroupsUpdate(groups.map(g =>
      g.id === groupId ? { ...g, eliminatedIds: [...(g.eliminatedIds || []), playerId] } : g
    ))
    resetStage2Flow()
  }, [groups, onGroupsUpdate, resetStage2Flow])

  const scrollLeft  = useCallback(() => gridRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' }), [])
  const scrollRight = useCallback(() => gridRef.current?.scrollBy({ left:  SCROLL_AMOUNT, behavior: 'smooth' }), [])

  const allGroupsDone = useMemo(() => !isEditing && groups.every(
    g => g.matches.every(m => m.winner !== null) && g.matches.length > 0
  ), [isEditing, groups])

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
    const effectiveTotal = groups.reduce((sum, g) =>
      sum + Math.min(safeAdvancers, Math.max(1, g.players.length - 1)), 0)
    return Math.max(1, Math.min(effectiveTotal, total - 1))
  }, [groups, safeAdvancers])

  const finalAdvancerList = useMemo(() => {
    if (confirmedAdvancers) 