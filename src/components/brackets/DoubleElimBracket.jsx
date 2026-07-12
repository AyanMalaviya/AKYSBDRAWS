import React from 'react'
import MatchCard from '../MatchCard.jsx'

export default function DoubleElimBracket({ bracket, onUpdate }) {
  const handleWin = (side, rIdx, mIdx, winner) => {
    const b = JSON.parse(JSON.stringify(bracket))
    if (side === 'winners') b.wRounds[rIdx][mIdx].winner = winner
    else if (side === 'losers') b.lRounds[rIdx][mIdx].winner = winner
    else { b.grandFinal.winner = winner; if (winner) b.champion = winner }
    onUpdate(b)
  }

  const RoundCol = ({ round, rIdx, side }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {round.map((m, mIdx) => <MatchCard key={m.id} match={m} onWin={w => handleWin(side, rIdx, mIdx, w)} />)}
    </div>
  )

  return (
    <div className="bracket-scroll">
      <div style={{ minWidth: 'max-content' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="bracket-section-label bsl-winners">🟢 Winners Bracket</div>
          <div style={{ display: 'flex', gap: 32 }}>
            {bracket.wRounds.map((r, i) => <RoundCol key={i} round={r} rIdx={i} side="winners" />)}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div className="bracket-section-label bsl-losers">🔴 Losers Bracket</div>
          <div style={{ display: 'flex', gap: 32 }}>
            {bracket.lRounds.map((r, i) => <RoundCol key={i} round={r} rIdx={i} side="losers" />)}
          </div>
        </div>
        <div>
          <div className="bracket-section-label bsl-final">⭐ Grand Final</div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <MatchCard match={bracket.grandFinal} onWin={w => handleWin('grand_final', 0, 0, w)} />
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
