import React from 'react'
import { produce } from 'immer'
import MatchCard from '../MatchCard.jsx'

export default function SwissBracket({ bracket, onUpdate }) {
  const handleWin = (rIdx, mIdx, winner) => {
    onUpdate(produce(bracket, draft => {
      const match = draft.rounds[rIdx][mIdx]
      if (winner === null) {
        const prev = match.winner
        match.winner = null
        if (prev && prev.id !== 'bye') {
          const loser = prev.id === match.p1?.id ? match.p2 : match.p1
          draft.standings = draft.standings.map(s => {
            if (s.id === prev.id) return {...s, wins:s.wins-1, points:s.points-1, played:s.played-1}
            if (s.id === loser?.id) return {...s, losses:s.losses-1, played:s.played-1}
            return s
          })
        }
      } else {
        match.winner = winner
        const loser = winner.id === match.p1?.id ? match.p2 : match.p1
        draft.standings = draft.standings.map(s => {
          if (s.id === winner.id) return {...s, wins:s.wins+1, points:s.points+1, played:s.played+1, opponents:[...(s.opponents||[]),loser?.id]}
          if (loser&&s.id===loser.id) return {...s, losses:s.losses+1, played:s.played+1, opponents:[...(s.opponents||[]),winner.id]}
          return s
        })
      }
      
      const roundDone = draft.rounds[rIdx].every(m => m.winner)
      const isLast = rIdx + 1 >= draft.totalRounds
      
      if (roundDone && !isLast) {
        draft.standings.sort((a,c) => c.points-a.points)
        const avail = [...draft.standings]
        const next = []
        while (avail.length >= 2) {
          const p1 = avail.shift()
          const idx = avail.findIndex(p => !p1.opponents?.includes(p.id))
          const p2 = avail.splice(idx>=0?idx:0, 1)[0]
          next.push({id:Math.random().toString(36).slice(2,8),round:rIdx+2,bracket:'swiss',p1,p2,winner:null})
        }
        if (avail.length===1) next.push({id:Math.random().toString(36).slice(2,8),round:rIdx+2,bracket:'swiss',p1:avail[0],p2:{name:'BYE',id:'bye'},winner:null})
        draft.rounds.push(next); draft.currentRound = rIdx+2
      }
      if (isLast&&roundDone) { 
        draft.standings.sort((a,c)=>c.points-a.points); 
        draft.champion=draft.standings[0] 
      }
    }))
  }

  const sorted = [...bracket.standings].sort((a,b) => b.points-a.points)

  return (
    <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 auto', overflowX: 'auto' }}>
        <div style={{ marginBottom: 10, color: 'var(--muted)', fontSize: 13 }}>
          Round {bracket.currentRound} of {bracket.totalRounds}
          <span style={{ color: 'var(--neon-blue)', marginLeft: 8 }}>— finish all matches to auto-advance</span>
        </div>
        <div style={{ display: 'flex', gap: 20, minWidth: 'max-content' }}>
          {bracket.rounds.map((round, rIdx) => (
            <div key={rIdx}>
              <div className="bracket-row-label">R{rIdx+1}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {round.map((m, mIdx) => <MatchCard key={m.id} match={m} onWin={w => handleWin(rIdx, mIdx, w)} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="standings-wrap">
        <div className="standings-title">Standings</div>
        <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="standings-table">
            <thead><tr><th style={{textAlign:'left'}}>#</th><th style={{textAlign:'left'}}>Player</th><th>W</th><th>L</th><th style={{color:'var(--neon-yellow)'}}>Pts</th></tr></thead>
            <tbody>
              {sorted.map((p,i) => (
                <tr key={p.id} className={i===0&&bracket.champion?'top-row':''}>
                  <td style={{color:'var(--muted)',textAlign:'center'}}>{i+1}</td>
                  <td style={{fontWeight:i===0?800:400}}>{bracket.champion&&i===0?'🏆 ':''}{p.name}</td>
                  <td style={{textAlign:'center',color:'var(--neon-green)'}}>{p.wins}</td>
                  <td style={{textAlign:'center',color:'var(--neon-pink)'}}>{p.losses}</td>
                  <td style={{textAlign:'center',fontWeight:800,color:'var(--neon-yellow)'}}>{p.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}