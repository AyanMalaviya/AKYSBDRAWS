// ── Group Draw Engine ──
export const uid = () => Math.random().toString(36).slice(2, 8)

const shuffle = arr => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const TAG_META = {
  A: { label: 'Strong',  color: '#ff4d4d', glow: 'rgba(255,77,77,0.6)',   badge: 'tag-red'    },
  B: { label: 'Average', color: '#fbbf24', glow: 'rgba(251,191,36,0.6)',  badge: 'tag-orange' },
  C: { label: 'Weak',    color: '#34d399', glow: 'rgba(52,211,153,0.6)',  badge: 'tag-green'  },
}

function makeRoundRobin(players, groupId) {
  const matches = []
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push({ id: uid(), groupId, p1: players[i], p2: players[j], winner: null })
    }
  }
  return matches
}

export function recomputeGroup(g) {
  const idealMatches = makeRoundRobin(g.players, g.id)
  const oldMatches   = g.matches || []

  const newMatches = idealMatches.map(ideal => {
    const existing = oldMatches.find(m =>
      (m.p1.id === ideal.p1.id && m.p2.id === ideal.p2.id) ||
      (m.p1.id === ideal.p2.id && m.p2.id === ideal.p1.id)
    )
    if (existing) {
      return {
        ...existing,
        p1: g.players.find(p => p.id === existing.p1.id) || existing.p1,
        p2: g.players.find(p => p.id === existing.p2.id) || existing.p2,
        winner: existing.winner === 'draw' ? 'draw'
          : (existing.winner ? g.players.find(p => p.id === existing.winner.id) || null : null),
      }
    }
    return ideal
  })

  const standings = g.players.map(p => ({ ...p, played: 0, wins: 0, draws: 0, losses: 0, points: 0 }))
  newMatches.forEach(m => {
    if (!m.winner) return
    const p1s = standings.find(s => s.id === m.p1.id)
    const p2s = standings.find(s => s.id === m.p2.id)
    if (!p1s || !p2s) return
    if (m.winner === 'draw') {
      p1s.draws++; p1s.points++; p1s.played++
      p2s.draws++; p2s.points++; p2s.played++
    } else if (m.winner?.id === m.p1.id) {
      p1s.wins++; p1s.points += 3; p1s.played++
      p2s.losses++; p2s.played++
    } else if (m.winner?.id === m.p2.id) {
      p2s.wins++; p2s.points += 3; p2s.played++
      p1s.losses++; p1s.played++
    }
  })
  // BUG FIX #7: sort once here — callers reuse this already-sorted array
  standings.sort((a, b) => b.points - a.points || b.wins - a.wins)
  return { ...g, matches: newMatches, standings }
}

// BUG FIX #7: reuse standings already sorted by recomputeGroup
export function getGroupWinner(group) {
  const allDone = group.matches.length > 0 && group.matches.every(m => m.winner !== null)
  if (!allDone) return null
  return group.standings[0] || null
}

/**
 * Returns advancer info for a completed group.
 * BUG FIX #8: 2-player groups only have 1 advancer (the winner), not both.
 * Tie is detected when rank-2 and rank-3 share equal points AND equal wins.
 */
export function getGroupAdvancerInfo(group) {
  const allDone = group.matches.length > 0 && group.matches.every(m => m.winner !== null)
  if (!allDone) return { advancers: [], tied: [], needsTieBreak: false }

  const sorted = group.standings // already sorted by recomputeGroup

  // BUG FIX #8: 2-player group — only the winner advances
  if (sorted.length <= 1) return { advancers: sorted, tied: [], needsTieBreak: false }
  if (sorted.length === 2) return { advancers: [sorted[0]], tied: [], needsTieBreak: false }

  const rank2 = sorted[1]
  const rank3 = sorted[2]
  const tied2and3 = rank2.points === rank3.points && rank2.wins === rank3.wins
  if (!tied2and3) return { advancers: [sorted[0], rank2], tied: [], needsTieBreak: false }

  const tiedPlayers = sorted.slice(1).filter(
    p => p.points === rank2.points && p.wins === rank2.wins
  )
  return { advancers: [sorted[0]], tied: tiedPlayers, needsTieBreak: true }
}

export function getGroupAdvancers(group, count = 2) {
  const { advancers, tied, needsTieBreak } = getGroupAdvancerInfo(group)
  if (needsTieBreak) return [...advancers, ...tied]
  return advancers.slice(0, count)
}

// ──────────────────────────────────────────────────
// Cross-tag group generation (Round 2 / Knockout stages)
// ──────────────────────────────────────────────────

function makeCrossTagMatches(players, groupId) {
  const poolA = shuffle(players.filter(p => (p.advanceTag || p.tag) === 'A'))
  const poolB = shuffle(players.filter(p => (p.advanceTag || p.tag) === 'B'))
  const rest  = players.filter(p => !['A','B'].includes(p.advanceTag || p.tag))

  const matches = []
  const paired  = new Set()

  poolA.forEach((a, i) => {
    const b = poolB[i % poolB.length]
    if (b) {
      matches.push({ id: uid(), groupId, p1: a, p2: b, winner: null })
      paired.add(a.id)
      paired.add(b.id)
    }
  })

  const unpaired = [...poolA, ...poolB, ...rest].filter(p => !paired.has(p.id))
  for (let i = 0; i < unpaired.length; i++) {
    for (let j = i + 1; j < unpaired.length; j++) {
      matches.push({ id: uid(), groupId, p1: unpaired[i], p2: unpaired[j], winner: null })
    }
  }

  // Complete full round-robin — every player plays everyone
  const allPairs = new Set(matches.map(m => [m.p1.id, m.p2.id].sort().join('|')))
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const key = [players[i].id, players[j].id].sort().join('|')
      if (!allPairs.has(key)) {
        matches.push({ id: uid(), groupId, p1: players[i], p2: players[j], winner: null })
        allPairs.add(key)
      }
    }
  }

  return matches
}

export function generateCrossTagGroups(advancers, groupSize) {
  const numGroups = Math.max(1, Math.ceil(advancers.length / groupSize))

  const winners   = shuffle(advancers.filter(p => p.advanceTag === 'A'))
  const runnersUp = shuffle(advancers.filter(p => p.advanceTag === 'B'))

  // Snake-draft: W1, RU1, W2, RU2, …
  const ordered = []
  const maxLen  = Math.max(winners.length, runnersUp.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < winners.length)   ordered.push(winners[i])
    if (i < runnersUp.length) ordered.push(runnersUp[i])
  }

  const groups = Array.from({ length: numGroups }, (_, i) => ({
    id: `R2G${i + 1}`,
    name: `Round 2 — Group ${i + 1}`,
    players: [],
    matches: [],
    standings: [],
  }))

  ordered.forEach((p, i) => groups[i % numGroups].players.push(p))

  return groups.map(g => {
    const crossMatches = makeCrossTagMatches(g.players, g.id)
    const standings    = g.players.map(p => ({ ...p, played: 0, wins: 0, draws: 0, losses: 0, points: 0 }))
    return { ...g, matches: crossMatches, standings }
  })
}

/**
 * generateGroups — Round 1, tag-aware with proper remainder redistribution.
 *
 * BUG FIX #1: Remainder redistribution rule:
 *   A leftover  → appended to last B group (fallback: last A group)
 *   B leftover  → appended to last C group (fallback: last B group)
 *   C leftover  → appended to last C group
 *
 * Each tag pool is shuffled (random within tier), then sliced into full groups
 * of `groupSize`. Remainders are redistributed before round-robin is built.
 */
export function generateGroups(players, groupSize) {
  const byTag = { A: [], B: [], C: [] }
  players.forEach(p => {
    const t = (p.tag || 'B').toUpperCase()
    ;(byTag[t] = byTag[t] || []).push(p)
  })

  const shuffledA = shuffle(byTag.A || [])
  const shuffledB = shuffle(byTag.B || [])
  const shuffledC = shuffle(byTag.C || [])

  // Slice each tier into full groups of `groupSize`
  const groupsA = []
  for (let i = 0; i + groupSize <= shuffledA.length; i += groupSize)
    groupsA.push(shuffledA.slice(i, i + groupSize))
  const remainA = shuffledA.slice(groupsA.length * groupSize)

  const groupsB = []
  for (let i = 0; i + groupSize <= shuffledB.length; i += groupSize)
    groupsB.push(shuffledB.slice(i, i + groupSize))
  const remainB = shuffledB.slice(groupsB.length * groupSize)

  const groupsC = []
  for (let i = 0; i + groupSize <= shuffledC.length; i += groupSize)
    groupsC.push(shuffledC.slice(i, i + groupSize))
  const remainC = shuffledC.slice(groupsC.length * groupSize)

  // Redistribute remainders: A→lastB (else lastA), B→lastC (else lastB), C→lastC
  if (remainA.length > 0) {
    const target = groupsB.length > 0 ? groupsB : groupsA
    if (target.length > 0) target[target.length - 1].push(...remainA)
    else groupsC.push(remainA) // absolute fallback: start a new group
  }
  if (remainB.length > 0) {
    const target = groupsC.length > 0 ? groupsC : groupsB
    if (target.length > 0) target[target.length - 1].push(...remainB)
    else groupsC.push(remainB)
  }
  if (remainC.length > 0) {
    if (groupsC.length > 0) groupsC[groupsC.length - 1].push(...remainC)
    else if (groupsB.length > 0) groupsB[groupsB.length - 1].push(...remainC)
    else if (groupsA.length > 0) groupsA[groupsA.length - 1].push(...remainC)
    else groupsC.push(remainC)
  }

  // If nothing was grouped at all (e.g. only 1 player per tier, groupSize=4)
  // fall back to a single mixed group
  const allGroups = [...groupsA, ...groupsB, ...groupsC]
  if (allGroups.length === 0) return [recomputeGroup({ id: 'G1', name: 'Group 1', players, matches: [] })]

  return allGroups.map((players, i) =>
    recomputeGroup({ id: `G${i + 1}`, name: `Group ${i + 1}`, players, matches: [] })
  )
}

export function recordGroupResult(groups, groupId, matchId, winner) {
  return groups.map(g => {
    if (g.id !== groupId) return g
    const matches = g.matches.map(m => m.id !== matchId ? m : { ...m, winner })
    return recomputeGroup({ ...g, matches })
  })
}

// ── Edit-mode helpers ──
export function renameGroup(groups, groupId, newName) {
  return groups.map(g => g.id === groupId ? { ...g, name: newName } : g)
}
export function addPlayerToGroup(groups, groupId) {
  return groups.map(g => {
    if (g.id !== groupId) return g
    return recomputeGroup({ ...g, players: [...g.players, { id: `p_${uid()}`, name: 'New Player', tag: 'C' }] })
  })
}
export function removePlayerFromGroup(groups, groupId, playerId) {
  return groups.map(g => {
    if (g.id !== groupId) return g
    return recomputeGroup({ ...g, players: g.players.filter(p => p.id !== playerId) })
  })
}
export function movePlayerBetweenGroups(groups, fromGroupId, playerId, toGroupId) {
  let player = null
  for (const g of groups) if (g.id === fromGroupId) player = g.players.find(p => p.id === playerId)
  if (!player || fromGroupId === toGroupId) return groups
  return groups.map(g => {
    if (g.id === fromGroupId) return recomputeGroup({ ...g, players: g.players.filter(p => p.id !== playerId) })
    if (g.id === toGroupId)   return recomputeGroup({ ...g, players: [...g.players, player] })
    return g
  })
}
export function updatePlayerProps(groups, groupId, playerId, updates) {
  return groups.map(g => {
    if (g.id !== groupId) return g
    return recomputeGroup({ ...g, players: g.players.map(p => p.id === playerId ? { ...p, ...updates } : p) })
  })
}
export function createNewGroup(groups) {
  const nextId = groups.length > 0
    ? Math.max(...groups.map(g => parseInt(g.id.replace(/\D/g,'')) || 0)) + 1 : 1
  return [...groups, recomputeGroup({ id: `G${nextId}`, name: `Group ${nextId}`, players: [], matches: [] })]
}
export function deleteGroup(groups, groupId) {
  return groups.filter(g => g.id !== groupId)
}
