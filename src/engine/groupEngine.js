// ── Group Draw Engine ──
// Players are tagged A (strong), B (average), C (weak).
// Groups are formed so all players in a group share the same tag.
// Group size is configurable. Players within each tag are shuffled randomly
// then sliced into groups of the chosen size.
// Each group plays a full round-robin among themselves.

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

// standings for a group
function makeStandings(players) {
  return players.map(p => ({ ...p, played: 0, wins: 0, draws: 0, losses: 0, points: 0 }))
}

/**
 * generateGroups(players, groupSize)
 *  players:   [{ id, name, tag }]  — tag must be 'A' | 'B' | 'C'
 *  groupSize: number  — max players per group
 *
 * Returns:
 *  [
 *    { id, tag, name, players, matches, standings },
 *    ...
 *  ]
 */
export function generateGroups(players, groupSize) {
  const byTag = { A: [], B: [], C: [] }
  players.forEach(p => {
    const t = (p.tag || 'B').toUpperCase()
    byTag[t] = byTag[t] || []
    byTag[t].push(p)
  })

  const groups = []
  let groupNum = 1

  ;['A', 'B', 'C'].forEach(tag => {
    const tagPlayers = shuffle(byTag[tag] || [])
    if (tagPlayers.length === 0) return

    for (let i = 0; i < tagPlayers.length; i += groupSize) {
      const slice = tagPlayers.slice(i, i + groupSize)
      const id = `G${groupNum}`
      groups.push({
        id,
        tag,
        name: `Group ${id} (${TAG_META[tag].label})`,
        players: slice,
        matches: makeRoundRobin(slice, id),
        standings: makeStandings(slice),
      })
      groupNum++
    }
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
