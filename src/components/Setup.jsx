import React, { useState } from 'react'
import { FORMATS } from '../engine/bracketEngine.js'

const PRESETS = [4, 8, 16, 32]

export default function Setup({ onStart }) {
  const [format, setFormat] = useState('single_elim')
  const [playerCount, setPlayerCount] = useState(8)
  const [custom, setCustom] = useState('')
  const [names, setNames] = useState(
    Array.from({ length: 8 }, (_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}` }))
  )

  const setCount = (n) => {
    setPlayerCount(n); setCustom('')
    setNames(Array.from({ length: n }, (_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}` })))
  }

  const setCustomCount = (val) => {
    setCustom(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 2 && n <= 64) setNames(Array.from({ length: n }, (_, i) => ({ id: `p${i+1}`, name: `Player ${i+1}` })))
  }

  const updateName = (i, v) => setNames(prev => prev.map((p, idx) => idx === i ? { ...p, name: v || `Player ${i+1}` } : p))

  const fmt = FORMATS.find(f => f.id === format)

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>

      {/* Step 1 — Format */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'var(--accent)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>1</div>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Choose Format</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {FORMATS.map(f => (
            <div key={f.id} onClick={() => setFormat(f.id)} style={{
              padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
              border: `2px solid ${format === f.id ? 'var(--accent)' : 'var(--border)'}`,
              background: format === f.id ? '#1e1b4b' : 'var(--surface2)', transition: 'all 0.15s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span className={`tag ${f.color}`}>{f.tag}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{f.label}</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 12 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2 — Count */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'var(--accent)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>2</div>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Number of Players</h2>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {PRESETS.map(n => (
            <button key={n} className={`btn ${playerCount === n && !custom ? '' : 'btn-ghost'}`} onClick={() => setCount(n)} style={{ minWidth: 60 }}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="number" min="2" max="64" placeholder="Custom (2–64)" value={custom} onChange={e => setCustomCount(e.target.value)} style={{ maxWidth: 160 }} />
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{names.length} players</span>
        </div>
      </div>

      {/* Step 3 — Names */}
      {names.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'var(--accent)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>3</div>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Enter Player Names</h2>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>(optional)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {names.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--muted)', fontSize: 12, minWidth: 24 }}>#{i+1}</span>
                <input value={p.name} onChange={e => updateName(i, e.target.value)} placeholder={`Player ${i+1}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {names.length >= 2 && (
        <div style={{ textAlign: 'center' }}>
          <button className="btn" style={{ padding: '12px 40px', fontSize: 16 }} onClick={() => onStart({ format, players: names })}>
            Generate Bracket →
          </button>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>{fmt?.label} • {names.length} players</p>
        </div>
      )}
    </div>
  )
}
