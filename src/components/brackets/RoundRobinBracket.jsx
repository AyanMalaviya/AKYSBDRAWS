import React, { useRef, useCallback } from 'react'
import { produce } from 'immer'
import MatchCard from '../MatchCard.jsx'
import { advanceWinnerRoundRobin, setDrawRoundRobin } from '../../engine/bracketEngine.js'

const Standings = ({ standings, champion }) => (
  <div className="standings-wrap">
    <div className="standings-title">Standings</div>
    <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="standings-table">
        <thead>
          <tr><th style={{textAlign:'left'}}>#</th><th style={{textAlign:'left'}}>Player</th><th>W</th><th>D</th><th>L</th><th style={{color:'var(--neon-yellow)'}}>Pts</th></tr>
        </thead>
        <tbody>
          {standings.map((p, i) => (
            <tr key={p.id} className={i === 0 && champion ? 'top-row' : ''}>
              <td style={{color:'var(--muted)'}}>{i+1}</td>
              <td style={{fontWeight: i===0?800:400}}>{i===0&&champion?'🏆 ':''}{p.name}</td>
              <td style={{textAlign:'center',color:'var(--neon-green)'}}>{p.wins}</td>
              <td style={{textAlign:'center',color:'var(--neon-yellow)'}}>{p.draws}</td>
              <td style={{textAlign:'center',color:'var(--neon-pink)'}}>{p.losses}</td>
              <td style={{textAlign:'center',fontWeight:800,color:'var(--neon-yellow)'}}>{p.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export default function RoundRobinBracket({ bracket, onUpdate }) {
  // FIX: Track latest state to prevent stale closures
  const bracketRef = useRef(bracket)
  bracketRef.current = bracket

  const handleWin = useCallback((rIdx, mIdx, winner, loser) => {
    if (winner === null) {
      onUpdate(produce(bracketRef.current, draft => {
        const m = draft.rounds[rIdx][mIdx]
        if (m.winner && m.winner !== 'draw') {
          draft.standings = draft.standings.map(s => {
            if (s.id === m.winner.id) return {...s, wins:s.wins-1, points:s.points-3, played:s.played-1}
            const lid = m.winner.id === m.p1.id ? m.p2.id : m.p1.id
            if (s.id === lid) return {...s, losses:s.losses-1, played:s.played-1}
            return s
          })
        } else if (m.winner === 'draw') {
          draft.standings = draft.standings.map(s => {
            if (s.id === m.p1?.id || s.id === m.p2?.id) return {...s, draws:s.draws-1, points:s.points-1, played:s.played-1}
            return s
          })
        }
        m.winner = null; draft.champion = null;
      }))
    } else {
      onUpdate(advanceWinnerRoundRobin(bracketRef.current, rIdx, mIdx, winner, loser))
    }
  }, [onUpdate])

  const handleDraw = useCallback((rIdx, mIdx) => {
    onUpdate(setDrawRoundRobin(bracketRef.current, rIdx, mIdx))
  }, [onUpdate])

  return (
    <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 auto', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 20, minWidth: 'max-content' }}>
          {bracket.rounds.map((round, rIdx) => (
            <div key={rIdx}>
              <div className="bracket-row-label">R{rIdx+1}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {round.map((m, mIdx) => (
                  <MatchCard key={m.id} match={m} showDraw
                    onWin={(w,l) => handleWin(rIdx, mIdx, w, l)}
                    onDraw={() => handleDraw(rIdx, mIdx)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Standings standings={bracket.standings} champion={bracket.champion} />
    </div>
  )
}