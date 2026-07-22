import React, { memo } from 'react'

const MatchCard = ({ match, onWin, onDraw, showDraw = false }) => {
  if (!match) return null
  const done = !!match.winner
  const p1 = match.p1, p2 = match.p2

  const rowCls = (player) => {
    if (!done) return player ? 'match-row' : 'match-row tbd'
    if (match.winner === 'draw') return 'match-row'
    return match.winner?.id === player?.id ? 'match-row winner' : 'match-row loser'
  }

  return (
    <div className="match-card">
      <div className={rowCls(p1)}
        onClick={() => !done && p1 && p2 && onWin?.(p1, p2)}>
        <span>{p1?.name || 'TBD'}</span>
        {done && match.winner?.id === p1?.id && <span style={{ color: 'var(--neon-green)', fontSize: 10 }}>✓</span>}
      </div>
      <div className="match-vs">VS</div>
      <div className={rowCls(p2)}
        onClick={() => !done && p1 && p2 && onWin?.(p2, p1)}>
        <span>{p2?.name || 'TBD'}</span>
        {done && match.winner?.id === p2?.id && <span style={{ color: 'var(--neon-green)', fontSize: 10 }}>✓</span>}
      </div>
      {showDraw && !done && p1 && p2 && (
        <button className="match-draw-btn" onClick={() => onDraw?.()}>Draw</button>
      )}
      {done && <button className="match-undo" onClick={() => onWin?.(null)}>undo</button>}
    </div>
  )
}

// Export the memoized version
export default memo(MatchCard, (prevProps, nextProps) => {
  // Custom comparison to ensure we only re-render if the match data changed
  return prevProps.match === nextProps.match && prevProps.showDraw === nextProps.showDraw;
});