import React from 'react'
import { motion } from 'framer-motion'
import { FORMATS } from '../engine/bracketEngine.js'
import { TAG_META } from '../engine/groupEngine.js'
import { useSetupStorage } from '../hooks/useSetupStorage.js'

const PRESETS = [4, 8, 16, 32]
const TAGS    = ['A', 'B', 'C']

const MODE_BRACKET = 'bracket'
const MODE_GROUP   = 'group'

const DEFAULT_COUNT = 8

const makePlayer  = (i)      => ({ id: `p${i+1}`, name: '', tag: 'B' })
const makePlayers = (n, old) =>
  Array.from({ length: n }, (_, i) => old?.[i] ?? makePlayer(i))

const defaults = {
  mode:         MODE_BRACKET,
  // bracket
  format:       'single_elim',
  count:        DEFAULT_COUNT,
  custom:       '',
  names:        makePlayers(DEFAULT_COUNT),
  // group
  groupCount:   DEFAULT_COUNT,
  groupCustom:  '',
  groupSize:    4,
  groupPlayers: makePlayers(DEFAULT_COUNT),
}

export default function Setup({ onStart, onGroupStart }) {
  const [s, set, clearAll] = useSetupStorage(defaults)

  // ── Bracket helpers ──
  const applyCount = (n) => {
    set('count', n)
    set('custom', String(n))
    set('names', makePlayers(n, s.names))
  }
  const onCustomBracket = (val) => {
    set('custom', val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 2 && n <= 64) {
      set('count', n)
      set('names', makePlayers(n, s.names))
    }
  }
  const updateName = (i, v) =>
    set('names', prev => prev.map((x, idx) => idx === i ? { ...x, name: v } : x))

  const clearNames = () =>
    set('names', s.names.map(p => ({ ...p, name: '' })))

  // ── Group helpers ──
  const applyGroupCount = (n) => {
    set('groupCount', n)
    set('groupCustom', String(n))
    set('groupPlayers', makePlayers(n, s.groupPlayers))
  }
  const onGroupCustom = (val) => {
    set('groupCustom', val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 2 && n <= 64) {
      set('groupCount', n)
      set('groupPlayers', makePlayers(n, s.groupPlayers))
    }
  }
  const updateGroupName = (i, v) =>
    set('groupPlayers', prev => prev.map((x, idx) => idx === i ? { ...x, name: v } : x))
  const updateGroupTag  = (i, tag) =>
    set('groupPlayers', prev => prev.map((x, idx) => idx === i ? { ...x, tag } : x))

  const clearGroupNames = () =>
    set('groupPlayers', s.groupPlayers.map(p => ({ ...p, name: '' })))

  const fmt = FORMATS.find(f => f.id === s.format)

  // Resolve display names (fall back to 'Player N' placeholder on submit only)
  const resolvedNames       = s.names.map((p, i)       => ({ ...p, name: p.name || `Player ${i+1}` }))
  const resolvedGroupPlayers = s.groupPlayers.map((p, i) => ({ ...p, name: p.name || `Player ${i+1}` }))

  return (
    <>
      <div className="neon-bg">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      </div>

      <div className="setup-root">
        {/* Hero */}
        <motion.div className="setup-hero"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="setup-hero-title">AKYSB DRAWS</div>
          <div className="setup-hero-sub">Build your tournament bracket — offline, instant, zero setup</div>
        </motion.div>

        {/* Mode toggle */}
        <motion.div className="glass mode-toggle-bar"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <button
            className={`mode-btn${s.mode === MODE_BRACKET ? ' active' : ''}`}
            onClick={() => set('mode', MODE_BRACKET)}
          >🏆 Bracket Draw</button>
          <button
            className={`mode-btn${s.mode === MODE_GROUP ? ' active' : ''}`}
            onClick={() => set('mode', MODE_GROUP)}
          >🎯 Group Draw</button>
        </motion.div>

        {/* ═══ BRACKET MODE ═══ */}
        {s.mode === MODE_BRACKET && (
          <>
            <motion.div className="glass" style={{ padding: 20, marginBottom: 14 }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="step-label">
                <div className="step-num">1</div>
                <div className="step-title">Choose Format</div>
              </div>
              <div className="formats-grid">
                {FORMATS.map(f => (
                  <div key={f.id} className={`format-tile${s.format === f.id ? ' sel' : ''}`}
                    onClick={() => set('format', f.id)}>
                    <span className={`tag ${f.color}`}>{f.tag}</span>
                    <div className="format-tile-name">{f.label}</div>
                    <div className="format-tile-desc">{f.desc}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div className="glass" style={{ padding: 20, marginBottom: 14 }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
              <div className="step-label">
                <div className="step-num">2</div>
                <div className="step-title">Number of Players</div>
              </div>
              <div className="count-presets">
                {PRESETS.map(n => (
                  <button key={n} className={`count-btn${s.count === n ? ' sel' : ''}`}
                    onClick={() => applyCount(n)}>{n}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="number" min="2" max="64" placeholder="Custom (2–64)"
                  value={s.custom}
                  onChange={e => onCustomBracket(e.target.value)}
                  style={{ maxWidth: 160 }}
                />
                <span style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {s.names.length} players
                </span>
              </div>
            </motion.div>

            {s.names.length > 0 && (
              <motion.div className="glass" style={{ padding: 20, marginBottom: 18 }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
                <div className="step-label">
                  <div className="step-num">3</div>
                  <div className="step-title">
                    Player Names
                    <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>(optional)</span>
                  </div>
                  <button className="clear-names-btn" onClick={clearNames} title="Clear all names">✕ Clear All</button>
                </div>
                <div className="names-grid">
                  {s.names.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--muted)', fontSize: 11, minWidth: 22 }}>#{i+1}</span>
                      <input
                        value={p.name}
                        onChange={e => updateName(i, e.target.value)}
                        placeholder={`Player ${i+1}`}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {s.names.length >= 2 && (
              <motion.div style={{ textAlign: 'center', paddingBottom: 32 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.34 }}>
                <button className="gen-btn" onClick={() => onStart({ format: s.format, players: resolvedNames })}>
                  Generate Bracket →
                </button>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
                  {fmt?.label} · {s.names.length} players
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* ═══ GROUP MODE ═══ */}
        {s.mode === MODE_GROUP && (
          <>
            <motion.div className="glass" style={{ padding: 20, marginBottom: 14 }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="step-label">
                <div className="step-num">1</div>
                <div className="step-title">Number of Players</div>
              </div>
              <div className="count-presets">
                {PRESETS.map(n => (
                  <button key={n} className={`count-btn${s.groupCount === n ? ' sel' : ''}`}
                    onClick={() => applyGroupCount(n)}>{n}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="number" min="2" max="64" placeholder="Custom (2–64)"
                  value={s.groupCustom}
                  onChange={e => onGroupCustom(e.target.value)}
                  style={{ maxWidth: 160 }}
                />
                <span style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {s.groupPlayers.length} players
                </span>
              </div>
            </motion.div>

            <motion.div className="glass" style={{ padding: 20, marginBottom: 14 }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              <div className="step-label">
                <div className="step-num">2</div>
                <div className="step-title">Players per Group</div>
              </div>
              <div className="count-presets">
                {[2, 3, 4, 5, 6].map(n => (
                  <button key={n} className={`count-btn${s.groupSize === n ? ' sel' : ''}`}
                    onClick={() => set('groupSize', n)}>{n}</button>
                ))}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
                Each group plays a full round-robin among same-tier players
              </div>
            </motion.div>

            {s.groupPlayers.length > 0 && (
              <motion.div className="glass" style={{ padding: 20, marginBottom: 18 }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                <div className="step-label">
                  <div className="step-num">3</div>
                  <div className="step-title">Players &amp; Skill Tags</div>
                  <button className="clear-names-btn" onClick={clearGroupNames} title="Clear all names">✕ Clear All</button>
                </div>
                <div className="tag-legend">
                  {TAGS.map(t => (
                    <span key={t} className="tag-legend-item">
                      <span className="tl-badge" style={{ background: TAG_META[t].color }}>{t}</span>
                      <span className="tl-label">{TAG_META[t].label}</span>
                    </span>
                  ))}
                </div>
                <div className="names-grid">
                  {s.groupPlayers.map((p, i) => (
                    <div key={p.id} className="gp-row">
                      <span style={{ color: 'var(--muted)', fontSize: 11, minWidth: 22 }}>#{i+1}</span>
                      <input
                        value={p.name}
                        onChange={e => updateGroupName(i, e.target.value)}
                        placeholder={`Player ${i+1}`}
                        style={{ flex: 1 }}
                      />
                      <div className="tag-selector">
                        {TAGS.map(t => (
                          <button
                            key={t}
                            className={`tag-btn${p.tag === t ? ' active' : ''}`}
                            style={p.tag === t ? { background: TAG_META[t].color, color: '#000', boxShadow: `0 0 8px ${TAG_META[t].glow}` } : {}}
                            onClick={() => updateGroupTag(i, t)}
                          >{t}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {s.groupPlayers.length >= 2 && (
              <motion.div style={{ textAlign: 'center', paddingBottom: 32 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <button className="gen-btn"
                  onClick={() => onGroupStart({ players: resolvedGroupPlayers, groupSize: s.groupSize })}>
                  Generate Groups →
                </button>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
                  {s.groupPlayers.length} players · {s.groupSize} per group · tag-matched
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Reset everything */}
        <motion.div style={{ textAlign: 'center', paddingBottom: 16 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <button
            onClick={clearAll}
            style={{
              fontSize: 12, color: 'var(--muted)', background: 'none',
              border: '1px solid var(--border2)', borderRadius: 8,
              padding: '6px 14px', cursor: 'pointer'
            }}
          >🗑 Reset all setup data</button>
        </motion.div>
      </div>
    </>
  )
}
