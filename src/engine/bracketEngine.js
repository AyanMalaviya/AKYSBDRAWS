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

// ══ SINGLE ELIMINATION ══
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

export function advanceWinnerSingleElim(bracket, roundIdx, matchIdx, winner) {
  const b = JSON.parse(JSON.stringify(bracket))
  if (winner === null) {
    b.rounds[roundIdx][matchIdx].winner = null
    let cur = matchIdx
    for (let r = roundIdx + 1; r < b.rounds.length; r++) {
      const next = Math.floor(cur / 2)
      const slot = cur % 2 === 0 ? 'p1' : 'p2'
      const m = b.rounds[r][next]
      if (!m) break
      m[slot] = null; m.winner = null; cur = next
    }
    b.champion = null
    return b
  }
  b.rounds[roundIdx][matchIdx].winner = winner
  const nextRound = b.rounds[roundIdx + 1]
  if (nextRound) {
    nextRound[Math.floor(matchIdx / 2)][matchIdx % 2 === 0 ? 'p1' : 'p2'] = winner
  } else {
    b.champion = winner
  }
  return b
}

// ══ DOUBLE ELIMINATION ══
//
// For N=8 players (wRounds has 3 rounds: W-R0=4matches, W-R1=2, W-R2=1):
//
//  lRounds[0]: 2 matches  ← W-R0 losers pair up (4 losers → 2 matches)
//  lRounds[1]: 2 matches  ← W-R1 losers drop as p2 (L-R0 winner becomes p1)
//  lRounds[2]: 1 match    ← L-R1 winners pair up
//  lRounds[3]: 1 match    ← W-R2 loser drops as p2 (L-R2 winner becomes p1)
//  grandFinal             ← wRounds last winner (p1) vs lRounds last winner (p2)
//
// Drop-in schedule:
//   wRoundIdx=0 losers → lRounds[0] as pairs:  lMatchIdx = floor(wMatchIdx/2)
//   wRoundIdx=1 losers → lRounds[1] as p2:     lMatchIdx = wMatchIdx
//   wRoundIdx=2 losers → lRounds[3] as p2:     lMatchIdx = 0
//   general for wRoundIdx>0: lRoundIdx = wRoundIdx*2 - 1

export function generateDoubleElim(players) {
  const size = nextPow2(players.length)
  const seeded = [...players]
  while (seeded.length < size) seeded.push(null)

  // Winners bracket rounds
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
  // lRounds[0]:          size/4 matches  (W-R0's 4 losers pair into 2, etc.)
  // lRounds[1]:          size/4 matches  (W-R1 losers drop in as p2)
  // lRounds[2]:          size/8 matches  (L-R1 winners pair up)
  // lRounds[3]:          size/8 matches  (W-R2 losers drop in as p2)
  // ...
  // total lRounds = 2*(wRounds.length - 1)
  const wLen = wRounds.length
  const lLen = 2 * (wLen - 1)
  const lRounds = []
  // lRounds[0] has wRounds[0].length / 2 matches (pairs the W-R0 losers)
  let lCount = Math.max(1, wRounds[0].length / 2)
  for (let i = 0; i < lLen; i++) {
    const matches = []
    for (let j = 0; j < lCount; j++) matches.push(makeMatch(null, null, i + 1, 'losers'))
    lRounds.push(matches)
    // After every even-indexed round (0,2,4...) halve the count
    if (i % 2 === 1) lCount = Math.max(1, Math.floor(lCount / 2))
  }

  const grandFinal = makeMatch(null, null, 99, 'grand_final')
  return { type: 'double_elim', wRounds, lRounds, grandFinal, champion: null }
}

export function advanceWinnerDE(bracket, roundIdx, matchIdx, winner) {
  const b = JSON.parse(JSON.stringify(bracket))
  const match = b.wRounds[roundIdx][matchIdx]
  const loser = match.p1?.id === winner?.id ? match.p2 : match.p1
  match.winner = winner

  // Advance winner in W bracket
  const nextW = b.wRounds[roundIdx + 1]
  if (nextW) {
    nextW[Math.floor(matchIdx / 2)][matchIdx % 2 === 0 ? 'p1' : 'p2'] = winner
  } else {
    b.grandFinal.p1 = winner
  }

  // Drop loser into correct L-bracket slot
  if (loser) {
    if (roundIdx === 0) {
      // W-R0 losers pair up in lRounds[0]: two losers per match
      // match 0,1 → lRounds[0][0] as p1,p2
      // match 2,3 → lRounds[0][1] as p1,p2
      const lMatchIdx = Math.floor(matchIdx / 2)
      const lMatch = b.lRounds[0][lMatchIdx]
      if (lMatch) {
        if (!lMatch.p1) lMatch.p1 = loser
        else if (!lMatch.p2) lMatch.p2 = loser
      }
    } else {
      // W-Ri (i>0) losers drop into lRounds[i*2 - 1] as p2
      // p1 will be filled by the L-bracket winner advancing from previous round
      const lRoundIdx = roundIdx * 2 - 1
      const lMatch = b.lRounds[lRoundIdx]?.[matchIdx]
      if (lMatch) {
        lMatch.p2 = loser
      }
    }
  }
  return b
}

export function advanceLoserDE(bracket, roundIdx, matchIdx, winner) {
  const b = JSON.parse(JSON.stringify(bracket))
  b.lRounds[roundIdx][matchIdx].winner = winner

  const nextL = b.lRounds[roundIdx + 1]
  if (nextL) {
    // Even lRoundIdx → pure L-winner round: pair them up (p1 then p2)
    // Odd  lRoundIdx → drop-in round: L winner becomes p1, W dropin is p2
    // In both cases just fill p1 first, then p2
    const nextMatchIdx = Math.floor(matchIdx / 2)
    const targetMatch = nextL[nextMatchIdx] || nextL[0]
    if (targetMatch) {
      if (!targetMatch.p1) targetMatch.p1 = winner
      else targetMatch.p1 = winner // always fill p1 from L advancement
    }
  } else {
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

// ══ ROUND ROBIN ══
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

// ══ SWISS ══
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
