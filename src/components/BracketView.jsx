import React, { Suspense, lazy, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FORMATS } from '../engine/bracketEngine.js'
import Scoreboard from './Scoreboard.jsx'

const SingleElimBracket = lazy(() => import('./brackets/SingleElimBracket.jsx'))
const DoubleElimBracket = lazy(() => import('./brackets/DoubleElimBracket.jsx'))
const RoundRobinBracket = lazy(() => import('./brackets/RoundRobinBracket.jsx'))
const SwissBracket      = lazy(() => import('./brackets/SwissBracket.jsx'))

/**
 * Build standings for ONE round's worth of matches.
 */
function buildRoundStandings(roundMatches) {
  const playerMap = {}
  const ensure = (p) => {
    if (!p || p.id === 'bye') return
    if (!playerMap[p.id]) playerMap[p.id] = {
      id: p.id, name: p.name, tag: p.tag || null,
      played: 0, wins: 0, draws: 0, losses: 0, points: 0,
      scoredFor: 0, scoredAgainst: 0, scoreDiff: 0,
    }
  }

  roundMatches.forEach(match => {
    ensure(match.p1)
    ensure(match.p2)
    if (!match.winner || match.isBye) return

    const winner = match.winner === 'draw' ? 'draw' : match.winner.id
    const isP1Win = winner === match.p1.id
    const isP2Win = winner === match.p2.id

    const p1 = playerMap[match.p1.id]
    const p2 = playerMap[match.p2.id]

    if (p1 && p2) {
      if (match.score1 != null && match.score2 != null) {
        p1.scoredFor += match.score1; p1.scoredAgainst += match.score2
        p2.scoredFor += match.score2; p2.scoredAgainst += match.score1
      }
      if (winner === 'draw') {
        p1.draws++; p1.points++; p1.played++
        p2.draws++; p2.points++; p2.played++
      } else if (isP1Win) {
        p1.wins++; p1.points += 3; p1.played++
        p2.losses++; p2.played++
      } else if (isP2Win) {
        p2.wins++; p2.points += 3; p2.played++
        p1.losses++; p1.played++
      }
    }
  })

  const arr = Object.values(playerMap)
  arr.forEach(s => { s.scoreDiff = s.scoredFor - s.scoredAgainst })
  arr.sort((a, b) =>
    (b.points - a.points) ||
    (b.scoreDiff - a.scoreDiff) ||
    (b.scoredFor - a.scoredFor) ||
    a.name.localeCompare(b.name)
  )
  return arr
}

// ── Advancer Selection Modal ──────────────────────────────────────────────
function SelectAdvancersModal({ standings, defaultCount, onConfirm, onClose }) {
  const [selected, setSelected] = useState(() => new Set(standings.slice(0, defaultCount).map(p => p.id)))

  const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectTop = (n) => setSelected(new Set(standings.slice(0, n).map(p => p.id)))

  const count = selected.size
  const posEmoji = ['🏆','⭐','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣']

  const quickOptions = []
  for (let n = 2; n <= Math.min(standings.length, 16); n += 2) quickOptions.push(n)

  return (
    <div className="modal-overlay" style={{ zIndex: 3000, alignItems: 'flex-start', paddingTop: 32 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 24 }}
        style={{ background: 'rgba(16,14,31,0.98)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: 20, padding: '24px 0 0', width: '100%', maxWidth: 560, maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', boxShadow: '0 0 60px rgba(139,92,246,0.18), 0 24px 64px rgba(0,0,0,0.7)' }}
      >
        <div style={{ padding: '0 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--white-soft)' }}>🏆 Select Advancers</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Players ranked by final leaderboard</div>
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
          {standings.map((p, globalRank) => {
            const isSelected = selected.has(p.id)
            return (
              <button key={p.id} onClick={() => toggle(p.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', textAlign: 'left', background: isSelected ? 'rgba(34,214,122,0.10)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isSelected ? 'rgba(34,214,122,0.42)' : 'rgba(255,255,255,0.07)'}`, boxShadow: isSelected ? '0 0 12px rgba(34,214,122,0.09)' : 'none', transition: 'all 0.15s' }}>
                <div style={{ width: 26, flexShrink: 0, textAlign: 'center', fontSize: 14 }}>
                  {isSelected ? (posEmoji[Array.from(selected).indexOf(p.id)] || '✅') : <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>#{globalRank + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {p.wins}W {p.draws || 0}D {p.losses}L
                    {p.scoreDiff != null && (p.scoredFor > 0 || p.scoredAgainst > 0) ? ` · SD ${p.scoreDiff > 0 ? '+' : ''}${p.scoreDiff}` : ''}
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
          <button className="btn btn-sm" style={{ flex: 2, background: count === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(34,214,122,0.14)', border: `1px solid ${count === 0 ? 'var(--border2)' : 'rgba(34,214,122,0.45)'}`, color: count === 0 ? 'var(--muted)' : 'var(--green)', fontWeight: 800, fontSize: 14, opacity: count === 0 ? 0.5 : 1, cursor: count === 0 ? 'not-allowed' : 'pointer', padding: '10px 0' }} disabled={count === 0} onClick={() => onConfirm(standings.filter(p => selected.has(p.id)))}>
            Advance {count} Player{count !== 1 ? 's' : ''} →
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Stage 2 Launcher Panel ────────────────────────────────────────────────
function Stage2Launcher({ bracket, onAdvance }) {
  const [showModal, setShowModal] = useState(false)
  const [stage2Type, setStage2Type] = useState('knockout')
  const [confirmedAdvancers, setConfirmedAdvancers] = useState(null)

  const standings = bracket.standings || []
  const defaultSelectCount = Math.min(4, standings.length)
  const finalAdvancerList = confirmedAdvancers || standings.slice(0, defaultSelectCount)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 32, background: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: '16px 20px', border: '1px solid rgba(212,160,23,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 20 }}>🏆</span>
        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--gold-light)' }}>Tournament Complete!</div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        <strong style={{ color: 'var(--white-soft)' }}>{finalAdvancerList.length} players</strong> selected to advance to Stage 2.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[{ id: 'knockout', label: '🥊 Single Elimination', desc: 'Knockout bracket' }, { id: 'groups', label: '👥 New Group Stage', desc: 'Draw into new groups' }].map(opt => (
          <button key={opt.id} onClick={() => setStage2Type(opt.id)}
            style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', background: stage2Type === opt.id ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${stage2Type === opt.id ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`, color: stage2Type === opt.id ? 'var(--purple-light)' : 'var(--muted)', transition: 'all 0.15s' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.label}</div>
            <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-sm" style={{ flex: 1, minWidth: 160, background: 'rgba(34,214,122,0.1)', border: '1px solid rgba(34,214,122,0.4)', color: 'var(--green)', fontWeight: 800 }}
          onClick={() => setShowModal(true)}>
          ✏️ Select Players
        </button>
        <button className="btn btn-primary btn-sm" style={{ flex: 2, minWidth: 180 }}
          onClick={() => onAdvance(finalAdvancerList, stage2Type)}>
          🚀 Launch Stage 2 →
        </button>
      </div>

      <AnimatePresence>
        {showModal && (
          <SelectAdvancersModal
            standings={standings}
            defaultCount={defaultSelectCount}
            onConfirm={(picked) => { setConfirmedAdvancers(picked); setShowModal(false) }}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function BracketView({ tournament, onUpdate, onReset, onAdvanceToStage2, onGoToStage2, hasStage2 }) {
  const format = tournament.format || tournament.bracket?.type
  const bracket = tournament.bracket
  const fmtMeta = FORMATS.find(f => f.id === format)

  const scoreboardGroups = useMemo(() => {
    if (!bracket || !bracket.rounds) return []
    if (bracket.type === 'single_elim' || bracket.type === 'stage2_elim') {
      const activeRound = bracket.rounds.find(r => r.some(m => !m.winner))
      if (!activeRound) return []
      const roundStandings = buildRoundStandings(activeRound)
      if (roundStandings.length === 0) return []
      
      // FIX: Added 'players' and 'matches' fallbacks so Scoreboard.jsx doesn't crash on .length reductions
      return [{ 
        id: 'active_round', 
        name: 'Active Round', 
        standings: roundStandings,
        players: roundStandings, 
        matches: activeRound 
      }]
    }
    return []
  }, [bracket])

  return (
    <div className="bv-container" style={{ paddingBottom: 64 }}>
      <div className="bv-header">
        <div>
          <div className="bv-title">{tournament.title || 'Bracket Draw'}</div>
          <div className="bv-meta">
            <span className={`tag ${fmtMeta?.color || 'tag-blue'}`}>{fmtMeta?.tag || 'SE'}</span>
            <span>{fmtMeta?.label || 'Single Elimination'}</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>{tournament.players?.length || 0} players</span>
          </div>
        </div>
        
        {/* Reset button hidden if Stage 2 is active to prevent destroying parent tournament accidentally */}
        {!hasStage2 && (
          <button className="btn btn-ghost btn-sm hide-mob" onClick={onReset} style={{ marginLeft: 'auto' }}>
            ✕ Close
          </button>
        )}
        
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

      {scoreboardGroups.length > 0 && (
        <Scoreboard groups={scoreboardGroups} />
      )}

      <div className="landscape-hint">🔄 Rotate to landscape for best bracket view</div>

      <Suspense fallback={<div style={{ textAlign: 'center', padding: 20 }}>Loading Bracket...</div>}>
        {format === 'single_elim' && <SingleElimBracket bracket={bracket} onUpdate={onUpdate} />}
        {format === 'stage2_elim' && <SingleElimBracket bracket={bracket} onUpdate={onUpdate} />}
        {format === 'double_elim' && <DoubleElimBracket bracket={bracket} onUpdate={onUpdate} />}
        {format === 'round_robin' && <RoundRobinBracket bracket={bracket} onUpdate={onUpdate} />}
        {format === 'swiss'       && <SwissBracket      bracket={bracket} onUpdate={onUpdate} />}
      </Suspense>

      {/* ── Leaderboard Bracket "Advance to Stage 2" Launcher ── */}
      {bracket.champion && (format === 'round_robin' || format === 'swiss') && (
         hasStage2 ? (
           <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 32, background: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: '16px 20px', border: '1px solid rgba(212,160,23,0.25)' }}>
             <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--gold-light)', marginBottom: 12 }}>Stage 2 has already been generated.</div>
             <button className="btn btn-primary" style={{ width: '100%', fontWeight: 800 }} onClick={onGoToStage2}>🚀 Go to Stage 2 →</button>
           </motion.div>
         ) : (
           <Stage2Launcher bracket={bracket} onAdvance={onAdvanceToStage2} />
         )
      )}
    </div>
  )
}