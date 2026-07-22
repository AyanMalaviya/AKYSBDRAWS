import React, { useRef, useEffect, useState } from 'react'
import { produce } from 'immer'
import MatchCard from '../MatchCard.jsx'
import { advanceWinnerDE, advanceLoserDE, advanceGrandFinalDE } from '../../engine/bracketEngine.js'

const COL_GAP = 40

function BracketSection({ label, labelClass, rounds, onWin }) {
  const containerRef = useRef(null)
  const [lines, setLines] = useState([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const pRect = container.getBoundingClientRect()
    const newLines = []
    const cols = container.querySelectorAll('.de-col')
    cols.forEach((col, rIdx) => {
      const nextCol = cols[rIdx + 1]
      if (!nextCol) return
      const cards = col.querySelectorAll('.match-card')
      const nextCards = nextCol.querySelectorAll('.match-card')
      cards.forEach((card, mIdx) => {
        const nextCard = nextCards[Math.floor(mIdx / 2)] || nextCards[0]
        if (!nextCard) return
        const cR = card.getBoundingClientRect()
        const nR = nextCard.getBoundingClientRect()
        newLines.push({
          key: `${rIdx}-${mIdx}`,
          x1: cR.right - pRect.left,
          y1: cR.top + cR.height / 2 - pRect.top,
          x2: nR.left  - pRect.left,
          y2: nR.top  + nR.height / 2 - pRect.top,
        })
      })
    })
    setLines(newLines)
  }, [rounds]) // <-- FIX: Dependency array added here too

  return (
    <div style={{ marginBottom: 28 }}>
      <div className={`bracket-section-label ${labelClass}`}>{label}</div>
      <div ref={containerRef} style={{ display: 'flex', gap: COL_GAP, minWidth: 'max-content', position: 'relative' }}>
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible', pointerEvents:'none' }}>
          {lines.map(l => (
            <path key={l.key}
              d={`M${l.x1},${l.y1} C${(l.x1+l.x2)/2},${l.y1} ${(l.x1+l.x2)/2},${l.y2} ${l.x2},${l.y2}`}
              fill="none" stroke="rgba(0,212,255,0.22)" strokeWidth="1.5" strokeDasharray="5 3"
            />
          ))}
        </svg>
        {rounds.map((round, rIdx) => (
          <div key={rIdx} className="de-col" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {round.map((m, mIdx) => (
              <MatchCard key={m.id} match={m} onWin={w => onWin(rIdx, mIdx, w)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DoubleElimBracket({ bracket, onUpdate }) {
  const handleWinW = (rIdx, mIdx, winner) => {
    if (winner === null) {
      onUpdate(produce(bracket, draft => {
        draft.wRounds[rIdx][mIdx].winner = null
      }))
    } else {
      onUpdate(advanceWinnerDE(bracket, rIdx, mIdx, winner))
    }
  }

  const handleWinL = (rIdx, mIdx, winner) => {
    if (winner === null) {
      onUpdate(produce(bracket, draft => {
        draft.lRounds[rIdx][mIdx].winner = null
      }))
    } else {
      onUpdate(advanceLoserDE(bracket, rIdx, mIdx, winner))
    }
  }

  const handleGF = (winner) => {
    if (winner === null) {
      onUpdate(produce(bracket, draft => {
        draft.grandFinal.winner = null
        draft.champion = null
      }))
    } else {
      onUpdate(advanceGrandFinalDE(bracket, winner))
    }
  }

  return (
    <div className="bracket-scroll">
      <div style={{ minWidth: 'max-content' }}>
        <BracketSection
          label="🟢 Winners Bracket" labelClass="bsl-winners"
          rounds={bracket.wRounds} onWin={handleWinW}
        />
        <BracketSection
          label="🔴 Losers Bracket" labelClass="bsl-losers"
          rounds={bracket.lRounds} onWin={handleWinL}
        />
        <div>
          <div className="bracket-section-label bsl-final">⭐ Grand Final</div>
          <div style={{ display:'flex', gap:24, alignItems:'center' }}>
            <MatchCard match={bracket.grandFinal} onWin={handleGF} />
            {bracket.champion && (
              <div className="champion-card">
                <div className="champion-trophy">🏆</div>
                <div className="champion-name">{bracket.champion.name}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}