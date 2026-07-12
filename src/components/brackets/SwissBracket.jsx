import React from 'react'
import MatchCard from '../MatchCard.jsx'

export default function SwissBracket({ bracket, onUpdate }) {
  const handleWin = (rIdx, mIdx, winner) => {
    const b = JSON.parse(JSON.stringify(bracket))
    const match = b.rounds[rIdx][mIdx]

    if (winner === null) {
      const prev = match.winner
      match.winner = null
      if (prev && prev.id !== 'bye') {
        const loser = prev.id === match.p1?.id ? match.p2 : match.p1
        b.standings = b.standings.map(s => {
          if (s.id === prev.id) return { ...s, wins: s.wins-1, points: s.points-1, played: s.played-1 }
          if (s.id === loser?.id) return { ...s, losses: s.losses-1, played: s.played-1 }
          return s
        })
      }
    } else {
      match.winner = winner
      const loser = winner.id === match.p1?.id ? match.p2 : match.p1
      b.standings = b.standings.map(s => {
        if (s.id === winner.id) return { ...s, wins: s.wins+1, points: s.points+1, played: s.played+1, opponents: [...(s.opponents||[]), loser?.id] }
        if (loser && s.id === loser.id) return { ...s, losses: s.losses+1, played: s.played+1, opponents: [...(s.opponents||[]), winner.id] }
        return s
      })
    }

    const roundDone = b.rounds[rIdx].every(m => m.winner)
    const isLast = rIdx + 1 >= b.totalRounds

    if (roundDone && !isLast) {
      b.standings.sort((a, c) => c.points - a.points)
      const avail = [...b.standings]
      const next = []
      while (avail.length >= 2) {
        const p1 = avail.shift()
        const idx = avail.findIndex(p => !p1.opponents?.includes(p.id))
        const p2 = avail.splice(idx >= 0 ? idx : 0, 1)[0]
        next.push({ id: Math.random().toString(36).slice(2,8), round: rIdx+2, bracket: 'swiss', p1, p2, winner: null })
      }
      if (avail.length === 1) next.push({ id: Math.random().toString(36).slice(2,8), round: rIdx+2, bracket: 'swiss', p1: avail[0], p2: { name: 'BYE', id: 'bye' }, winner: null })
      b.rounds.push(next)
      b.currentRound = rIdx + 2
    }

    if (isLast && roundDone) {
      b.standings.sort((a, c) => c.points - a.points)
      b.champion = b.standings[0]
    }

    onUpdate(b)
  }

  const sorted = [...bracket.standings].sort((a, b) => b.points - a.points)

  return (
    <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 auto', overflowX: 'auto' }}>
        <div style={{ marginBottom: 12, color: 'var(--muted)', fontSize: 13 }}>
          Round {bracket.currentRound} of {bracket.totalRounds}
          <span style={{ color: 'var(--accent2)', marginLeft: 8 }}>— complete all matches to generate next round</span>
        </div>
        <div style={{ display: 'flex', gap: 20, minWidth: 'max-content' }}>
          {bracket.rounds.map((round, rIdx) => (
            <div key={rIdx}>
              <div style={{ color: 'var(--accent2)', fontSize: 12, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>Round {rIdx+1}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {round.map((m, mIdx) => <MatchCard key={m.id} match={m} onWin={w => handleWin(rIdx, mIdx, w)} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ minWidth: 220 }}>
        <div style={{ color: 'var(--accent2)', fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>Standings</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['#','Player','W','L','Pts'].map(h => <th key={h} style={{ padding: '8px', textAlign: h==='Player'?'left':'center', fontSize: 11, color: 'var(--muted)' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', color: 'var(--muted)', textAlign: 'center' }}>{i+1}</td>
                  <td style={{ padding: '8px', fontWeight: i===0?700:400 }}>{bracket.champion&&i===0?'🏆 ':''}{p.name}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: 'var(--win)' }}>{p.wins}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: 'var(--lose)' }}>{p.losses}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#facc15' }}>{p.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
