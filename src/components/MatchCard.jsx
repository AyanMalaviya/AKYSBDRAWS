import React from 'react'

export default function MatchCard({ match, onWin, onDraw, showDraw = false }) {
  if (!match) return null
  const done = !!match.winner
  const p1Name = match.p1?.name || 'TBD'
  const p2Name = match.p2?.name || 'TBD'

  const rowStyle = (player) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 10px', borderRadius: 6,
    cursor: (!done && match.p1 && match.p2) ? 'pointer' : 'default',
    background: done && match.winner?.id === player?.id ? 'rgba(34,197,94,0.15)'
              : done && match.winner !== 'draw' ? 'rgba(239,68,68,0.08)' : 'var(--surface2)',
    border: `1px solid ${done && match.winner?.id === player?.id ? 'var(--win)' : 'transparent'}`,
    opacity: done && match.winner !== 'draw' && match.winner?.id !== player?.id ? 0.5 : 1,
    transition: 'all 0.12s'
  })

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, minWidth: 180, maxWidth: 220 }}>
      <div style={rowStyle(match.p1)} onClick={() => !done && match.p1 && match.p2 && onWin?.(match.p1, match.p2)}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{p1Name}</span>
        {done && match.winner?.id === match.p1?.id && <span style={{ color: 'var(--win)', fontSize: 12 }}>✓</span>}
      </div>
      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', padding: '3px 0' }}>VS</div>
      <div style={rowStyle(match.p2)} onClick={() => !done && match.p1 && match.p2 && onWin?.(match.p2, match.p1)}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{p2Name}</span>
        {done && match.winner?.id === match.p2?.id && <span style={{ color: 'var(--win)', fontSize: 12 }}>✓</span>}
      </div>
      {showDraw && !done && match.p1 && match.p2 && (
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 6, fontSize: 11 }} onClick={() => onDraw?.()}>Draw</button>
      )}
      {done && (
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 6, fontSize: 10, opacity: 0.5 }} onClick={() => onWin?.(null)}>Undo</button>
      )}
    </div>
  )
}
