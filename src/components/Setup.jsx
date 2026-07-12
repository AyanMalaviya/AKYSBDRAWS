import React, { useState } from 'react'
import { FORMATS } from '../engine/bracketEngine.js'

const PRESETS = [4, 8, 16, 32]

export default function Setup({ onStart }) {
  const [format, setFormat]   = useState('single_elim')
  const [playerCount, setPC]  = useState(8)
  const [custom, setCustom]   = useState('')
  const [names, setNames]     = useState(
    Array.from({ length: 8 }, (_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}` }))
  )

  const setCount = (n) => {
    setPC(n); setCustom('')
    setNames(Array.from({ length: n }, (_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}` })))
  }
  const setCustomCount = (val) => {
    setCustom(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 2 && n <= 64)
      setNames(Array.from({ length: n }, (_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}` })))
  }
  const updateName = (i, v) =>
    setNames(prev => prev.map((p, idx) => idx === i ? { ...p, name: v || `Player ${i+1}` } : p))

  const fmt = FORMATS.find(f => f.id === format)

  return (
    <div className="setup-wrap">

      {/* Step 1 — Format */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div className="step-circle">1</div>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Choose Format</h2>
        </div>
        <div className="setup-formats-grid">
          {FORMATS.map(f => (
            <div key={f.id}
              className={`format-card${format === f.id ? ' selected' : ''}`}
              onClick={() => setFormat(f.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <span className={`tag ${f.color}`}>{f.tag}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{f.label}</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 11, lineHeight: 1.4 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2 — Count */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div className="step-circle">2</div>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Number of Players</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {PRESETS.map(n => (
            <button key={n}
              className={`btn${playerCount === n && !custom ? '' : ' btn-ghost'}`}
              onClick={() => setCount(n)}
              style={{ minWidth: 56 }}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="number" min="2" max="64" placeholder="Custom (2–64)"
            value={custom} onChange={e => setCustomCount(e.target.value)}
            style={{ maxWidth: 160 }} />
          <span style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
            {names.length} players
          </span>
        </div>
      </div>

      {/* Step 3 — Names */}
      {names.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div className="step-circle">3</div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Player Names</h2>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>(optional)</span>
          </div>
          <div className="names-grid">
            {names.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--muted)', fontSize: 12, minWidth: 22 }}>#{i+1}</span>
                <input value={p.name}
                  onChange={e => updateName(i, e.target.value)}
                  placeholder={`Player ${i+1}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate */}
      {names.length >= 2 && (
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <button className="btn" style={{ padding: '11px 40px', fontSize: 15 }}
            onClick={() => onStart({ format, players: names })}>
            Generate Bracket →
          </button>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
            {fmt?.label} · {names.length} players
          </p>
        </div>
      )}
    </div>
  )
}
