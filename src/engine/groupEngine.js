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

// ── SMART MATCH RECOMPUTATION ──
// Preserves existing match scores when the roster changes,
// adds new required matches, and purges obsolete ones.
export function recomputeGroup(g) {
  const idealMatches = makeRoundRobin(g.players, g.id)
  const oldMatches = g.matches || []

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
        winner: existing.winner === 'draw' ? 'draw' : (existing.winner ? g.players.find(p => p.id === existing.winner.id) || null : null)
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
  const sorted = [...group.standings].sort((a, b) => b.points - a.points || b.wins - a.wins)
  return sorted[0] || null
}

// Returns top N advancers. If tied for the last spot, returns all tied players (caller resolves).
export function getGroupAdvancers(group, count = 2) {
  const allDone = group.matches.length > 0 && group.matches.every(m => m.winner !== null)
  if (!allDone) return []
  const sorted = [...group.standings].sort((a, b) => b.points - a.points || b.wins - a.wins)
  return sorted.slice(0, Math.min(count, sorted.length))
}

export function generateGroups(players, groupSize) {
  const numGroups = Math.max(1, Math.ceil(players.length / groupSize))
  const byTag = { A: [], B: [], C: [] }
  players.forEach(p => {
    const t = (p.tag || 'B').toUpperCase()
    byTag[t] = byTag[t] || []
    byTag[t].push(p)
  })

  const orderedPlayers = [
    ...shuffle(byTag.A || []),
    ...shuffle(byTag.B || []),
    ...shuffle(byTag.C || [])
  ]

  const groups = Array.from({ length: numGroups }, (_, i) => ({
    id: `G${i + 1}`,
    name: `Group ${i + 1}`,
    players: []
  }))

  // Snake-draft distribution: A→G1,G2,G3…  B→G1,G2,G3…  C→G1,G2,G3…
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

// ── EDIT MODE MUTATION HELPERS ──

export function renameGroup(groups, groupId, newName) {
  return groups.map(g => g.id === groupId ? { ...g, name: newName } : g)
}

export function addPlayerToGroup(groups, groupId) {
  return groups.map(g => {
    if (g.id !== groupId) return g
    const newPlayer = { id: `p_${uid()}`, name: `New Player`, tag: 'C' }
    return recomputeGroup({ ...g, players: [...g.players, newPlayer] })
  })
}

export function removePlayerFromGroup(groups, groupId, playerId) {
  return groups.map(g => {
    if (g.id !== groupId) return g
    return recomputeGroup({ ...g, players: g.players.filter(p => p.id !== playerId) })
  })
}

// BUG FIX: was (groups, groupId, toGroupId, playerId) — args were swapped at call site.
// Canonical signature: (groups, fromGroupId, playerId, toGroupId)
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
    const newPlayers = g.players.map(p => p.id === playerId ? { ...p, ...updates } : p)
    return recomputeGroup({ ...g, players: newPlayers })
  })
}

export function createNewGroup(groups) {
  const nextId = groups.length > 0
    ? Math.max(...groups.map(g => parseInt(g.id.replace('G', '')) || 0)) + 1
    : 1
  return [...groups, recomputeGroup({
    id: `G${nextId}`,
    name: `Group ${nextId}`,
    players: [],
    matches: []
  })]
}

// NEW: Delete a group entirely (only allowed in edit/draft mode)
export function deleteGroup(groups, groupId) {
  return groups.filter(g => g.id !== groupId)
}
