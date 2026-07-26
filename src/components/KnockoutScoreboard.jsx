import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const medalEmoji = ['🥇', '🥈', '🥉']

/**
 * Derives a live standings table from any bracket type.
 * Rules:
 *  - Active players (still in the bracket, not yet eliminated) rank above eliminated ones.
 *  - Among active: ranked by round reached (higher = better).
 *  - Among eliminated: ranked by round reached (further = better), then by wins.
 *  - Bye wins (isBye) are NOT counted as real wins so the table stays clean.
 */
function deriveStandings(bracket, format) {
  if (!bracket) return []

  const playerMap = {} // id -> { name, tag, wins, byeWins, roundReached, eliminated, active }

  const ensurePlayer = (p) => {
    if (!p || p.id === 'bye') return
    if (!playerMap[p.id]) {
      playerMap[p.id] = {
        id: p.id, name: p.name, tag: p.tag || null,
        wins: 0, byeWins: 0, roundReached: 1, eliminated: false,
      }
    }
  }

  const processRounds = (rounds, roundOffset = 0, bracketLabel = '') => {
    if (!rounds) return
    rounds.forEach((round, rIdx) => {
      round.forEach(match => {
        ensurePlayer(match.p1)
        ensurePlayer(match.p2)
        if (!match.winner) return

        const winner = match.winner
        const loserP = match.p1?.id === winner?.id ? match.p2 : match.p1
        const reachedRound = rIdx + 1 + roundOffset

        if (winner && winner !== 'draw' && playerMap[winner.id]) {
          if (match.isBye) {
            playerMap[winner.id].byeWins++
          } else {
            playerMap[winner.id].wins++
          }
          playerMap[winner.id].roundReached = Math.max(
            playerMap[winner.id].roundReached, reachedRound + 1
          )
        }

        // Mark real loser eliminated (not bye opponent)
        if (loserP && loserP.id !== 'bye' && playerMap[loserP.id]) {
          // For double elim, losers aren't immediately out
          if (format !== 'double_elim') {
            playerMap[loserP.id].eliminated = true
          }
          playerMap[loserP.id].roundReached = Math.max(
            playerMap[loserP.id].roundReached, reachedRound
          )
        }
      })
    })
  }

  if (format === 'double_elim') {
    processRounds(bracket.wRounds, 0, 'W')
    // In double elim, only losers bracket losers are truly eliminated
    if (bracket.lRounds) {
      bracket.lRounds.forEach((round, rIdx) => {
        round.forEach(match => {
          ensurePlayer(match.p1)
          ensurePlayer(match.p2)
          if (!match.winner) return
          const loserP = match.p1?.id === match.winner?.id ? match.p2 : match.p1
          if (loserP && loserP.id !== 'bye' && playerMap[loserP.id]) {
            playerMap[loserP.id].eliminated = true
            playerMap[loserP.id].roundReached = Math.max(
              playerMap[loserP.id].roundReached, rIdx + 1
            )
          }
          if (match.winner && playerMap[match.winner.id]) {
            playerMap[match.winner.id].wins++
            playerMap[match.winner.id].roundReached = Math.max(
              playerMap[match.winner.id].roundReached, rIdx + 2
            )
          }
        })
      })
    }
    // Grand final
    if (bracket.grandFinal) {
      const gf = bracket.grandFinal
      ensurePlayer(gf.p1)
      ensurePlayer(gf.p2)
      if (gf.winner) {
        const loserP = gf.p1?.id === gf.winner?.id ? gf.p2 : gf.p1
        if (loserP && playerMap[loserP.id]) {
          playerMap[loserP.id].eliminated = true
          playerMap[loserP.id].roundReached = Math.max(playerMap[loserP.id].roundReached, 999)
        }
        if (playerMap[gf.winner.id]) {
          playerMap[gf.winner.id].wins++
          playerMap[gf.winner.id].roundReached = 9999
          playerMap[gf.winner.id].eliminated = false
        }
      }
    }
  } else if (format === 'round_robin') {
    // Use existing standings from bracket
    return bracket.standings?.map((s, i) => ({
      ...s,
      roundReached: s.points ?? 0,
      eliminated: false,
      byeWins: 0,
    })) || []
  } else if (format === 'swiss') {
    return bracket.standings?.map((s, i) => ({
      ...s,
      roundReached: s.points ?? 0,
      eliminated: false,
      byeWins: 0,
    })) || []
  } else {
    // single_elim or stage2_elim
    processRounds(bracket.rounds, 0)
  }

  // Champion is never eliminated
  if (bracket.champion && playerMap[bracket.champion.id]) {
    playerMap[bracket.champion.id].eliminated = false
    playerMap[bracket.champion.id].roundReached = 99999
  }

  const rows = Object.values(playerMap)
  rows.sort((a, b) => {
    // Active players first
    if (!a.eliminated && b.eliminated) return -1
    if (a.eliminated && !b.eliminated) return 1
    // Then by round reached (deeper = better)
    if (b.roundReached !== a.roundReached) return b.roundReached - a.roundReached
    // Then by real wins
    return b.wins - a.wins
  })
  return rows
}

export default function KnockoutScoreboard({ bracket, format, playerCount }) {
  const [open, setOpen] = useState(false)

  const rows = useMemo(() => deriveStandings(bracket, format), [bracket, format])

  // Count progress
  const { doneMatches, totalMatches } = useMemo(() => {
    let done = 0, total = 0
    const countRounds = (rounds) => {
      rounds?.forEach(r => r.forEach(m => {
        if (m.p1 || m.p2) total++
        if (m.winner) done++
      }))
    }
    if (format === 'double_elim') {
      countRounds(bracket?.wRounds)
      countRounds(bracket?.lRounds)
      if (bracket?.grandFinal?.p1 || bracket?.grandFinal?.p2) { total++; if (bracket.grandFinal.winner) done++ }
    } else {
      countRounds(bracket?.rounds)
    }
    return { doneMatches: done, totalMatches: total }
  }, [bracket, format])

  const pct = totalMatches ? Math.round((doneMatches / totalMatches) * 100) : 0
  const activeCount = rows.filter(r => !r.eliminated).length

  if (!rows.length) return null

  return (
    <div style={{
      margin: '0 0 20px',
      background: 'rgba(16,14,31,0.85)',
      border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          background: 'none', border: 'none', padding: '13px 18px',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 20 }}>🏆</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--cyan, #00d4ff)' }}>Knockout Scoreboard</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {doneMatches}/{totalMatches} matches · {activeCount} still active · {pct}% complete
          </div>
        </div>
        {/* Mini top-3 preview */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginRight: 8 }}>
          {rows.slice(0, 3).map((r, i) => (
            <div key={r.id} style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>{medalEmoji[i]}</span>
              <span style={{
                maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: 'var(--white-soft)', fontWeight: 700,
              }}>{r.name}</span>
            </div>
          ))}
        </div>
        <span style={{
          color: 'var(--muted)', fontSize: 16, transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>▼</span>
      </button>

      {/* Collapsible table */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 12px 14px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                    <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>#</th>
                    <th style={{ textAlign: 'left',   padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Player</th>
                    <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Status</th>
                    <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Wins</th>
                    {(format === 'round_robin' || format === 'swiss') && (
                      <>
                        <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>D</th>
                        <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>L</th>
                        <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Pts</th>
                      </>
                    )}
                    {format !== 'round_robin' && format !== 'swiss' && (
                      <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Round</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const isChamp = bracket?.champion?.id === r.id
                    const isActive = !r.eliminated
                    return (
                      <tr
                        key={r.id}
                        style={{
                          background: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          opacity: r.eliminated ? 0.55 : 1,
                        }}
                      >
                        <td style={{ padding: '7px 6px', textAlign: 'center', color: idx < 3 ? 'var(--gold-light)' : 'var(--muted)', fontWeight: 800 }}>
                          {medalEmoji[idx] ?? idx + 1}
                        </td>
                        <td style={{ padding: '7px 6px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, color: idx < 3 ? 'var(--white-soft)' : 'var(--text)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
                            {r.name}
                          </span>
                        </td>
                        <td style={{ padding: '7px 6px', textAlign: 'center' }}>
                          {isChamp
                            ? <span style={{ fontSize: 16 }}>🏆</span>
                            : isActive
                              ? <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, background: 'rgba(0,255,148,0.1)', padding: '2px 7px', borderRadius: 99, border: '1px solid rgba(0,255,148,0.3)' }}>ACTIVE</span>
                              : <span style={{ fontSize: 10, color: '#e05b4e', fontWeight: 700, background: 'rgba(224,91,78,0.08)', padding: '2px 7px', borderRadius: 99, border: '1px solid rgba(224,91,78,0.25)' }}>OUT</span>
                          }
                        </td>
                        <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>
                          {r.wins ?? 0}
                          {r.byeWins > 0 && (
                            <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 3, fontWeight: 400 }}>+{r.byeWins}bye</span>
                          )}
                        </td>
                        {(format === 'round_robin' || format === 'swiss') && (
                          <>
                            <td style={{ padding: '7px 6px', textAlign: 'center', color: 'var(--gold-light)' }}>{r.draws ?? 0}</td>
                            <td style={{ padding: '7px 6px', textAlign: 'center', color: '#e05b4e' }}>{r.losses ?? 0}</td>
                            <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 900, color: idx < 3 ? 'var(--gold-light)' : 'var(--white-soft)' }}>{r.points ?? 0}</td>
                          </>
                        )}
                        {format !== 'round_robin' && format !== 'swiss' && (
                          <td style={{ padding: '7px 6px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                            {r.roundReached >= 99999 ? 'Champion' : r.roundReached >= 999 ? 'Final' : `R${r.roundReached}`}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
