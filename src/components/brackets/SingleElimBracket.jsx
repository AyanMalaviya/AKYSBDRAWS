import React from 'react'
import MatchCard from '../MatchCard.jsx'
import { advanceWinnerSingleElim } from '../../engine/bracketEngine.js'

const LABELS = ['Round of 64','Round of 32','Round of 16','Quarter-finals','Semi-finals','Final']

export default function SingleElimBracket({ bracket, onUpdate }) {
  const handleWin = (rIdx, mIdx, winner) => {
    if (winner === null) {
      const b = JSON.parse(JSON.stringify(bracket))
      b.rounds[rIdx][mIdx].winner = null
      for (let r = rIdx + 1; r < b.rounds.length; r++) {
        const mi = Math.floor(mIdx / Math.pow(2, r - rIdx))
        const slot = Math.floor(mIdx / Math.pow(2, r - rIdx - 1)) % 2 === 0 ? 'p1' : 'p2'
        if (b.rounds[r][mi]) { b.rounds[r][mi][slot] = null; b.rounds[r][mi].winner = null }
      }
      b.champion = null
      onUpdate(b)
    } else {
      onUpdate(advanceWinnerSingleElim(bracket, rIdx, mIdx, winner))
    }
  }

  const total = bracket.rounds.length
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', minWidth: 'max-content' }}>
        {bracket.rounds.map((round, rIdx) => (
          <div key={rIdx}>
            <div style={{ textAlign: 'center', color: 'var(--accent2)', fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' }}>
              {LABELS[total - rIdx - 1] || `Round ${rIdx + 1}`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: Math.pow(2, rIdx) * 12 + 8, paddingTop: (Math.pow(2, rIdx) - 1) * 6 }}>
              {round.map((match, mIdx) => (
                <MatchCard key={match.id} match={match} onWin={(w) => handleWin(rIdx, mIdx, w)} />
              ))}
            </div>
          </div>
        ))}
        {bracket.champion && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: 'var(--accent2)', fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' }}>Champion</div>
            <div style={{ background: 'linear-gradient(135deg,#854d0e,#ca8a04)', padding: '16px 24px', borderRadius: 12, textAlign: 'center', boxShadow: '0 0 20px rgba(202,138,4,0.3)' }}>
              <div style={{ fontSize: 24 }}>🏆</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginTop: 6 }}>{bracket.champion.name}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
