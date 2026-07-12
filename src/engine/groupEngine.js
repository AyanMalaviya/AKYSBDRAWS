// ── Group Draw Engine ──
// Players are tagged A (strong), B (average), C (weak).
//
// GROUPING RULES:
//   1. Shuffle players within each tag randomly.
//   2. Slice into groups of `groupSize` for each tag.
//   3. Remainders (< groupSize players left over in a tag) are redistributed:
//        A remainders  → appended to the LAST B group (or form a new mixed group)
//        B remainders  → appended to the LAST C group (or form a new mixed group)
//        C remainders  → appended to the LAST C group (wrap the last group)
//      If the target tag has NO groups at all, the remainders form their own group.
//
// WITHIN EACH GROUP:
//   Full round-robin. Win = 3 pts, Draw = 1 pt each, Loss = 0 pts.
//   Group winner = player with most points (tie-break: most wins).

const uid = () => Math.random().toString(36).slice(2, 8)

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

// Build round-robin matches for an array of players
function makeRoundRobin(players, groupId) {
  const matches = []
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push({
        id: uid(),
        groupId,
        p1: players[i],
        p2: players[j],
        winner: null,
      })
    }
  }
  return matches
}

function makeStandings(players) {
  return players.map(p => ({ ...p, played: 0, wins: 0, draws: 0, losses: 0, points: 0 }))
}

/**
 * Compute the winner(s) of a group from its standings.
 * Returns the player object with the most points (ties broken by wins).
 * Returns null if no match has been played yet.
 */
export function getGroupWinner(group) {
  const played = group.standings.filter(s => s.played > 0)
  if (played.length === 0) return null
  const allDone = group.matches.every(m => m.winner !== null)
  if (!allDone) return null
  const sorted = [...group.standings].sort((a, b) => b.points - a.points || b.wins - a.wins)
  return sorted[0]
}

/**
 * generateGroups(players, groupSize)
 *  players   : [{ id, name, tag }]  — tag must be 'A' | 'B' | 'C'
 *  groupSize : number  — target players per group (≥ 2)
 *
 * Redistribution of remainders:
 *   A leftover → merged into last B group (or own group if no B groups)
 *   B leftover → merged into last C group (or own group if no C groups)
 *   C leftover → merged into last C group
 *
 * Returns: [{ id, tag, name, mixed, players, matches, standings }]
 */
export function generateGroups(players, groupSize) {
  // 1. Bucket & shuffle by tag
  const byTag = { A: [], B: [], C: [] }
  players.forEach(p => {
    const t = (p.tag || 'B').toUpperCase()
    if (!byTag[t]) byTag[t] = []
    byTag[t].push(p)
  })

  // 2. Build initial groups per tag, collect remainders
  const groupsByTag = { A: [], B: [], C: [] }
  const remainders  = { A: [], B: [], C: [] }

  ;['A', 'B', 'C'].forEach(tag => {
    const shuffled = shuffle(byTag[tag] || [])
    const fullGroups = Math.floor(shuffled.length / groupSize)
    for (let i = 0; i < fullGroups; i++) {
      groupsByTag[tag].push(shuffled.slice(i * groupSize, (i + 1) * groupSize))
    }
    const rem = shuffled.length % groupSize
    if (rem > 0) remainders[tag] = shuffled.slice(fullGroups * groupSize)
  })

  // 3. Redistribute remainders
  //    A → last B group (append) or new mixed group
  if (remainders.A.length > 0) {
    if (groupsByTag.B.length > 0) {
      groupsByTag.B[groupsByTag.B.length - 1] =
        [...groupsByTag.B[groupsByTag.B.length - 1], ...remainders.A]
    } else if (groupsByTag.A.length > 0) {
      // No B groups exist – append to last A group
      groupsByTag.A[groupsByTag.A.length - 1] =
        [...groupsByTag.A[groupsByTag.A.length - 1], ...remainders.A]
    } else {
      // A-only draw with no full groups – one single group
      groupsByTag.A.push(remainders.A)
    }
  }

  //    B → last C group (append) or new mixed group
  if (remainders.B.length > 0) {
    if (groupsByTag.C.length > 0) {
      groupsByTag.C[groupsByTag.C.length - 1] =
        [...groupsByTag.C[groupsByTag.C.length - 1], ...remainders.B]
    } else if (groupsByTag.B.length > 0) {
      groupsByTag.B[groupsByTag.B.length - 1] =
        [...groupsByTag.B[groupsByTag.B.length - 1], ...remainders.B]
    } else {
      groupsByTag.B.push(remainders.B)
    }
  }

  //    C → last C group (or standalone)
  if (remainders.C.length > 0) {
    if (groupsByTag.C.length > 0) {
      groupsByTag.C[groupsByTag.C.length - 1] =
        [...groupsByTag.C[groupsByTag.C.length - 1], ...remainders.C]
    } else {
      groupsByTag.C.push(remainders.C)
    }
  }

  // 4. Flatten into final group objects
  const groups = []
  let groupNum = 1

  ;['A', 'B', 'C'].forEach(tag => {
    groupsByTag[tag].forEach((playerSlice, idx) => {
      if (playerSlice.length === 0) return
      const id = `G${groupNum}`
      // Check if this group is mixed (contains players from other tags)
      const tags = [...new Set(playerSlice.map(p => (p.tag || 'B').toUpperCase()))]
      const mixed = tags.length > 1
      const displayTag = tag
      const nameLabel = mixed
        ? `Group ${id} (${TAG_META[tag].label} +mixed)`
        : `Group ${id} (${TAG_META[tag].label})`

      groups.push({
        id,
        tag: displayTag,
        name: nameLabel,
        mixed,
        players: playerSlice,
        matches: makeRoundRobin(playerSlice, id),
        standings: makeStandings(playerSlice),
      })
      groupNum++
    })
  })

  return groups
}

// Record a match result and update standings
export function recordGroupResult(groups, groupId, matchId, winner) {
  return groups.map(g => {
    if (g.id !== groupId) return g
    const matches = g.matches.map(m => m.id !== matchId ? m : { ...m, winner })

    // Recompute standings from scratch
    const standings = g.players.map(p => ({ ...p, played: 0, wins: 0, draws: 0, losses: 0, points: 0 }))
    matches.forEach(m => {
      if (!m.winner) return
      const p1s = standings.find(s => s.id === m.p1.id)
      const p2s = standings.find(s => s.id === m.p2.id)
      if (!p1s || !p2s) return
      if (m.winner === 'draw') {
        p1s.draws++; p1s.points++; p1s.played++
        p2s.draws++; p2s.points++; p2s.played++
      } else if (m.winner.id === m.p1.id) {
        p1s.wins++; p1s.points += 3; p1s.played++
        p2s.losses++; p2s.played++
      } else {
        p2s.wins++; p2s.points += 3; p2s.played++
        p1s.losses++; p1s.played++
      }
    })
    standings.sort((a, b) => b.points - a.points || b.wins - a.wins)

    return { ...g, matches, standings }
  })
}
