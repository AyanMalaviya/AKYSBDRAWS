import { produce } from 'immer'

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

function padWithByes(players) {
  const size = nextPow2(players.length)
  if (players.length === size) return [...players]

  const byesNeeded = size - players.length
  const padded = []
  let pIdx = 0

  for (let i = 0; i < size / 2; i++) {
    padded.push(players[pIdx++] || null)
    if (i < byesNeeded) {
      padded.push(null)
    } else {
      padded.push(players[pIdx++] || null)
    }
  }
  return padded
}

function autoAdvanceByesInRound(draftRounds, roundIdx) {
  const round = draftRounds[roundIdx]
  round.forEach((match, matchIdx) => {
    const hasBye = (match.p1 && !match.p2) || (!match.p1 && match.p2)
    if (!hasBye || match.winner) return
    const winner = match.p1 || match.p2
    match.winner = winner
    match.isBye  = true
    const nextRound = draftRounds[roundIdx + 1]
    if (nextRound) {
      nextRound[Math.floor(matchIdx / 2)][matchIdx % 2 === 0 ? 'p1' : 'p2'] = winner
    }
  })
}

export function generateSingleElim(players) {
  const rounds = []
  let cur = []

  for (let i = 0; i < players.length; i += 2) {
    cur.push(makeMatch(players[i], players[i + 1] ?? null, 1))
  }
  rounds.push(cur)

  let rn = 2, prev = cur
  while (prev.length > 1) {
    const next = []
    for (let i = 0; i < prev.length; i += 2) {
      const match = makeMatch(null, null, rn)
      if (!prev[i + 1]) {
        match.isStructurallyDead = true
      }
      next.push(match)
    }
    rounds.push(next); prev = next; rn++
  }

  return produce({ type: 'single_elim', rounds, champion: null }, draft => {
    autoAdvanceByesInRound(draft.rounds, 0)
    if (draft.rounds[0].length === 1 && draft.rounds[0][0].isBye) {
      draft.champion = draft.rounds[0][0].winner
    }
  })
}

function _advanceSingleElimDraft(draft, roundIdx, matchIdx, winner, score1, score2) {
  if (winner === null) {
    if (draft.rounds[roundIdx][matchIdx].isBye && !draft.rounds[roundIdx][matchIdx].isStructurallyDead) return
    draft.rounds[roundIdx][matchIdx].winner = null
    draft.rounds[roundIdx][matchIdx].score1 = null
    draft.rounds[roundIdx][matchIdx].score2 = null
    let cur = matchIdx
    for (let r = roundIdx + 1; r < draft.rounds.length; r++) {
      const next = Math.floor(cur / 2)
      const slot = cur % 2 === 0 ? 'p1' : 'p2'
      const m = draft.rounds[r][next]
      if (!m) break
      m[slot] = null; m.winner = null; m.score1 = null; m.score2 = null
      if (m.isStructurallyDead && m.isBye) m.isBye = false
      cur = next
    }
    draft.champion = null
    return
  }

  draft.rounds[roundIdx][matchIdx].winner = winner
  if (score1 != null) draft.rounds[roundIdx][matchIdx].score1 = score1
  if (score2 != null) draft.rounds[roundIdx][matchIdx].score2 = score2

  const nextRound = draft.rounds[roundIdx + 1]
  if (nextRound) {
    const nextMatchIdx = Math.floor(matchIdx / 2)
    const slot = matchIdx % 2 === 0 ? 'p1' : 'p2'
    const targetMatch = nextRound[nextMatchIdx]
    targetMatch[slot] = winner
    if (targetMatch.isStructurallyDead) {
      targetMatch.isBye = true
      _advanceSingleElimDraft(draft, roundIdx + 1, nextMatchIdx, winner, null, null)
    }
  } else {
    draft.champion = winner
  }
}

export function advanceWinnerSingleElim(bracket, roundIdx, matchIdx, winner) {
  return produce(bracket, draft => {
    _advanceSingleElimDraft(draft, roundIdx, matchIdx, winner, null, null)
  })
}

export function advanceSingleElimWithScore(bracket, roundIdx, matchIdx, score1, score2) {
  return produce(bracket, draft => {
    const match = draft.rounds[roundIdx][matchIdx]
    if (!match.p1 || !match.p2) return
    let winner = score1 > score2 ? match.p1 : score2 > score1 ? match.p2 : match.p1
    _advanceSingleElimDraft(draft, roundIdx, matchIdx, winner, score1, score2)
  })
}

function recomputeBracketStandings(draft) {
  draft.standings = draft.standings.map(s => ({
    ...s, played: 0, wins: 0, draws: 0, losses: 0, points: 0,
    scoredFor: 0, scoredAgainst: 0, scoreDiff: 0
  }))

  draft.rounds.forEach(round => {
    round.forEach(m => {
      if (!m.winner || m.isBye) return
      const p1s = draft.standings.find(s => s.id === m.p1?.id)
      const p2s = draft.standings.find(s => s.id === m.p2?.id)
      if (!p1s || !p2s) return
      if (m.score1 != null && m.score2 != null) {
        p1s.scoredFor += m.score1; p1s.scoredAgainst += m.score2
        p2s.scoredFor += m.score2; p2s.scoredAgainst += m.score1
      }
      if (m.winner === 'draw') {
        p1s.draws++; p1s.points++; p1s.played++
        p2s.draws++; p2s.points++; p2s.played++
      } else if (m.winner.id === m.p1.id) {
        p1s.wins++; p1s.points += 3; p1s.played++
        p2s.losses++; p2s.played++
      } else if (m.winner.id === m.p2.id) {
        p2s.wins++; p2s.points += 3; p2s.played++
        p1s.losses++; p1s.played++
      }
    })
  })

  draft.standings.forEach(s => { s.scoreDiff = s.scoredFor - s.scoredAgainst })
  draft.standings.sort((a, b) =>
    (b.points    - a.points)    ||
    (b.scoreDiff - a.scoreDiff) ||
    (b.scoredFor - a.scoredFor) ||
    (a.name || '').localeCompare(b.name || '')
  )

  const allDone = draft.rounds.every(r => r.every(m => m.winner || m.isBye))
  draft.champion = allDone ? draft.standings[0] : null
}

export function generateStage2Elim(players) {
  const slots = players
  const rounds = []
  const cur    = []
  for (let i = 0; i < slots.length; i += 2) {
    cur.push(makeMatch(slots[i], slots[i + 1] ?? null, 1, 'stage2'))
  }
  rounds.push(cur)

  return produce({ type: 'stage2_elim', rounds, champion: null, pendingByeSelection: null }, draft => {
    autoAdvanceByesInRound(draft.rounds, 0)
    if (draft.rounds[0].length === 1 && draft.rounds[0][0].isBye) {
      draft.champion = draft.rounds[0][0].winner
    }
  })
}

function _finalizeStage2Match(draft, roundIdx, matchIdx, winner, score1, score2) {
  if (winner === null) {
    draft.rounds[roundIdx][matchIdx].winner = null
    draft.rounds[roundIdx][matchIdx].score1 = null
    draft.rounds[roundIdx][matchIdx].score2 = null
    draft.rounds = draft.rounds.slice(0, roundIdx + 1)
    draft.champion = null
    draft.pendingByeSelection = null
    return
  }

  draft.rounds[roundIdx][matchIdx].winner = winner
  if (score1 != null) draft.rounds[roundIdx][matchIdx].score1 = score1
  if (score2 != null) draft.rounds[roundIdx][matchIdx].score2 = score2

  const allDone = draft.rounds[roundIdx].every(m => m.winner !== null)
  if (allDone && !draft.rounds[roundIdx + 1] && !draft.champion) {
    const winners = draft.rounds[roundIdx].map(m => m.winner)
    if (winners.length === 1) {
      draft.champion = winners[0]
    } else if (winners.length % 2 !== 0) {
      draft.pendingByeSelection = winners
    } else {
      const nextRoundMatches = []
      const rn = roundIdx + 2
      let left = 0, right = winners.length - 1
      while (left < right) {
        nextRoundMatches.push(makeMatch(winners[left], winners[right], rn, 'stage2'))
        left++; right--
      }
      draft.rounds.push(nextRoundMatches)
      autoAdvanceByesInRound(draft.rounds, roundIdx + 1)
    }
  }
}

// FIX: when byePlayerId is provided, guard the splice so a not-found id
// never defaults to index 0 (which was causing the first player to always
// get the bye). If the id is genuinely missing we bail out gracefully.
export function advanceWinnerStage2Elim(bracket, roundIdx, matchIdx, winner, byePlayerId = null) {
  return produce(bracket, draft => {
    if (byePlayerId) {
      const advancing = draft.rounds[roundIdx].map(m => m.winner)
      const byeIdx    = advancing.findIndex(p => p?.id === byePlayerId)

      // Guard: if the requested bye player isn't found, don't silently
      // pick index 0 — skip bye resolution so App can retry with correct id.
      if (byeIdx === -1) return

      draft.pendingByeSelection = null
      const remaining = [...advancing]
      const [byePlayer] = remaining.splice(byeIdx, 1)

      const nextRoundMatches = []
      const rn = roundIdx + 2
      let left = 0, right = remaining.length - 1
      while (left < right) {
        nextRoundMatches.push(makeMatch(remaining[left], remaining[right], rn, 'stage2'))
        left++; right--
      }
      const byeMatch = makeMatch(byePlayer, { id: 'bye', name: 'BYE' }, rn, 'stage2')
      byeMatch.winner = byePlayer
      byeMatch.isBye  = true
      nextRoundMatches.push(byeMatch)
      draft.rounds.push(nextRoundMatches)
      return
    }
    _finalizeStage2Match(draft, roundIdx, matchIdx, winner, null, null)
  })
}

export function advanceStage2ElimWithScore(bracket, roundIdx, matchIdx, score1, score2) {
  return produce(bracket, draft => {
    const match = draft.rounds[roundIdx][matchIdx]
    if (!match.p1 || !match.p2 || match.isBye) return
    let winner = score1 > score2 ? match.p1 : score2 > score1 ? match.p2 : match.p1
    _finalizeStage2Match(draft, roundIdx, matchIdx, winner, score1, score2)
  })
}

/* --- DOUBLE ELIMINATION --- */
export function generateDoubleElim(players) {
  const slots = padWithByes(players)
  const size = slots.length
  const wRounds = []
  let wCur = []
  for (let i = 0; i < size; i += 2) wCur.push(makeMatch(slots[i], slots[i + 1], 1, 'winners'))
  wRounds.push(wCur)
  let rn = 2, wPrev = wCur
  while (wPrev.length > 1) {
    const next = []
    for (let i = 0; i < wPrev.length; i += 2) next.push(makeMatch(null, null, rn, 'winners'))
    wRounds.push(next); wPrev = next; rn++
  }
  const wLen = wRounds.length
  const lLen = 2 * (wLen - 1)
  const lRounds = []
  let lCount = Math.max(1, wRounds[0].length / 2)
  for (let i = 0; i < lLen; i++) {
    const matches = []
    for (let j = 0; j < lCount; j++) matches.push(makeMatch(null, null, i + 1, 'losers'))
    lRounds.push(matches)
    if (i % 2 === 1) lCount = Math.max(1, Math.floor(lCount / 2))
  }
  const grandFinal = makeMatch(null, null, 99, 'grand_final')

  return produce({ type: 'double_elim', wRounds, lRounds, grandFinal, champion: null }, draft => {
    autoAdvanceByesInRound(draft.wRounds, 0)
    draft.wRounds[0].forEach((match, matchIdx) => {
      if (!match.isBye) return
      const nextW = draft.wRounds[1]
      if (nextW) nextW[Math.floor(matchIdx / 2)][matchIdx % 2 === 0 ? 'p1' : 'p2'] = match.winner
      else draft.grandFinal.p1 = match.winner
    })
  })
}

export function advanceWinnerDE(bracket, roundIdx, matchIdx, winner) {
  return produce(bracket, draft => {
    const match = draft.wRounds[roundIdx][matchIdx]
    const loser = match.p1?.id === winner?.id ? match.p2 : match.p1
    match.winner = winner
    const nextW = draft.wRounds[roundIdx + 1]
    if (nextW) {
      nextW[Math.floor(matchIdx / 2)][matchIdx % 2 === 0 ? 'p1' : 'p2'] = winner
    } else {
      draft.grandFinal.p1 = winner
    }
    if (loser) {
      if (roundIdx === 0) {
        const lMatchIdx = Math.floor(matchIdx / 2)
        const lMatch = draft.lRounds[0][lMatchIdx]
        if (lMatch) {
          if (!lMatch.p1) lMatch.p1 = loser
          else if (!lMatch.p2) lMatch.p2 = loser
        }
      } else {
        const lRoundIdx = roundIdx * 2 - 1
        const lMatch = draft.lRounds[lRoundIdx]?.[matchIdx]
        if (lMatch) lMatch.p2 = loser
      }
    }
  })
}

export function advanceLoserDE(bracket, roundIdx, matchIdx, winner) {
  return produce(bracket, draft => {
    draft.lRounds[roundIdx][matchIdx].winner = winner
    const nextL = draft.lRounds[roundIdx + 1]
    if (nextL) {
      const nextMatchIdx = Math.floor(matchIdx / 2)
      const targetMatch = nextL[nextMatchIdx] || nextL[0]
      if (targetMatch) {
        if (!targetMatch.p1) targetMatch.p1 = winner
        else targetMatch.p1 = winner
      }
    } else {
      draft.grandFinal.p2 = winner
    }
  })
}

export function advanceGrandFinalDE(bracket, winner) {
  return produce(bracket, draft => {
    draft.grandFinal.winner = winner
    draft.champion = winner
  })
}

/* --- ROUND ROBIN --- */
export function generateRoundRobin(players) {
  const list = players.length % 2 === 0 ? [...players] : [...players, { name: 'BYE', id: 'bye' }]
  const total = list.length
  const rounds = []

  for (let r = 0; r < total - 1; r++) {
    const roundMatches = []
    for (let i = 0; i < total / 2; i++) {
      const p1 = list[i], p2 = list[total - 1 - i]
      if (p1.id !== 'bye' && p2.id !== 'bye') {
        roundMatches.push(makeMatch(p1, p2, r + 1, 'round_robin'))
      }
    }
    rounds.push(roundMatches)
    list.splice(1, 0, list.pop())
  }

  const standings = players.map(p => ({
    ...p,
    played: 0, wins: 0, draws: 0, losses: 0, points: 0,
    scoredFor: 0, scoredAgainst: 0, scoreDiff: 0
  }))

  return { type: 'round_robin', rounds, standings, champion: null }
}

export function advanceWinnerRoundRobin(bracket, roundIdx, matchIdx, winner) {
  return produce(bracket, draft => {
    const match = draft.rounds[roundIdx][matchIdx]
    match.winner = winner
    match.score1 = null
    match.score2 = null
    recomputeBracketStandings(draft)
  })
}

export function setDrawRoundRobin(bracket, roundIdx, matchIdx) {
  return produce(bracket, draft => {
    const match = draft.rounds[roundIdx][matchIdx]
    match.winner = 'draw'
    match.score1 = null
    match.score2 = null
    recomputeBracketStandings(draft)
  })
}

export function advanceRoundRobinWithScore(bracket, roundIdx, matchIdx, score1, score2) {
  return produce(bracket, draft => {
    const match = draft.rounds[roundIdx][matchIdx]
    if (!match.p1 || !match.p2) return
    if (score1 > score2)      match.winner = match.p1
    else if (score2 > score1) match.winner = match.p2
    else                      match.winner = 'draw'
    match.score1 = score1
    match.score2 = score2
    recomputeBracketStandings(draft)
  })
}

/* --- SWISS --- */
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
