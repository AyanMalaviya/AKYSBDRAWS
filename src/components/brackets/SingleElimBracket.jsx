import React, { useRef, useEffect, useState } from 'react'
import MatchCard from '../MatchCard.jsx'
import { advanceWinnerSingleElim, advanceWinnerStage2Elim } from '../../engine/bracketEngine.js'

const ROUND_LABELS = ['R64','R32','R16','QF','SF','Final']
const COL_W   = 200
const COL_GAP = 52
const CARD_H  = 82
const V_GAP   = 14

export default function SingleElimBracket({ bracket, onUpdate }) {
  const containerRef = useRef(null)
  const [lines, setLines] = useState([])

  const handleWin = (rIdx, mIdx, winner) => {
    if (bracket.type === 'stage2_elim') {
      onUpdate(advanceWinnerStage2Elim(bracket, rIdx, mIdx, winner))
    } else {
      onUpdate(advanceWinnerSingleElim(bracket, rIdx, mIdx, winner))
    }
  }

  // Draw bezier connectors after paint
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const pRect = container.getBoundingClientRect()
    const newLines = []
    const cols = container.querySelectorAll('.bracket-col')
    
    cols.forEach((col, rIdx) => {
      const nextCol = cols[rIdx + 1]
      if (!nextCol) return
      
      const cards = col.querySelectorAll('.match-card')
      const nextCards = nextCol.querySelectorAll('.match-card')
      const currentRoundMatches = bracket.rounds[rIdx]
      const nextRoundMatches = bracket.rounds[rIdx + 1]

      cards.forEach((card, mIdx) => {
        let nextCard;
        
        // Dynamically find where this winner advances to support custom matching
        if (bracket.type === 'stage2_elim') {
          const match = currentRoundMatches[mIdx]
          if (match && match.winner) {
            const targetDataIdx = nextRoundMatches?.findIndex(
              nm => nm.p1?.id === match.winner.id || nm.p2?.id === match.winner.id
            )
            if (targetDataIdx >= 0) nextCard = nextCards[targetDataIdx]
          }
        } else {
          nextCard = nextCards[Math.floor(mIdx / 2)]
        }

        if (!nextCard) return
        
        const cR = card.getBoundingClientRect()
        const nR = nextCard.getBoundingClientRect()
        const x1 = cR.right  - pRect.left
        const y1 = cR.top + cR.height / 2 - pRect.top
        const x2 = nR.left   - pRect.left
        const y2 = nR.top + nR.height / 2 - pRect.top
        const mx = (x1 + x2) / 2
        
        newLines.push({ key: `${rIdx}-${mIdx}`, x1, y1, x2, y2, mx })
      })
    })
    setLines(newLines)
  }, [bracket]) // <-- FIX: Dependency array added to stop the infinite loop

  const total = bracket.rounds.length

  return (
    <div className="bracket-scroll">
      <div
        ref={containerRef}
        style={{
          display: 'flex', gap: COL_GAP,
          alignItems: 'flex-start',
          minWidth: 'max-content',
          position: 'relative',
          paddingBottom: 12,
        }}
      >
        {/* SVG connectors */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="rgba(0,212,255,0.35)" />
            </marker>
          </defs>
          {lines.map(l => (
            <path key={l.key}
              d={`M${l.x1},${l.y1} C${l.mx},${l.y1} ${l.mx},${l.y2} ${l.x2},${l.y2}`}
              fill="none"
              stroke="rgba(0,212,255,0.28)"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
          ))}
        </svg>

        {bracket.rounds.map((round, rIdx) => {
          const labelIdx = Math.max(0, ROUND_LABELS.length - (total - rIdx))
          return (
            <div
              key={rIdx}
              className="bracket-col"
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: COL_W,
                gap: bracket.type === 'stage2_elim' ? V_GAP : (rIdx === 0 ? V_GAP : Math.pow(2, rIdx) * (CARD_H + V_GAP) - CARD_H),
                paddingTop: bracket.type === 'stage2_elim' ? 0 : (rIdx === 0 ? 0 : (Math.pow(2, rIdx) - 1) * (CARD_H + V_GAP) / 2),
              }}
            >
              <div className="bracket-row-label" style={{ marginBottom: 8 }}>
                {ROUND_LABELS[labelIdx]}
              </div>
              {round.map((match, mIdx) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onWin={w => handleWin(rIdx, mIdx, w)}
                />
              ))}
            </div>
          )
        })}

        {bracket.champion && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28 }}>
            <div className="bracket-row-label" style={{ marginBottom: 8 }}>Champion</div>
            <div className="champion-card">
              <div className="champion-trophy">🏆</div>
              <div className="champion-name">{bracket.champion.name}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}