// ── Bracket Engine — generates all tournament formats ──

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
  id: uid(), round, bracket, p1: p1 || null, p2: p2 || null, winner: null, score1: '', score2: ''
})
const nextPow2 = n => Math.pow(2, Math.ceil(Math.log2(n)))

// ── Single Elimination ──
export function generateSingleElim(players) {
  const size = nextPow2(players.length)
  const seeded = [...players]
  while (seeded.length < size) seeded.push(null)
  const rounds = []
  let current = []
  for (let i = 0; i < size; i += 2) current.push(makeMatch(seeded[i], seeded[i + 1], 1))
  rounds.push(current)
  let roundNum = 2, prev = current
  while (prev.length > 1) {
    const next = prev.reduce((acc, _, i, a) => i % 2 === 0 ? [...acc, makeMatch(null, null, roundNum)] : acc, [])
    rounds.push(next); prev = next; roundNum++
  }
  return { type: 'single_elim', rounds, champion: null }
}

export function advanceWinnerSingleElim(bracket, roundIdx, matchIdx, winner) {
  const b = JSON.parse(JSON.stringify(bracket))
  b.rounds[roundIdx][matchIdx].winner = winner
  const next = b.rounds[roundIdx + 1]
  if (next) {
    const slot = matchIdx % 2 === 0 ? 'p1' : 'p2'
    next[Math.floor(matchIdx / 2)][slot] = winner
  } else {
    b.champion = winner
  }
  return b
}

// ── Double Elimination ──
export function generateDoubleElim(players) {
  const size = nextPow2(players.length)
  const seeded = [...players]
  while (seeded.length < size) seeded.push(null)
  const wRounds = []
  let wCurrent = []
  for (let i = 0; i < size; i += 2) wCurrent.push(makeMatch(seeded[i], seeded[i + 1], 1, 'winners'))
  wRounds.push(wCurrent)
  let rn = 2, prev = wCurrent
  while (prev.length > 1) {
    const next = prev.reduce((acc, _, i) => i % 2 === 0 ? [...acc, makeMatch(null, null, rn, 'winners')] : acc, [])
    wRounds.push(next); prev = next; rn++
  }
  const lRounds = []
  let lSize = size / 2, lr = 1
  while (lSize >= 1) {
    const matches = []
    for (let i = 0; i < lSize; i += 2) matches.push(makeMatch(null, null, lr, 'losers'))
    if (matches.length) lRounds.push(matches)
    lSize = lSize / 2; lr++
  }
  const grandFinal = makeMatch(null, null, 99, 'grand_final')
  return { type: 'double_elim', wRounds, lRounds, grandFinal, champion: null }
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

// ── Main entry ──
export function generateBracket(format, players) {
  switch (format) {
    case 'single_elim': return generateSingleElim(players)
    case 'double_elim': return generateDoubleElim(players)
    case 'round_robin': return generateRoundRobin(players)
    case 'swiss':       return generateSwiss(players)
    default: throw new Error(`Unknown format: ${format}`)
  }
}
