import React from 'react'
import MatchCard from '../MatchCard.jsx'

export default function DoubleElimBracket({ bracket, onUpdate }) {
  const handleWin = (side, rIdx, mIdx, winner) => {
    const b = JSON.parse(JSON.stringify(bracket))
    if (side === 'winners') b.wRounds[rIdx][mIdx].winner = winner
    else if (side === 'losers') b.lRounds[rIdx][mIdx].winner = winner
    else if (side === 'grand_final') { b.grandFinal.winner = winner; if (winner) b.champion = winner }
    onUpdate(b)
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ color: 'var(--win)', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>🟢 Winners Bracket</h3>
        <div style={{ display: 'flex', gap: 24, minWidth: 'max-content' }}>
          {bracket.wRounds.map((round, rIdx) => (
            <div key={rIdx}>
              <div style={{ color: 'var(--accent2)', fontSize: 11, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>Round {rIdx+1}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {round.map((m, mIdx) => <MatchCard key={m.id} match={m} onWin={w => handleWin('winners', rIdx, mIdx, w)} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ color: 'var(--lose)', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>🔴 Losers Bracket</h3>
        <div style={{ display: 'flex', gap: 24, minWidth: 'max-content' }}>
          {bracket.lRounds.map((round, rIdx) => (
            <div key={rIdx}>
              <div style={{ color: 'var(--accent2)', fontSize: 11, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>LR {rIdx+1}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {round.map((m, mIdx) => <MatchCard key={m.id} match={m} onWin={w => handleWin('losers', rIdx, mIdx, w)} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 style={{ color: '#facc15', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>⭐ Grand Final</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <MatchCard match={bracket.grandFinal} onWin={w => handleWin('grand_final', 0, 0, w)} />
          {bracket.champion && (
            <div style={{ background: 'linear-gradient(135deg,#854d0e,#ca8a04)', padding: '14px 20px', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 22 }}>🏆</div>
              <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>{bracket.champion.name}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
