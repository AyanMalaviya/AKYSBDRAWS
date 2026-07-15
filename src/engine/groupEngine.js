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
  standings.sort((a, b) => b.points - a.points || b.wins - a.wins)
  return { ...g, matches: newMatches, standings }
}

export function getGroupWinner(group) {
  const allDone = group.matches.length > 0 && group.matches.every(m => m.winner !== null)
  if (!allDone) return null
  return [...group.standings].sort((a, b) => b.points - a.points || b.wins - a.wins)[0] || null
}

/**
 * Returns advancer info for a completed group.
 * Tie is detected when rank-2 and rank-3 share equal points AND equal wins.
 */
export function getGroupAdvancerInfo(group) {
  const allDone = group.matches.length > 0 && group.matches.every(m => m.winner !== null)
  if (!allDone) return { advancers: [], tied: [], needsTieBreak: false }

  const sorted = [...group.standings].sort((a, b) => b.points - a.points || b.wins - a.wins)
  if (sorted.length <= 2) return { advancers: sorted, tied: [], needsTieBreak: false }

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
//
// Rule: Within each new group, match A players from one source-group
// against B players from the NEXT source-group (circular).
// i.e. A(G1) vs B(G2), A(G2) vs B(G3), …, A(Gn) vs B(G1)
//
// Algorithm:
// 1. Collect winners (rank 1) and runners-up (rank 2) per source group.
//    Winners carry the tag of their source-group rank: "A" for winners, "B" for runners-up.
// 2. Sort each list by the original tag priority (stronger players first).
// 3. Snake-draft into new groups (same as generateGroups).
// 4. Inside each new group build matches so that:
//    • A-tagged players DON’T face each other first — they face B-tagged players first.
//    • Only when no B opponent is left does an A face another A.
// ──────────────────────────────────────────────────

function makeCrossTagMatches(players, groupId) {
  // Separate into A (winners) and B (runners-up) pools
  const poolA = shuffle(players.filter(p => (p.advanceTag || p.tag) === 'A'))
  const poolB = shuffle(players.filter(p => (p.advanceTag || p.tag) === 'B'))
  const rest  = players.filter(p => !['A','B'].includes(p.advanceTag || p.tag))

  const matches = []
  const paired  = new Set()

  // Step 1: pair each A with a B (cross-tag, circular over pool length)
  poolA.forEach((a, i) => {
    const b = poolB[i % poolB.length]
    if (b) {
      matches.push({ id: uid(), groupId, p1: a, p2: b, winner: null })
      paired.add(a.id)
      paired.add(b.id)
    }
  })

  // Step 2: any unpaired B players face each other
  const unpaired = [...poolA, ...poolB, ...rest].filter(p => !paired.has(p.id))
  for (let i = 0; i < unpaired.length; i++) {
    for (let j = i + 1; j < unpaired.length; j++) {
      matches.push({ id: uid(), groupId, p1: unpaired[i], p2: unpaired[j], winner: null })
    }
  }

  // Step 3: complete round-robin for any remaining players not yet fully matched
  // (ensures every player plays everyone in the group)
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

/**
 * generateCrossTagGroups — used for Round 2 and beyond.
 * advancers: array of players, each with an `advanceTag` property:
 *   'A' = winner (rank 1 from their R1 group)
 *   'B' = runner-up (rank 2)
 * groupSize: target players per group.
 */
export function generateCrossTagGroups(advancers, groupSize) {
  const numGroups = Math.max(1, Math.ceil(advancers.length / groupSize))

  // Separate winners and runners-up, shuffle each
  const winners    = shuffle(advancers.filter(p => p.advanceTag === 'A'))
  const runnersUp  = shuffle(advancers.filter(p => p.advanceTag === 'B'))

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

  // Distribute with snake-draft
  ordered.forEach((p, i) => groups[i % numGroups].players.push(p))

  // Build groups: cross-tag matches first, then full round-robin
  return groups.map(g => {
    const crossMatches = makeCrossTagMatches(g.players, g.id)
    const standings    = g.players.map(p => ({ ...p, played: 0, wins: 0, draws: 0, losses: 0, points: 0 }))
    return { ...g, matches: crossMatches, standings }
  })
}

// ── Standard group generation (Round 1) ──
export function generateGroups(players, groupSize) {
  const numGroups = Math.max(1, Math.ceil(players.length / groupSize))
  const byTag = { A: [], B: [], C: [] }
  players.forEach(p => { const t = (p.tag || 'B').toUpperCase(); byTag[t] = byTag[t] || []; byTag[t].push(p) })

  const orderedPlayers = [
    ...shuffle(byTag.A || []),
    ...shuffle(byTag.B || []),
    ...shuffle(byTag.C || [])
  ]

  const groups = Array.from({ length: numGroups }, (_, i) => ({
    id: `G${i + 1}`, name: `Group ${i + 1}`, players: []
  }))
  orderedPlayers.forEach((p, i) => groups[i % numGroups].players.push(p))
  return groups.map(g => recomputeGroup(g))
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
