import React, { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TAG_META } from '../engine/groupEngine.js'

// Helper to pull the same tag colors used in GroupView
const tagColor = (tag) => TAG_META[tag || 'C']?.color || TAG_META['C'].color

// ── Inline Score Entry Modal ──────────────────────────────────────────
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
          borderRadius: 18, padding: 24, width: '100%', maxWidth: 340,
          boxShadow: '0 0 40px rgba(0,212,255,0.12), 0 24px 48px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--white-soft)' }}>📊 Enter Score</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: tagColor(match.p1.tag), marginBottom: 8,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {match.p1.name}
            </div>
            <input
              type="number" min={0} value={s1} autoFocus
              onChange={e => setS1(e.target.value)} onKeyDown={handleKey}
              placeholder="0"
              style={{
                width: '100%', padding: '12px 8px', textAlign: 'center',
                fontSize: 28, fontWeight: 800,
                background: 'var(--surface3, rgba(255,255,255,0.06))',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, color: 'var(--white-soft)', outline: 'none',
              }}
            />
          </div>
          <div style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: 2 }}>VS</div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: tagColor(match.p2.tag), marginBottom: 8,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {match.p2.name}
            </div>
            <input
              type="number" min={0} value={s2}
              onChange={e => setS2(e.target.value)} onKeyDown={handleKey}
              placeholder="0"
              style={{
                width: '100%', padding: '12px 8px', textAlign: 'center',
                fontSize: 28, fontWeight: 800,
                background: 'var(--surface3, rgba(255,255,255,0.06))',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, color: 'var(--white-soft)', outline: 'none',
              }}
            />
          </div>
        </div>

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
            onClick={() => ready && onConfirm(v1, v2)}
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
const MatchCard = ({ match, onWin, onScore, onDraw, showDraw = false }) => {
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

  // Prevents text overlapping with the absolute positioned buttons
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
            onClose={() => setScoreModal(false)}
            onConfirm={handleScoreConfirm}
          />
        )}
      </AnimatePresence>

      <div
        className="match-card"
        style={{
          height: 82, // Hardcoded to 82px to maintain SVG line alignments
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
  prev.showDraw === next.showDraw
)