import React, { Suspense, lazy, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FORMATS } from '../engine/bracketEngine.js'
import Scoreboard from './Scoreboard.jsx'

const SingleElimBracket = lazy(() => import('./brackets/SingleElimBracket.jsx'))
const DoubleElimBracket = lazy(() => import('./brackets/DoubleElimBracket.jsx'))
const RoundRobinBracket = lazy(() => import('./brackets/RoundRobinBracket.jsx'))
const SwissBracket      = lazy(() => import('./brackets/SwissBracket.jsx'))

/**
 * Converts any bracket type into the `groups` shape that Scoreboard.jsx expects.
 * Each "group" in the output represents a logical pool/lane of players.
 * standings entries must have: id, name, tag, played, wins, draws, losses,
 * points, scoredFor, scoredAgainst, scoreDiff.
 */
function bracketToGroups(bracket, format) {
  if (!bracket) return []

  // ── Round Robin & Swiss: standings already exist ──────────────────
  if (format === 'round_robin' || format === 'swiss') {
    const standings = (bracket.standings || []).map(s => ({
      ...s,
      played:        s.played        ?? 0,
      wins:          s.wins          ?? 0,
      draws:         s.draws         ?? 0,
      losses:        s.losses        ?? 0,
      points:        s.points        ?? 0,
      scoredFor:     s.scoredFor     ?? 0,
      scoredAgainst: s.scoredAgainst ?? 0,
      scoreDiff:     s.scoreDiff     ?? 0,
    }))
    const matches = (bracket.rounds || []).flat()
    return [{ id: 'main', name: format === 'swiss' ? 'Swiss Standings' : 'Round Robin', players: standings, matches, standings }]
  }

  // ── Double Elimination: two lanes ─────────────────────────────────
  if (format === 'double_elim') {
    const playerMap = {}
    const ensurePlayer = (p) => {
      if (!p || p.id === 'bye') return
      if (!playerMap[p.id]) playerMap[p.id] = {
        id: p.id, name: p.name, tag: p.tag || null,
        played: 0, wins: 0, draws: 0, losses: 0, points: 0,
        scoredFor: 0, scoredAgainst: 0, scoreDiff: 0,
        lane: 'winners',
      }
    }
    const processMatch = (match, isLosersBracket) => {
      ensurePlayer(match.p1)
      ensurePlayer(match.p2)
      if (!match.winner || match.isBye) return
      const winner = match.winner
      const loser  = match.p1?.id === winner?.id ? match.p2 : match.p1
      if (winner && playerMap[winner.id]) {
        playerMap[winner.id].wins++
        playerMap[winner.id].points += 3
        playerMap[winner.id].played++
        if (match.score1 != null) { playerMap[winner.id].scoredFor += winner.id === match.p1?.id ? match.score1 : match.score2; playerMap[winner.id].scoredAgainst += winner.id === match.p1?.id ? match.score2 : match.score1 }
      }
      if (loser && loser.id !== 'bye' && playerMap[loser.id]) {
        playerMap[loser.id].losses++
        playerMap[loser.id].played++
        playerMap[loser.id].lane = isLosersBracket ? 'losers' : playerMap[loser.id].lane
        if (match.score1 != null) { playerMap[loser.id].scoredFor += loser.id === match.p1?.id ? match.score1 : match.score2; playerMap[loser.id].scoredAgainst += loser.id === match.p1?.id ? match.score2 : match.score1 }
      }
    }
    ;(bracket.wRounds || []).flat().forEach(m => processMatch(m, false))
    ;(bracket.lRounds || []).flat().forEach(m => processMatch(m, true))
    if (bracket.grandFinal) processMatch(bracket.grandFinal, false)

    const allPlayers = Object.values(playerMap)
    allPlayers.forEach(p => { p.scoreDiff = p.scoredFor - p.scoredAgainst })
    allPlayers.sort((a, b) => (b.points - a.points) || (b.wins - a.wins))

    const allMatches = [
      ...(bracket.wRounds || []).flat(),
      ...(bracket.lRounds || []).flat(),
      ...(bracket.grandFinal ? [bracket.grandFinal] : []),
    ]
    return [{
      id: 'de_main',
      name: 'Overall Standings',
      players: allPlayers,
      matches: allMatches,
      standings: allPlayers,
    }]
  }

  // ── Single Elim / Stage2 Elim: one overall pool ───────────────────
  const playerMap = {}
  const ensurePlayer = (p) => {
    if (!p || p.id === 'bye') return
    if (!playerMap[p.id]) playerMap[p.id] = {
      id: p.id, name: p.name, tag: p.tag || null,
      played: 0, wins: 0, draws: 0, losses: 0, points: 0,
      scoredFor: 0, scoredAgainst: 0, scoreDiff: 0,
    }
  }

  const allMatches = (bracket.rounds || []).flat()

  allMatches.forEach(match => {
    ensurePlayer(match.p1)
    ensurePlayer(match.p2)
    if (!match.winner) return

    // bye wins: don't award points so standings stay meaningful
    if (match.isBye) return

    const winner = match.winner
    const loser  = match.p1?.id === winner?.id ? match.p2 : match.p1

    if (winner && playerMap[winner.id]) {
      playerMap[winner.id].wins++
      playerMap[winner.id].points += 3
      playerMap[winner.id].played++
      if (match.score1 != null) {
        playerMap[winner.id].scoredFor     += winner.id === match.p1?.id ? match.score1 : match.score2
        playerMap[winner.id].scoredAgainst += winner.id === match.p1?.id ? match.score2 : match.score1
      }
    }
    if (loser && loser.id !== 'bye' && playerMap[loser.id]) {
      playerMap[loser.id].losses++
      playerMap[loser.id].played++
      if (match.score1 != null) {
        playerMap[loser.id].scoredFor     += loser.id === match.p1?.id ? match.score1 : match.score2
        playerMap[loser.id].scoredAgainst += loser.id === match.p1?.id ? match.score2 : match.score1
      }
    }
  })

  const standings = Object.values(playerMap)
  standings.forEach(p => { p.scoreDiff = p.scoredFor - p.scoredAgainst })
  standings.sort((a, b) =>
    (b.points    - a.points)    ||
    (b.wins      - a.wins)      ||
    (b.scoreDiff - a.scoreDiff) ||
    (b.scoredFor - a.scoredFor) ||
    a.name.localeCompare(b.name)
  )

  return [{ id: 'elim_main', name: 'Standings', players: standings, matches: allMatches, standings }]
}

export default function BracketView({ tournament, onUpdate }) {
  const { format, bracket } = tournament
  const fmt = FORMATS.find(f => f.id === format) || { label: 'Stage 2 & Stage 3', tag: 'S2', color: 'tag-blue' }

  const scoreboardGroups = useMemo(() => bracketToGroups(bracket, format), [bracket, format])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className={`tag ${fmt?.color}`}>{fmt?.tag}</span>
        <span style={{ fontWeight: 800, fontSize: 16 }}>{fmt?.label}</span>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>• {tournament.players.length} players</span>

        {bracket.champion && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{
              marginLeft: 'auto', background: 'rgba(255,180,0,0.15)', color: '#fbbf24',
              padding: '5px 16px', borderRadius: 99, fontSize: 13, fontWeight: 800,
              border: '1px solid rgba(255,180,0,0.35)',
              boxShadow: '0 0 16px rgba(255,180,0,0.2)'
            }}>
              🏆 {bracket.champion.name}
          </motion.span>
        )}
      </div>

      {/* Scoreboard — same component as GroupView, fed with derived bracket standings */}
      {scoreboardGroups.length > 0 && (
        <Scoreboard groups={scoreboardGroups} />
      )}

      <div className="landscape-hint">🔄 Rotate to landscape for best bracket view</div>

      <Suspense fallback={<div style={{ textAlign: 'center', padding: 20 }}>Loading Bracket...</div>}>
        {format === 'single_elim' && <SingleElimBracket bracket={bracket} onUpdate={onUpdate} />}
        {format === 'stage2_elim' && <SingleElimBracket bracket={bracket} onUpdate={onUpdate} />}
        {format === 'double_elim' && <DoubleElimBracket bracket={bracket} onUpdate={onUpdate} />}
        {format === 'round_robin' && <RoundRobinBracket bracket={bracket} onUpdate={onUpdate} />}
        {format === 'swiss'       && <SwissBracket bracket={bracket} onUpdate={onUpdate} players={tournament.players} />}
      </Suspense>
    </motion.div>
  )
}
