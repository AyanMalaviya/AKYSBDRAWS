// --- Group Draw Engine ---

export const uid = () => Math.random().toString(36).slice(2, 8)

const shuffle = arr => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const TAG_META = {
  A: { label: 'Strong',  color: '#b44eff', glow: 'rgba(180,78,255,0.6)',  badge: 'tag-purple' },
  B: { label: 'Average', color: '#ffe500', glow: 'rgba(255,229,0,0.6)',   badge: 'tag-orange' },
  C: { label: 'Weak',    color: '#00ff94', glow: 'rgba(0,255,148,0.6)',   badge: 'tag-green'  },
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
  return group.standings[0] || null
}

/**
 * Returns advancer info for `count` advancers per group.
 * count = 1 → only winner; count = 2 → winner + runner-up (default); etc.
 */
export function getGroupAdvancerInfo(group, count = 2) {
  const allDone = group.matches.length > 0 && group.matches.every(m => m.winner !== null)
  if (!allDone) return { advancers: [], tied: [], needsTieBreak: false }

  const sorted = group.standings
  if (sorted.length <= 1) return { advancers: sorted, tied: [], needsTieBreak: false }

  const safeCount = Math.min(count, sorted.length)

  // The last advancer slot — check if there's a tie at that boundary
  const boundary = sorted[safeCount - 1]
  const nextOne  = sorted[safeCount]   // first player NOT advancing (may be undefined)

  // No tie at boundary → advance top `safeCount` cleanly
  if (!nextOne || boundary.points !== nextOne.points || boundary.wins !== nextOne.wins) {
    return { advancers: sorted.slice(0, safeCount), tied: [], needsTieBreak: false }
  }

  // Tie exists at boundary → advancers = those clearly above the boundary,
  // tied = all players sharing boundary score
  const clearAdvancers = sorted.slice(0, safeCount - 1).filter(
    p => p.points !== boundary.points || p.wins !== boundary.wins
  )
  const tiedPlayers = sorted.filter(
    p => p.points === boundary.points && p.wins === boundary.wins
  )
  return { advancers: clearAdvancers, tied: tiedPlayers, needsTieBreak: true }
}

export function getGroupAdvancers(group, count = 2) {
  const { advancers, tied, needsTieBreak } = getGroupAdvancerInfo(group, count)
  if (needsTieBreak) return [...advancers, ...tied]
  return advancers.slice(0, count)
}

// === UPDATED GROUP MAKING LOGIC ===
export function generateGroups(players, groupSize) {
  const byTag = { A: [], B: [], C: [] }
  players.forEach(p => {
    const t = (p.tag || 'B').toUpperCase()
    ;(byTag[t] = byTag[t] || []).push(p)
  })

  const shuffledA = shuffle(byTag.A || [])
  const shuffledB = shuffle(byTag.B || [])
  const shuffledC = shuffle(byTag.C || [])

  const numGroups = Math.max(1, Math.ceil(players.length / groupSize))
  const groups = Array.from({ length: numGroups }, () => [])

  for (let i = 0; i < numGroups; i++) {
    if (shuffledA.length > 0 && groups[i].length < groupSize) groups[i].push(shuffledA.shift())
    if (shuffledB.length > 0 && groups[i].length < groupSize) groups[i].push(shuffledB.shift())
    if (shuffledC.length > 0 && groups[i].length < groupSize) groups[i].push(shuffledC.shift())
  }

  const remaining = [...shuffledA, ...shuffledB, ...shuffledC]
  const shuffledRemaining = shuffle(remaining)

  for (const p of shuffledRemaining) {
    let targetGroup = groups.find(g => g.length < groupSize)
    if (!targetGroup) {
      targetGroup = groups.reduce((minG, g) => g.length < minG.length ? g : minG, groups[0])
    }
    targetGroup.push(p)
  }

  const allGroups = groups.filter(g => g.length > 0)
  if (allGroups.length === 0) return [recomputeGroup({ id: 'G1', name: 'Group 1', players, matches: [] })]

  return allGroups.map((groupPlayers, i) =>
    recomputeGroup({ id: `G${i + 1}`, name: `Group ${i + 1}`, players: groupPlayers, matches: [] })
  )
}

export function recordGroupResult(groups, groupId, matchId, winner) {
  return groups.map(g => {
    if (g.id !== groupId) return g
    const matches = g.matches.map(m => m.id !== matchId ? m : { ...m, winner })
    return recomputeGroup({ ...g, matches })
  })
}

// --- Edit-mode helpers ---
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
