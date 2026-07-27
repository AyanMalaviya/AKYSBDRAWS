import React, { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TAG_META } from '../engine/groupEngine.js'

const tagColor = (tag) => TAG_META[tag || 'C']?.color || TAG_META['C'].color

function ScoreModal({ match, bestOf = 1, onConfirm, onClose }) {
  const [sets, setSets] = useState(() => {
    if (bestOf === 1 && match.score1 != null) {
      return [{ s1: match.score1, s2: match.score2 }]
    }
    return Array.from({ length: bestOf }, () => ({ s1: '', s2: '' }))
  })

  const updateSet = (index, field, val) => {
    setSets(prev => prev.map((s, i) => i === index ? { ...s, [field]: val } : s))
  }

  const targetWins = Math.ceil(bestOf / 2)
  let currentP1Wins = 0
  let currentP2Wins = 0
  let validSetsCount = 0

  const setStatuses = sets.map((set) => {
    const v1 = set.s1 === '' ? null : Number(set.s1)
    const v2 = set.s2 === '' ? null : Number(set.s2)
    const isValid = v1 !== null && v2 !== null && !isNaN(v1) && !isNaN(v2) && v1 >= 0 && v2 >= 0
    const isNeeded = currentP1Wins < targetWins && currentP2Wins < targetWins

    if (isValid && isNeeded) {
      validSetsCount++
      if (v1 > v2) currentP1Wins++
      else if (v2 > v1) currentP2Wins++
    }
    return { isValid, isNeeded, v1, v2 }
  })

  let ready = false
  let finalS1 = null
  let finalS2 = null
  let preview = null

  if (bestOf === 1) {
    ready = validSetsCount === 1
    if (ready) {
      finalS1 = setStatuses[0].v1
      finalS2 = setStatuses[0].v2
      if (finalS1 > finalS2) preview = { label: `${match.p1.name} wins`, color: 'var(--green)' }
      else if (finalS2 > finalS1) preview = { label: `${match.p2.name} wins`, color: 'var(--green)' }
      else preview = { label: 'Draw', color: 'var(--gold-light)' }
    }
  } else {
    ready = currentP1Wins === targetWins || currentP2Wins === targetWins
    if (ready) {
      finalS1 = currentP1Wins
      finalS2 = currentP2Wins
      if (finalS1 > finalS2) preview = { label: `${match.p1.name} wins series ${finalS1}-${finalS2}`, color: 'var(--green)' }
      else preview = { label: `${match.p2.name} wins series ${finalS2}-${finalS1}`, color: 'var(--green)' }
    }
  }

  const handleKey = e => { if (e.key === 'Enter' && ready) onConfirm(finalS1, finalS2) }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        style={{
          background: 'rgba(16,14,31,0.98)', border: '1px solid rgba(0,212,255,0.25)',
          borderRadius: 18, padding: 24, width: '100%', maxWidth: 360,
          boxShadow: '0 0 40px rgba(0,212,255,0.12), 0 24px 48px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--white-soft)' }}>
            📊 Enter Score {bestOf > 1 ? `(Best of ${bestOf})` : ''}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {bestOf === 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: tagColor(match.p1.tag), marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {match.p1.name}
              </div>
              <input
                type="number" min={0} value={sets[0].s1} autoFocus
                onChange={e => updateSet(0, 's1', e.target.value)} onKeyDown={handleKey}
                placeholder="0"
                style={{
                  width: '100%', padding: '12px 8px', textAlign: 'center', fontSize: 28, fontWeight: 800,
                  background: 'var(--surface3, rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, color: 'var(--white-soft)', outline: 'none',
                }}
              />
            </div>
            <div style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: 2 }}>VS</div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: tagColor(match.p2.tag), marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {match.p2.name}
              </div>
              <input
                type="number" min={0} value={sets[0].s2}
                onChange={e => updateSet(0, 's2', e.target.value)} onKeyDown={handleKey}
                placeholder="0"
                style={{
                  width: '100%', padding: '12px 8px', textAlign: 'center', fontSize: 28, fontWeight: 800,
                  background: 'var(--surface3, rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, color: 'var(--white-soft)', outline: 'none',
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px' }}>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, color: tagColor(match.p1.tag), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.p1.name}</div>
              <div style={{ width: 44, textAlign: 'center', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Set</div>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, color: tagColor(match.p2.tag), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.p2.name}</div>
            </div>
            {sets.map((set, i) => {
              const isDisabled = !setStatuses[i].isNeeded;
              const isP1Win = setStatuses[i].isValid && setStatuses[i].v1 > setStatuses[i].v2;
              const isP2Win = setStatuses[i].isValid && setStatuses[i].v2 > setStatuses[i].v1;
              
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: isDisabled ? 0.25 : 1, transition: 'opacity 0.2s' }}>
                  <input
                    type="number" min={0} value={set.s1}
                    disabled={isDisabled}
                    onChange={e => updateSet(i, 's1', e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="-"
                    style={{
                      flex: 1, padding: '8px', textAlign: 'center', fontSize: 22, fontWeight: 800,
                      background: 'var(--surface3, rgba(255,255,255,0.06))',
                      border: `1px solid ${isP1Win ? 'rgba(34,214,122,0.4)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 10, color: isP1Win ? 'var(--green)' : 'var(--white-soft)', outline: 'none',
                    }}
                  />
                  <div style={{ width: 44, textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>#{i + 1}</div>
                  <input
                    type="number" min={0} value={set.s2}
                    disabled={isDisabled}
                    onChange={e => updateSet(i, 's2', e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="-"
                    style={{
                      flex: 1, padding: '8px', textAlign: 'center', fontSize: 22, fontWeight: 800,
                      background: 'var(--surface3, rgba(255,255,255,0.06))',
                      border: `1px solid ${isP2Win ? 'rgba(34,214,122,0.4)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 10, color: isP2Win ? 'var(--green)' : 'var(--white-soft)', outline: 'none',
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}

        <div style={{ minHeight: 24, textAlign: 'center', marginBottom: 16 }}>
          {preview && (
            <motion.div
              key={preview.label}
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 13, fontWeight: 700, color: preview.color }}
            >{preview.label}</motion.div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--muted)', fontWeight: 700, fontSize: 13,
            }}
          >Cancel</button>
          <button
            disabled={!ready}
            onClick={() => ready && onConfirm(finalS1, finalS2)}
            style={{
              flex: 2, padding: '10px 0', borderRadius: 10,
              cursor: ready ? 'pointer' : 'not-allowed',
              background: ready ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${ready ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: ready ? 'var(--cyan, #00d4ff)' : 'var(--muted)',
              fontWeight: 800, fontSize: 13, opacity: ready ? 1 : 0.5,
              transition: 'all 0.15s',
            }}
          >✓ Confirm</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Match Card ────────────────────────────────────────────────────────
const MatchCard = ({ match, bestOf = 1, onWin, onScore, onDraw, showDraw = false }) => {
  const [scoreModal, setScoreModal] = useState(false)
  if (!match) return null

  const done   = !!match.winner
  const isBye  = !!match.isBye
  const p1     = match.p1
  const p2     = match.p2
  const canAct = p1 && p2 && !isBye

  const hasScore = match.score1 != null && match.score2 != null

  const handleScoreConfirm = (s1, s2) => {
    setScoreModal(false)
    onScore?.(s1, s2)
  }

  const rightPadding = isBye ? 40 : 54; 

  const renderPlayer = (player, score, isTop) => {
    const isWinner = done && match.winner?.id === player?.id
    const isDraw = done && match.winner === 'draw'

    return (
      <div
        onClick={() => canAct && !done && onWin?.(player)}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${rightPadding}px 0 12px`,
          background: isWinner ? 'rgba(34,214,122,0.12)' : isDraw ? 'rgba(212,160,23,0.1)' : 'transparent',
          borderBottom: isTop ? '1px solid rgba(255,255,255,0.05)' : 'none',
          cursor: (canAct && !done) ? 'pointer' : 'default',
          transition: 'background 0.2s'
        }}
      >
        <span style={{
          fontWeight: isWinner ? 800 : 700,
          fontSize: 14,
          color: player ? tagColor(player.tag) : 'var(--muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '110px'
        }}>
          {player ? player.name : 'TBD'}
        </span>

        {hasScore && (
          <span style={{
            marginLeft: 'auto',
            fontWeight: 800,
            fontSize: 14,
            color: isWinner ? 'var(--green)' : isDraw ? 'var(--gold-light)' : 'var(--white-soft)'
          }}>
            {score}
          </span>
        )}

        {isWinner && !hasScore && (
          <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: 14, fontWeight: 800 }}>✓</span>
        )}
      </div>
    )
  }

  return (
    <>
      <AnimatePresence>
        {scoreModal && canAct && (
          <ScoreModal
            match={match}
            bestOf={bestOf}
            onClose={() => setScoreModal(false)}
            onConfirm={handleScoreConfirm}
          />
        )}
      </AnimatePresence>

      <div
        className="match-card"
        style={{
          height: 82,
          background: 'var(--surface2, rgba(20,20,30,0.8))',
          border: '1px solid var(--border, rgba(255,255,255,0.1))',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          overflow: 'hidden'
        }}
      >
        {/* Player Rows */}
        {renderPlayer(p1, match.score1, true)}
        {renderPlayer(p2, match.score2, false)}

        {/* Bye Badge */}
        {isBye && (
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, fontWeight: 800, color: 'var(--muted)',
            background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 8px',
            letterSpacing: 1
          }}>
            BYE
          </div>
        )}

        {/* Action Buttons Overlay */}
        {!isBye && (
          <div style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', gap: 6, zIndex: 10
          }}>
            {canAct && !done && (
              <button
                title="Enter score"
                onClick={(e) => { e.stopPropagation(); setScoreModal(true) }}
                style={{
                  background: 'rgba(0,212,255,0.1)',
                  border: '1px solid rgba(0,212,255,0.35)',
                  color: 'var(--cyan, #00d4ff)',
                  borderRadius: 6, width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >📊</button>
            )}

            {showDraw && !done && canAct && (
              <button
                title="Mark Draw"
                onClick={(e) => { e.stopPropagation(); onDraw?.(); }}
                style={{
                  background: 'rgba(212,160,23,0.1)',
                  border: '1px solid rgba(212,160,23,0.35)',
                  color: 'var(--gold-light)',
                  borderRadius: 6, width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >D</button>
            )}

            {done && (
              <button
                title="Undo Match"
                onClick={(e) => { e.stopPropagation(); onWin?.(null); }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'var(--white-soft)',
                  borderRadius: 6, width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >↺</button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default memo(MatchCard, (prev, next) =>
  prev.match === next.match &&
  prev.showDraw === next.showDraw &&
  prev.bestOf === next.bestOf
)