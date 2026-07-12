import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FORMATS } from '../engine/bracketEngine.js'
import { TAG_META } from '../engine/groupEngine.js'

const PRESETS = [4, 8, 16, 32]
const TAGS = ['A', 'B', 'C']

const MODE_BRACKET = 'bracket'
const MODE_GROUP   = 'group'

export default function Setup({ onStart, onGroupStart }) {
  const [mode, setMode]      = useState(MODE_BRACKET)

  // Bracket state
  const [format, setFormat]  = useState('single_elim')
  const [count, setCountVal] = useState(8)
  const [custom, setCustom]  = useState('')
  const [names, setNames]    = useState(
    Array.from({ length: 8 }, (_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}` }))
  )

  // Group state
  const [groupCount, setGroupCount] = useState(8)
  const [groupCustom, setGroupCustom] = useState('')
  const [groupSize, setGroupSize]   = useState(4)
  const [groupPlayers, setGroupPlayers] = useState(
    Array.from({ length: 8 }, (_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}`, tag: 'B' }))
  )

  // ── Bracket helpers ──
  const applyCount = (n) => {
    setCountVal(n); setCustom('')
    setNames(Array.from({ length: n }, (_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}` })))
  }
  const onCustom = (val) => {
    setCustom(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 2 && n <= 64) applyCount(n)
  }
  const updateName = (i, v) =>
    setNames(p => p.map((x, idx) => idx === i ? { ...x, name: v || `Player ${i+1}` } : x))

  // ── Group helpers ──
  const applyGroupCount = (n) => {
    setGroupCount(n); setGroupCustom('')
    setGroupPlayers(Array.from({ length: n }, (_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}`, tag: 'B' })))
  }
  const onGroupCustom = (val) => {
    setGroupCustom(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 2 && n <= 64) applyGroupCount(n)
  }
  const updateGroupName = (i, v) =>
    setGroupPlayers(p => p.map((x, idx) => idx === i ? { ...x, name: v || `Player ${i+1}` } : x))
  const updateGroupTag = (i, tag) =>
    setGroupPlayers(p => p.map((x, idx) => idx === i ? { ...x, tag } : x))

  const fmt = FORMATS.find(f => f.id === format)

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
            className={`mode-btn${mode === MODE_BRACKET ? ' active' : ''}`}
            onClick={() => setMode(MODE_BRACKET)}
          >🏆 Bracket Draw</button>
          <button
            className={`mode-btn${mode === MODE_GROUP ? ' active' : ''}`}
            onClick={() => setMode(MODE_GROUP)}
          >🎯 Group Draw</button>
        </motion.div>

        {/* ═══ BRACKET MODE ═══ */}
        {mode === MODE_BRACKET && (
          <>
            <motion.div className="glass" style={{ padding: 20, marginBottom: 14 }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="step-label">
                <div className="step-num">1</div>
                <div className="step-title">Choose Format</div>
              </div>
              <div className="formats-grid">
                {FORMATS.map(f => (
                  <div key={f.id} className={`format-tile${format === f.id ? ' sel' : ''}`}
                    onClick={() => setFormat(f.id)}>
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
                  <button key={n} className={`count-btn${count === n && !custom ? ' sel' : ''}`}
                    onClick={() => applyCount(n)}>{n}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="number" min="2" max="64" placeholder="Custom (2–64)"
                  value={custom} onChange={e => onCustom(e.target.value)} style={{ maxWidth: 160 }} />
                <span style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>{names.length} players</span>
              </div>
            </motion.div>

            {names.length > 0 && (
              <motion.div className="glass" style={{ padding: 20, marginBottom: 18 }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
                <div className="step-label">
                  <div className="step-num">3</div>
                  <div className="step-title">Player Names <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>(optional)</span></div>
                </div>
                <div className="names-grid">
                  {names.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--muted)', fontSize: 11, minWidth: 22 }}>#{i+1}</span>
                      <input value={p.name} onChange={e => updateName(i, e.target.value)} placeholder={`Player ${i+1}`} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {names.length >= 2 && (
              <motion.div style={{ textAlign: 'center', paddingBottom: 32 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.34 }}>
                <button className="gen-btn" onClick={() => onStart({ format, players: names })}>
                  Generate Bracket →
                </button>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
                  {fmt?.label} · {names.length} players
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* ═══ GROUP MODE ═══ */}
        {mode === MODE_GROUP && (
          <>
            {/* Step 1: Players */}
            <motion.div className="glass" style={{ padding: 20, marginBottom: 14 }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="step-label">
                <div className="step-num">1</div>
                <div className="step-title">Number of Players</div>
              </div>
              <div className="count-presets">
                {PRESETS.map(n => (
                  <button key={n} className={`count-btn${groupCount === n && !groupCustom ? ' sel' : ''}`}
                    onClick={() => applyGroupCount(n)}>{n}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="number" min="2" max="64" placeholder="Custom (2–64)"
                  value={groupCustom} onChange={e => onGroupCustom(e.target.value)} style={{ maxWidth: 160 }} />
                <span style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>{groupPlayers.length} players</span>
              </div>
            </motion.div>

            {/* Step 2: Group size */}
            <motion.div className="glass" style={{ padding: 20, marginBottom: 14 }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              <div className="step-label">
                <div className="step-num">2</div>
                <div className="step-title">Players per Group</div>
              </div>
              <div className="count-presets">
                {[2, 3, 4, 5, 6].map(n => (
                  <button key={n} className={`count-btn${groupSize === n ? ' sel' : ''}`}
                    onClick={() => setGroupSize(n)}>{n}</button>
                ))}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
                Each group plays a full round-robin among same-tier players
              </div>
            </motion.div>

            {/* Step 3: Players + tags */}
            {groupPlayers.length > 0 && (
              <motion.div className="glass" style={{ padding: 20, marginBottom: 18 }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                <div className="step-label">
                  <div className="step-num">3</div>
                  <div className="step-title">Players & Skill Tags</div>
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
                  {groupPlayers.map((p, i) => (
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

            {groupPlayers.length >= 2 && (
              <motion.div style={{ textAlign: 'center', paddingBottom: 32 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <button className="gen-btn"
                  onClick={() => onGroupStart({ players: groupPlayers, groupSize })}>
                  Generate Groups →
                </button>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
                  {groupPlayers.length} players · {groupSize} per group · tag-matched
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </>
  )
}
