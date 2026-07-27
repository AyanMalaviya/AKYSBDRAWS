import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TAG_META } from '../engine/groupEngine.js'

const tagColor = (tag) => TAG_META[tag || 'C']?.color || TAG_META['C'].color

const medalEmoji = ['🥇', '🥈', '🥉']

export default function Scoreboard({ groups }) {
  const [open, setOpen] = useState(false)

  const rows = useMemo(() => {
    const all = []
    groups.forEach(g => {
      g.standings.forEach(s => {
        all.push({ ...s, groupName: g.name })
      })
    })
    all.sort((a, b) =>
      (b.points    ?? 0) - (a.points    ?? 0) ||
      (b.wins      ?? 0) - (a.wins      ?? 0) ||
      (b.scoreDiff ?? 0) - (a.scoreDiff ?? 0) ||
      (b.scoredFor ?? 0) - (a.scoredFor ?? 0) ||
      (a.name ?? '').localeCompare(b.name ?? '')
    )
    return all
  }, [groups])

  const hasScores = rows.some(r => (r.scoredFor ?? 0) > 0 || (r.scoredAgainst ?? 0) > 0)
  const totalMatches = groups.reduce((s, g) => s + g.matches.length, 0)
  const doneMatches  = groups.reduce((s, g) => s + g.matches.filter(m => m.winner).length, 0)
  const pct = totalMatches ? Math.round((doneMatches / totalMatches) * 100) : 0

  return (
    <div style={{
      margin: '0 0 20px',
      background: 'rgba(16,14,31,0.85)',
      border: '1px solid rgba(212,160,23,0.25)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          background: 'none', border: 'none', padding: '13px 18px',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 20 }}>📊</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--gold-light)' }}>Overall Scoreboard</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {doneMatches}/{totalMatches} matches · {pct}% complete
          </div>
        </div>
        {/* Mini top-3 preview */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginRight: 8 }}>
          {rows.slice(0, 3).map((r, i) => (
            <div key={r.id} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>{medalEmoji[i]}</span>
              <span style={{ maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: tagColor(r.tag), fontWeight: 700 }}>{r.name}</span>
            </div>
          ))}
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 16, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>

      {/* Collapsible table */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 12px 14px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                    <th style={{ textAlign: 'left', padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Player</th>
                    <th style={{ padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Group</th>
                    <th style={{ padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>P</th>
                    <th style={{ padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>W</th>
                    <th style={{ padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>D</th>
                    <th style={{ padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>L</th>
                    <th style={{ padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Pts</th>
                    {hasScores && <th style={{ padding: '6px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }} title="Score Difference">SD</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr
                      key={r.id}
                      style={{
                        background: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <td style={{ padding: '7px 6px', color: idx < 3 ? 'var(--gold-light)' : 'var(--muted)', fontWeight: 800, textAlign: 'center' }}>
                        {medalEmoji[idx] ?? idx + 1}
                      </td>
                      <td style={{ padding: '7px 6px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, color: tagColor(r.tag), maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', verticalAlign: 'middle' }}>{r.name}</span>
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>{r.groupName}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', color: 'var(--muted)' }}>{r.played ?? 0}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', color: 'var(--green)' }}>{r.wins ?? 0}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', color: 'var(--gold-light)' }}>{r.draws ?? 0}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', color: '#e05b4e' }}>{r.losses ?? 0}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 900, color: idx < 3 ? 'var(--gold-light)' : 'var(--white-soft)' }}>{r.points ?? 0}</td>
                      {hasScores && (
                        <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, color: (r.scoreDiff ?? 0) > 0 ? 'var(--green)' : (r.scoreDiff ?? 0) < 0 ? '#e05b4e' : 'var(--muted)' }}>
                          {(r.scoreDiff ?? 0) > 0 ? '+' : ''}{r.scoreDiff ?? 0}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
