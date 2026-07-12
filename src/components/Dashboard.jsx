import React, { useState } from 'react'
import { FORMATS } from '../engine/bracketEngine.js'

const fmt = (isoStr) => {
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
        <p style={{ textAlign: 'center', fontSize: 15, marginBottom: 20, color: 'var(--text)' }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ minWidth: 90 }}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} style={{ minWidth: 90 }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ history, onRestore, onDelete, onDeleteAll }) {
  const [confirmSingle, setConfirmSingle] = useState(null) // id to delete
  const [confirmAll, setConfirmAll] = useState(false)

  if (history.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No history yet</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Tournaments you play will be auto-saved here.</p>
      </div>
    )
  }

  const fmtDef = (id) => FORMATS.find(f => f.id === id)

  return (
    <div className="dashboard">
      {/* Header row */}
      <div className="dash-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Tournament History</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{history.length} saved tournament{history.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => setConfirmAll(true)}>
          🗑 Clear All
        </button>
      </div>

      {/* History grid */}
      <div className="history-grid">
        {history.map(entry => {
          const f = fmtDef(entry.format)
          return (
            <div key={entry.id} className="history-card">
              <div className="hcard-top">
                <span className={`tag ${f?.color}`}>{f?.tag}</span>
                <span className="hcard-format">{f?.label}</span>
                {entry.champion && (
                  <span className="hcard-champion">🏆 {entry.champion.name}</span>
                )}
              </div>
              <div className="hcard-meta">
                <span>👥 {entry.playerCount} players</span>
                <span>🕒 {fmt(entry.savedAt)}</span>
              </div>
              <div className="hcard-players">
                {entry.players.slice(0, 6).map(p => (
                  <span key={p.id} className="player-chip">{p.name}</span>
                ))}
                {entry.players.length > 6 && (
                  <span className="player-chip player-chip-more">+{entry.players.length - 6} more</span>
                )}
              </div>
              <div className="hcard-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => onRestore(entry)}>
                  ↩ Restore
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmSingle(entry.id)}>
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirm modals */}
      {confirmSingle && (
        <ConfirmModal
          message="Delete this tournament from history? This cannot be undone."
          onConfirm={() => { onDelete(confirmSingle); setConfirmSingle(null) }}
          onCancel={() => setConfirmSingle(null)}
        />
      )}
      {confirmAll && (
        <ConfirmModal
          message={`Delete all ${history.length} tournaments from history? This cannot be undone.`}
          onConfirm={() => { onDeleteAll(); setConfirmAll(false) }}
          onCancel={() => setConfirmAll(false)}
        />
      )}
    </div>
  )
}
