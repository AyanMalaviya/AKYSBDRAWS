// ── Group Draw Engine ──
// Players are tagged A (strong), B (average), C (weak).
//
// GROUPING RULES:
//   1. Shuffle players within each tag randomly.
//   2. Slice into full groups of `groupSize` per tag.
//   3. Remainders (< groupSize players left over after all groups formed) are redistributed:
//
//      PRIORITY ORDER per remainder tag:
//        1st → append to last group of the SAME tag  (if any same-tag groups exist)
//        2nd → append to last group of the NEXT tier  (A→B, B→C, C→C)
//        3rd → form their own standalone group
//
//      Example: 3A + 3B + 3C + 1 extra B  → 1B remainder goes to last B group (same-tag rule)
//      Example: 1B remainder, no B groups, C groups exist → goes to last C group
//      Example: 1B remainder, no B/C groups → own standalone group
//
// WITHIN EACH GROUP:
//   Full round-robin. Win = 3 pts, Draw = 1 pt each, Loss = 0 pts.
//   Group winner = most points (tie-break: most wins).

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
 * Compute the winner of a group from its standings.
 * Returns null if matches are still in progress or none played.
 */
export function getGroupWinner(group) {
  const played = group.standings.filter(s => s.played > 0)
  if (played.length === 0) return null
  const allDone = group.matches.every(m => m.winner !== null)
  if (!allDone) return null
  const sorted = [...group.standings].sort((a, b) => b.points - a.points || b.wins - a.wins)
  return sorted[0]
}

// Append remainder players to the last group in a given tag bucket.
// Returns true if successful, false if that bucket is empty.
function appendToLastGroup(groupsByTag, tag, players) {
  const arr = groupsByTag[tag]
  if (!arr || arr.length === 0) return false
  arr[arr.length - 1] = [...arr[arr.length - 1], ...players]
  return true
}

/**
 * generateGroups(players, groupSize)
 *  players   : [{ id, name, tag }]  — tag must be 'A' | 'B' | 'C'
 *  groupSize : number  — target players per group (≥ 2)
 *
 * Remainder redistribution (applied AFTER all tags are fully sliced):
 *   For each tag T with remainders:
 *     1. Same-tag groups exist?  → append to last group of T
 *     2. Next-tier groups exist? → append to last group of next tier (A→B, B→C, C→C)
 *     3. Neither?                → push as own standalone group under T
 *
 * Returns: [{ id, tag, name, mixed, players, matches, standings }]
 */
export function generateGroups(players, groupSize) {
  // 1. Bucket & shuffle by tag
  const byTag = { A: [], B: [], C: [] }
  players.forEach(p => {
    const t = (p.tag || 'B').toUpperCase()
    byTag[t] = byTag[t] || []
    byTag[t].push(p)
  })

  // 2. Build full groups per tag, collect remainders
  const groupsByTag = { A: [], B: [], C: [] }
  const remainders  = { A: [], B: [], C: [] }

  ;['A', 'B', 'C'].forEach(tag => {
    const shuffled   = shuffle(byTag[tag] || [])
    const fullGroups = Math.floor(shuffled.length / groupSize)
    for (let i = 0; i < fullGroups; i++) {
      groupsByTag[tag].push(shuffled.slice(i * groupSize, (i + 1) * groupSize))
    }
    const rem = shuffled.length % groupSize
    if (rem > 0) remainders[tag] = shuffled.slice(fullGroups * groupSize)
  })

  // 3. Redistribute remainders — ALL tags fully sliced first, THEN redistribute.
  //    This guarantees the same-tag check reflects reality (e.g. 3B+1B gives a B group).

  // A remainders: A same-tag → B next-tier → standalone A
  if (remainders.A.length > 0) {
    if (!appendToLastGroup(groupsByTag, 'A', remainders.A))
      if (!appendToLastGroup(groupsByTag, 'B', remainders.A))
        groupsByTag.A.push(remainders.A)
  }

  // B remainders: B same-tag → C next-tier → standalone B
  if (remainders.B.length > 0) {
    if (!appendToLastGroup(groupsByTag, 'B', remainders.B))
      if (!appendToLastGroup(groupsByTag, 'C', remainders.B))
        groupsByTag.B.push(remainders.B)
  }

  // C remainders: C same-tag → standalone C (no further tier)
  if (remainders.C.length > 0) {
    if (!appendToLastGroup(groupsByTag, 'C', remainders.C))
      groupsByTag.C.push(remainders.C)
  }

  // 4. Flatten into final group objects
  const groups = []
  let groupNum = 1

  ;['A', 'B', 'C'].forEach(tag => {
    groupsByTag[tag].forEach(playerSlice => {
      if (playerSlice.length === 0) return
      const id = `G${groupNum}`
      const tags  = [...new Set(playerSlice.map(p => (p.tag || 'B').toUpperCase()))]
      const mixed = tags.length > 1
      const nameLabel = mixed
        ? `Group ${id} (${TAG_META[tag].label} +mixed)`
        : `Group ${id} (${TAG_META[tag].label})`

      groups.push({
        id,
        tag,
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

// Record a match result and recompute standings from scratch
export function recordGroupResult(groups, groupId, matchId, winner) {
  return groups.map(g => {
    if (g.id !== groupId) return g
    const matches = g.matches.map(m => m.id !== matchId ? m : { ...m, winner })

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
