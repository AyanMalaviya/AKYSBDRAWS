import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FORMATS } from '../engine/bracketEngine.js'

const PRESETS = [4, 8, 16, 32]

export default function Setup({ onStart }) {
  const [format, setFormat]  = useState('single_elim')
  const [count, setCountVal] = useState(8)
  const [custom, setCustom]  = useState('')
  const [names, setNames]    = useState(
    Array.from({ length: 8 }, (_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}` }))
  )

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

  const fmt = FORMATS.find(f => f.id === format)

  return (
    <>
      {/* Animated neon orbs */}
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

        {/* Step 1 */}
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

        {/* Step 2 */}
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
              value={custom} onChange={e => onCustom(e.target.value)}
              style={{ maxWidth: 160 }} />
            <span style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
              {names.length} players
            </span>
          </div>
        </motion.div>

        {/* Step 3 */}
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
      </div>
    </>
  )
}
