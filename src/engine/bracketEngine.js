// ── Bracket Engine ──

export const FORMATS = [
  { id: 'single_elim', label: 'Single Elimination', tag: 'SE', color: 'tag-blue',
    desc: 'One loss = eliminated. Fast and simple.' },
  { id: 'double_elim', label: 'Double Elimination', tag: 'DE', color: 'tag-purple',
    desc: 'Two losses to eliminate. Winners & Losers brackets.' },
  { id: 'round_robin', label: 'Round Robin', tag: 'RR', color: 'tag-green',
    desc: 'Everyone plays everyone. Most points wins.' },
  { id: 'swiss', label: 'Swiss System', tag: 'SW', color: 'tag-orange',
    desc: 'Paired by score each round. No eliminations.' },
]

const uid = () => Math.random().toString(36).slice(2, 8)
const makeMatch = (p1, p2, round, bracket = 'winners') => ({
  id: uid(), round, bracket, p1: p1 || null, p2: p2 || null, winner: null
})
const nextPow2 = n => Math.pow(2, Math.ceil(Math.log2(n)))

// ════════════════════════════════════════
//  SINGLE ELIMINATION
// ════════════════════════════════════════
export function generateSingleElim(players) {
  const size = nextPow2(players.length)
  const seeded = [...players]
  while (seeded.length < size) seeded.push(null)
  const rounds = []
  let cur = []
  for (let i = 0; i < size; i += 2) cur.push(makeMatch(seeded[i], seeded[i + 1], 1))
  rounds.push(cur)
  let rn = 2, prev = cur
  while (prev.length > 1) {
    const next = []
    for (let i = 0; i < prev.length; i += 2) next.push(makeMatch(null, null, rn))
    rounds.push(next); prev = next; rn++
  }
  return { type: 'single_elim', rounds, champion: null }
}

// Advance winner forward, clear downstream if winner===null (undo)
export function advanceWinnerSingleElim(bracket, roundIdx, matchIdx, winner) {
  const b = JSON.parse(JSON.stringify(bracket))

  if (winner === null) {
    // Clear this match winner + all downstream slots seeded from this match
    b.rounds[roundIdx][matchIdx].winner = null
    let curMatchIdx = matchIdx
    for (let r = roundIdx + 1; r < b.rounds.length; r++) {
      const nextMatchIdx = Math.floor(curMatchIdx / 2)
      const slot = curMatchIdx % 2 === 0 ? 'p1' : 'p2'
      const m = b.rounds[r][nextMatchIdx]
      if (!m) break
      // Only clear if this slot was filled by the player we're removing
      m[slot] = null
      m.winner = null
      curMatchIdx = nextMatchIdx
    }
    b.champion = null
    return b
  }

  b.rounds[roundIdx][matchIdx].winner = winner
  const nextRound = b.rounds[roundIdx + 1]
  if (nextRound) {
    const slot = matchIdx % 2 === 0 ? 'p1' : 'p2'
    nextRound[Math.floor(matchIdx / 2)][slot] = winner
  } else {
    b.champion = winner
  }
  return b
}

// ════════════════════════════════════════
//  DOUBLE ELIMINATION
// ════════════════════════════════════════
//
// Structure (8 players example):
//  wRounds[0]: 4 matches  (W-R1)
//  wRounds[1]: 2 matches  (W-R2 / QF)
//  wRounds[2]: 1 match    (W-Final)
//
//  lRounds[0]: 4 matches  — fed by W-R1 losers
//  lRounds[1]: 2 matches  — L-R0 winners pair up
//  lRounds[2]: 2 matches  — W-R2 losers drop in
//  lRounds[3]: 1 match    — L-R2 winners pair up
//  ...
//  grandFinal: 1 match
//
// Loser drop-in schedule (wRound index → lRound index):
//   W-R1 losers → lRounds[0]  (fill as p1/p2 directly)
//   W-R2 losers → lRounds[2]  (interleaved with L winners)
//   W-R3 losers → lRounds[4]
//   pattern: wRoundIdx n → lRound index n*2
//
// Winners advance: winner of wRounds[last] → grandFinal p1
// Losers advance:  winner of lRounds[last] → grandFinal p2

export function generateDoubleElim(players) {
  const size = nextPow2(players.length)
  const seeded = [...players]
  while (seeded.length < size) seeded.push(null)

  // Winners bracket
  const wRounds = []
  let wCur = []
  for (let i = 0; i < size; i += 2) wCur.push(makeMatch(seeded[i], seeded[i + 1], 1, 'winners'))
  wRounds.push(wCur)
  let rn = 2, wPrev = wCur
  while (wPrev.length > 1) {
    const next = []
    for (let i = 0; i < wPrev.length; i += 2) next.push(makeMatch(null, null, rn, 'winners'))
    wRounds.push(next); wPrev = next; rn++
  }

  // Losers bracket
  // Number of losers rounds = 2*(wRounds.length-1)
  const wLen = wRounds.length   // e.g. 3 for 8 players
  const lLen = 2 * (wLen - 1)  // e.g. 4
  const lRounds = []
  let lSize = size / 2  // starts equal to wRounds[0] length
  for (let i = 0; i < lLen; i++) {
    const matches = []
    const mCount = Math.max(1, lSize)
    for (let j = 0; j < mCount; j++) matches.push(makeMatch(null, null, i + 1, 'losers'))
    lRounds.push(matches)
    if (i % 2 === 1) lSize = Math.max(1, Math.floor(lSize / 2))
  }

  const grandFinal = makeMatch(null, null, 99, 'grand_final')
  return { type: 'double_elim', wRounds, lRounds, grandFinal, champion: null }
}

// Advance a winner in the Winners bracket and drop loser into Losers bracket
export function advanceWinnerDE(bracket, roundIdx, matchIdx, winner) {
  const b = JSON.parse(JSON.stringify(bracket))
  const match = b.wRounds[roundIdx][matchIdx]
  const loser = match.p1?.id === winner?.id ? match.p2 : match.p1
  match.winner = winner

  // Advance winner in W bracket
  const nextWRound = b.wRounds[roundIdx + 1]
  if (nextWRound) {
    const slot = matchIdx % 2 === 0 ? 'p1' : 'p2'
    nextWRound[Math.floor(matchIdx / 2)][slot] = winner
  } else {
    // Winner of W bracket finals → grand final p1
    b.grandFinal.p1 = winner
  }

  // Drop loser into Losers bracket
  if (loser) {
    const lRoundIdx = roundIdx * 2  // W-R0 losers → L-R0, W-R1 losers → L-R2, etc.
    const lRound = b.lRounds[lRoundIdx]
    if (lRound) {
      const lMatch = lRound[matchIdx] || lRound[Math.floor(matchIdx / 2)]
      if (lMatch) {
        if (!lMatch.p1) lMatch.p1 = loser
        else if (!lMatch.p2) lMatch.p2 = loser
      }
    }
  }
  return b
}

// Advance a winner in the Losers bracket
export function advanceLoserDE(bracket, roundIdx, matchIdx, winner) {
  const b = JSON.parse(JSON.stringify(bracket))
  b.lRounds[roundIdx][matchIdx].winner = winner

  const nextLRound = b.lRounds[roundIdx + 1]
  if (nextLRound) {
    const slot = matchIdx % 2 === 0 ? 'p1' : 'p2'
    const nextMatch = nextLRound[Math.floor(matchIdx / 2)] || nextLRound[0]
    if (nextMatch) {
      if (!nextMatch.p1) nextMatch.p1 = winner
      else nextMatch[slot] = winner
    }
  } else {
    // Winner of final losers round → grand final p2
    b.grandFinal.p2 = winner
  }
  return b
}

export function advanceGrandFinalDE(bracket, winner) {
  const b = JSON.parse(JSON.stringify(bracket))
  b.grandFinal.winner = winner
  b.champion = winner
  return b
}

// ── Round Robin ──
export function generateRoundRobin(players) {
  const list = players.length % 2 === 0 ? [...players] : [...players, { name: 'BYE', id: 'bye' }]
  const total = list.length
  const rounds = []
  for (let r = 0; r < total - 1; r++) {
    const roundMatches = []
    for (let i = 0; i < total / 2; i++) {
      const p1 = list[i], p2 = list[total - 1 - i]
      if (p1.id !== 'bye' && p2.id !== 'bye') roundMatches.push(makeMatch(p1, p2, r + 1, 'round_robin'))
    }
    rounds.push(roundMatches)
    list.splice(1, 0, list.pop())
  }
  const standings = players.map(p => ({ ...p, played: 0, wins: 0, draws: 0, losses: 0, points: 0 }))
  return { type: 'round_robin', rounds, standings, champion: null }
}

export function advanceWinnerRoundRobin(bracket, roundIdx, matchIdx, winner, loser) {
  const b = JSON.parse(JSON.stringify(bracket))
  b.rounds[roundIdx][matchIdx].winner = winner
  b.standings = b.standings.map(s => {
    if (s.id === winner.id) return { ...s, wins: s.wins + 1, points: s.points + 3, played: s.played + 1 }
    if (loser && s.id === loser.id) return { ...s, losses: s.losses + 1, played: s.played + 1 }
    return s
  })
  b.standings.sort((a, b) => b.points - a.points || b.wins - a.wins)
  if (b.rounds.every(r => r.every(m => m.winner))) b.champion = b.standings[0]
  return b
}

export function setDrawRoundRobin(bracket, roundIdx, matchIdx) {
  const b = JSON.parse(JSON.stringify(bracket))
  b.rounds[roundIdx][matchIdx].winner = 'draw'
  b.standings = b.standings.map(s => {
    const m = b.rounds[roundIdx][matchIdx]
    if (s.id === m.p1?.id || s.id === m.p2?.id)
      return { ...s, draws: s.draws + 1, points: s.points + 1, played: s.played + 1 }
    return s
  })
  b.standings.sort((a, b) => b.points - a.points || b.wins - a.wins)
  return b
}

// ── Swiss ──
export function generateSwiss(players) {
  const totalRounds = Math.ceil(Math.log2(players.length))
  const standings = players.map(p => ({ ...p, points: 0, wins: 0, losses: 0, played: 0, opponents: [] }))
  const shuffled = [...standings].sort(() => Math.random() - 0.5)
  const r1 = []
  for (let i = 0; i < shuffled.length - 1; i += 2)
    r1.push(makeMatch(shuffled[i], shuffled[i + 1], 1, 'swiss'))
  if (shuffled.length % 2 !== 0)
    r1.push(makeMatch(shuffled[shuffled.length - 1], { name: 'BYE', id: 'bye' }, 1, 'swiss'))
  return { type: 'swiss', totalRounds, currentRound: 1, rounds: [r1], standings, champion: null }
}

export function generateBracket(format, players) {
  switch (format) {
    case 'single_elim': return generateSingleElim(players)
    case 'double_elim': return generateDoubleElim(players)
    case 'round_robin': return generateRoundRobin(players)
    case 'swiss':       return generateSwiss(players)
    default: throw new Error(`Unknown format: ${format}`)
  }
}
