import React, { useRef, useEffect, useState, useCallback } from 'react'
import MatchCard from '../MatchCard.jsx'
import {
  advanceWinnerSingleElim,
  advanceWinnerStage2Elim,
  advanceSingleElimWithScore,
  advanceStage2ElimWithScore,
} from '../../engine/bracketEngine.js'

const COL_W   = 200
const COL_GAP = 52
const CARD_H  = 82
const V_GAP   = 14

// Dynamically label rounds based strictly on remaining matches
function getRoundLabel(matchCount) {
  if (matchCount === 1) return 'Final'
  if (matchCount === 2) return 'Semi-Finals'
  if (matchCount > 2 && matchCount <= 4) return 'Quarter-Finals'
  if (matchCount > 4 && matchCount <= 8) return 'Round of 16'
  if (matchCount > 8 && matchCount <= 16) return 'Round of 32'
  if (matchCount > 16 && matchCount <= 32) return 'Round of 64'
  return `Round of ${matchCount * 2}`
}

export default function SingleElimBracket({ bracket, onUpdate }) {
  const containerRef = useRef(null)
  const [lines, setLines] = useState([])
  const bracketRef = useRef(bracket)
  bracketRef.current = bracket

  // Read bestOf directly from the saved bracket (defaulting to 1 if not set yet)
  const bestOf = bracket.bestOf || { sf: 1, final: 1 }

  const handleWin = useCallback((rIdx, mIdx, winner) => {
    if (bracketRef.current.type === 'stage2_elim') {
      onUpdate(advanceWinnerStage2Elim(bracketRef.current, rIdx, mIdx, winner))
    } else {
      onUpdate(advanceWinnerSingleElim(bracketRef.current, rIdx, mIdx, winner))
    }
  }, [onUpdate])

  const handleScore = useCallback((rIdx, mIdx, s1, s2) => {
    if (bracketRef.current.type === 'stage2_elim') {
      onUpdate(advanceStage2ElimWithScore(bracketRef.current, rIdx, mIdx, s1, s2))
    } else {
      onUpdate(advanceSingleElimWithScore(bracketRef.current, rIdx, mIdx, s1, s2))
    }
  }, [onUpdate])

  // Save partial score entries up to the main tournament bracket object
  const handleSavePartial = useCallback((rIdx, mIdx, sets) => {
    const b = bracketRef.current
    const newRounds = b.rounds.map((r, ri) =>
      ri === rIdx ? r.map((m, mi) => mi === mIdx ? { ...m, partialSets: sets } : m) : r
    )
    onUpdate({ ...b, rounds: newRounds })
  }, [onUpdate])

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
        let nextCard
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
  }, [bracket])

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
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="rgba(0,212,255,0.35)" />
            </marker>
          </defs>
          {lines.map(l => (
            <path key={l.key}
              d={`M${l.x1},${l.y1} C${l.mx},${l.y1} ${l.mx},${l.y2} ${l.x2},${l.y2}`}
              fill="none" stroke="rgba(0,212,255,0.28)" strokeWidth="1.5" strokeDasharray="5 3"
            />
          ))}
        </svg>

        {bracket.rounds.map((round, rIdx) => {
          const matchCount = round.length
          const label = getRoundLabel(matchCount)
          
          const isSF = matchCount === 2
          const isFinal = matchCount === 1
          const currentBestOf = isSF ? bestOf.sf : isFinal ? bestOf.final : 1

          return (
            <div
              key={rIdx}
              className="bracket-col"
              style={{
                display: 'flex', flexDirection: 'column', width: COL_W,
                gap: bracket.type === 'stage2_elim' ? V_GAP : (rIdx === 0 ? V_GAP : Math.pow(2, rIdx) * (CARD_H + V_GAP) - CARD_H),
                paddingTop: bracket.type === 'stage2_elim' ? 0 : (rIdx === 0 ? 0 : (Math.pow(2, rIdx) - 1) * (CARD_H + V_GAP) / 2),
              }}
            >
              <div className="bracket-row-label" style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                <span style={{ fontWeight: 800 }}>{label}</span>
                
                {(isSF || isFinal) && (
                  <select
                    value={isSF ? bestOf.sf : bestOf.final}
                    onChange={(e) => {
                      onUpdate({
                        ...bracketRef.current,
                        bestOf: { ...bestOf, [isSF ? 'sf' : 'final']: Number(e.target.value) }
                      })
                    }}
                    style={{
                      fontSize: 11, padding: '3px 8px',
                      background: 'rgba(255,255,255,0.06)', color: 'var(--muted)',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                      outline: 'none', cursor: 'pointer', textAlign: 'center'
                    }}
                  >
                    <option value={1}>Best of 1</option>
                    <option value={3}>Best of 3</option>
                    <option value={5}>Best of 5</option>
                  </select>
                )}
              </div>
              
              {round.map((match, mIdx) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  bestOf={currentBestOf}
                  onWin={w => handleWin(rIdx, mIdx, w)}
                  onScore={(s1, s2) => handleScore(rIdx, mIdx, s1, s2)}
                  onSavePartial={(sets) => handleSavePartial(rIdx, mIdx, sets)}
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