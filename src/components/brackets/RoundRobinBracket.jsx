import React from 'react'
import MatchCard from '../MatchCard.jsx'
import { advanceWinnerRoundRobin, setDrawRoundRobin } from '../../engine/bracketEngine.js'

const StandingsTable = ({ standings, champion }) => (
  <div style={{ minWidth: 240 }}>
    <div style={{ color: 'var(--accent2)', fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>Standings</div>
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
            {['#','Player','W','D','L','Pts'].map(h => <th key={h} style={{ padding: '8px 8px', textAlign: h==='Player'?'left':'center', fontSize: 11 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {standings.map((p, i) => (
            <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: i===0&&champion?'rgba(202,138,4,0.1)':'transparent' }}>
              <td style={{ padding: '8px', color: 'var(--muted)', textAlign:'center' }}>{i+1}</td>
              <td style={{ padding: '8px', fontWeight: i===0?700:400 }}>{i===0&&champion?'🏆 ':''}{p.name}</td>
              <td style={{ padding: '8px', textAlign:'center', color:'var(--win)' }}>{p.wins}</td>
              <td style={{ padding: '8px', textAlign:'center', color:'#facc15' }}>{p.draws}</td>
              <td style={{ padding: '8px', textAlign:'center', color:'var(--lose)' }}>{p.losses}</td>
              <td style={{ padding: '8px', textAlign:'center', fontWeight:700, color:'#facc15' }}>{p.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export default function RoundRobinBracket({ bracket, onUpdate }) {
  const handleWin = (rIdx, mIdx, winner, loser) => {
    if (winner === null) {
      const b = JSON.parse(JSON.stringify(bracket))
      const m = b.rounds[rIdx][mIdx]
      if (m.winner && m.winner !== 'draw') {
        b.standings = b.standings.map(s => {
          if (s.id === m.winner.id) return { ...s, wins: s.wins-1, points: s.points-3, played: s.played-1 }
          const lid = m.winner.id === m.p1.id ? m.p2.id : m.p1.id
          if (s.id === lid) return { ...s, losses: s.losses-1, played: s.played-1 }
          return s
        })
      } else if (m.winner === 'draw') {
        b.standings = b.standings.map(s => {
          if (s.id === m.p1?.id || s.id === m.p2?.id) return { ...s, draws: s.draws-1, points: s.points-1, played: s.played-1 }
          return s
        })
      }
      m.winner = null; b.champion = null; onUpdate(b)
    } else {
      onUpdate(advanceWinnerRoundRobin(bracket, rIdx, mIdx, winner, loser))
    }
  }

  return (
    <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 auto', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 20, minWidth: 'max-content' }}>
          {bracket.rounds.map((round, rIdx) => (
            <div key={rIdx}>
              <div style={{ color: 'var(--accent2)', fontSize: 12, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>Round {rIdx+1}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {round.map((m, mIdx) => (
                  <MatchCard key={m.id} match={m} showDraw
                    onWin={(w, l) => handleWin(rIdx, mIdx, w, l)}
                    onDraw={() => onUpdate(setDrawRoundRobin(bracket, rIdx, mIdx))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <StandingsTable standings={bracket.standings} champion={bracket.champion} />
    </div>
  )
}
