import React, { useRef, useEffect, useState } from 'react'
import MatchCard from '../MatchCard.jsx'
import { advanceWinnerSingleElim } from '../../engine/bracketEngine.js'

const LABELS = ['Round of 64','Round of 32','Round of 16','QF','SF','Final']
const COL_W = 210   // px width of each column
const COL_GAP = 48  // px gap between columns
const CARD_H = 84   // approx card height px
const CARD_GAP = 12 // min gap between cards

export default function SingleElimBracket({ bracket, onUpdate }) {
  const containerRef = useRef(null)
  const [lines, setLines] = useState([])

  const handleWin = (rIdx, mIdx, winner) => {
    if (winner === null) {
      const b = JSON.parse(JSON.stringify(bracket))
      b.rounds[rIdx][mIdx].winner = null
      for (let r = rIdx + 1; r < b.rounds.length; r++) {
        const mi = Math.floor(mIdx / Math.pow(2, r - rIdx))
        const slot = Math.floor(mIdx / Math.pow(2, r - rIdx - 1)) % 2 === 0 ? 'p1' : 'p2'
        if (b.rounds[r][mi]) { b.rounds[r][mi][slot] = null; b.rounds[r][mi].winner = null }
      }
      b.champion = null; onUpdate(b)
    } else {
      onUpdate(advanceWinnerSingleElim(bracket, rIdx, mIdx, winner))
    }
  }

  // Compute SVG connector lines after render
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const newLines = []
    const cols = container.querySelectorAll('.bracket-col')
    cols.forEach((col, rIdx) => {
      const nextCol = cols[rIdx + 1]
      if (!nextCol) return
      const cards = col.querySelectorAll('.match-card')
      const nextCards = nextCol.querySelectorAll('.match-card')
      cards.forEach((card, mIdx) => {
        const nextCard = nextCards[Math.floor(mIdx / 2)]
        if (!nextCard) return
        const cRect = card.getBoundingClientRect()
        const nRect = nextCard.getBoundingClientRect()
        const pRect = container.getBoundingClientRect()
        const x1 = cRect.right - pRect.left
        const y1 = cRect.top + cRect.height / 2 - pRect.top
        const x2 = nRect.left - pRect.left
        const y2 = nRect.top + nRect.height / 2 - pRect.top
        const mx = (x1 + x2) / 2
        newLines.push({ x1, y1, x2, y2, mx, key: `${rIdx}-${mIdx}` })
      })
    })
    setLines(newLines)
  })

  const total = bracket.rounds.length

  return (
    <div className="bracket-scroll">
      <div ref={containerRef} style={{ display: 'flex', gap: COL_GAP, alignItems: 'flex-start', minWidth: 'max-content', position: 'relative', paddingBottom: 8 }}>

        {/* SVG connector overlay */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%', overflow: 'visible' }}>
          {lines.map(l => (
            <path key={l.key}
              d={`M${l.x1},${l.y1} C${l.mx},${l.y1} ${l.mx},${l.y2} ${l.x2},${l.y2}`}
              fill="none" stroke="rgba(0,212,255,0.25)" strokeWidth="1.5" strokeDasharray="4 3"
            />
          ))}
        </svg>

        {bracket.rounds.map((round, rIdx) => (
          <div key={rIdx} className="bracket-col"
            style={{
              display: 'flex', flexDirection: 'column',
              gap: Math.pow(2, rIdx) * (CARD_H + CARD_GAP) - CARD_H,
              paddingTop: (Math.pow(2, rIdx) - 1) * (CARD_H + CARD_GAP) / 2,
              width: COL_W
            }}>
            <div className="bracket-row-label">{LABELS[total - rIdx - 1] || `R${rIdx+1}`}</div>
            {round.map((match, mIdx) => (
              <MatchCard key={match.id} match={match} onWin={w => handleWin(rIdx, mIdx, w)} />
            ))}
          </div>
        ))}

        {bracket.champion && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 28 }}>
            <div className="bracket-row-label">Champion</div>
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
