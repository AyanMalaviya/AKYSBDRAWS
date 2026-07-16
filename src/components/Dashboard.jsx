import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FORMATS } from '../engine/bracketEngine.js'

const fmtDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    + ' · ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
}

function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <motion.div className="modal-box"
        initial={{ scale: 0.88, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}>
        <div className="modal-icon">⚠️</div>
        <div className="modal-msg">{msg}</div>
        <div className="modal-btns">
          <button className="btn btn-ghost" onClick={onCancel} style={{ minWidth: 90 }}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} style={{ minWidth: 90 }}>Delete</button>
        </div>
      </motion.div>
    </div>
  )
}

export default function Dashboard({ history, onRestore, onDelete, onDeleteAll }) {
  const [confirmId, setConfirmId]   = useState(null)
  const [confirmAllFlag, setAll]    = useState(false)

  // FILTER: Only show tournaments that have been moved to history (archived)
  const archivedHistory = history.filter(entry => entry.isArchived)

  if (archivedHistory.length === 0) return (
    <div className="empty-state">
      <div style={{ fontSize: 52, filter: 'grayscale(0.3)' }}>📂</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>No history yet</div>
      <div style={{ fontSize: 14, color: 'var(--muted)' }}>Delete a tournament from the Setup Lobby to move it here.</div>
    </div>
  )

  return (
    <div>
      <div className="dash-header">
        <div>
          <div className="dash-title">Tournament History</div>
          <div className="dash-sub">{archivedHistory.length} saved tournament{archivedHistory.length!==1?'s':''}</div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => setAll(true)}>🗑 Clear All</button>
      </div>

      <div className="history-grid">
        <AnimatePresence>
          {archivedHistory.map((entry, i) => {
            const f = FORMATS.find(x => x.id === entry.format)
            return (
              <motion.div key={entry.id} className="hcard"
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}>
                <div className="hcard-top">
                  {entry.type === 'group' ? (
                    <>
                      <span className="tag tag-orange">GRP</span>
                      <span className="hcard-fmt">{entry.title || 'Group Stage'}</span>
                    </>
                  ) : (
                    <>
                      <span className={`tag ${f?.color}`}>{f?.tag}</span>
                      <span className="hcard-fmt">{f?.label}</span>
                      {entry.champion && <span className="hcard-champ">🏆 {entry.champion.name}</span>}
                    </>
                  )}
                </div>
                <div className="hcard-meta">
                  <span>👥 {entry.playerCount} players</span>
                  <span>🕒 {fmtDate(entry.savedAt)}</span>
                </div>
                
                {/* NEW: Champion Highlight Banner */}
                {entry.champion && (
                  <div style={{
                    marginTop: 12, marginBottom: 4, padding: '8px 12px',
                    background: 'linear-gradient(90deg, rgba(255,215,0,0.15), rgba(255,215,0,0.02))',
                    borderLeft: '3px solid var(--neon-yellow)',
                    borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <span style={{ fontSize: 18 }}>🏆</span>
                    <span style={{ color: 'var(--neon-yellow)', fontWeight: 800, fontSize: 14 }}>
                      Winner: {entry.champion.name}
                    </span>
                  </div>
                )}

                <div className="hcard-players" style={{ marginTop: entry.champion ? 8 : 12 }}>
                  {entry.players.slice(0, 6).map(p => {
                    const isChamp = entry.champion?.id === p.id;
                    return (
                      <span key={p.id} className="p-chip" style={
                        isChamp ? { background: 'rgba(255,215,0,0.2)', color: 'var(--neon-yellow)', border: '1px solid rgba(255,215,0,0.4)' } : {}
                      }>
                        {isChamp && <span style={{ marginRight: 4 }}>🏆</span>}
                        {p.name}
                      </span>
                    )
                  })}
                  {entry.players.length > 6 && <span className="p-chip p-chip-more">+{entry.players.length-6}</span>}
                </div>
                <div className="hcard-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => onRestore(entry)}>↩ Restore</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(entry.id)}>Delete</button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmId && (
          <ConfirmModal
            msg="Permanently delete this tournament from history? This cannot be undone."
            onConfirm={() => { onDelete(confirmId); setConfirmId(null) }}
            onCancel={() => setConfirmId(null)}
          />
        )}
        {confirmAllFlag && (
          <ConfirmModal
            msg={`Delete all ${archivedHistory.length} tournaments? This cannot be undone.`}
            onConfirm={() => { onDeleteAll(); setAll(false) }}
            onCancel={() => setAll(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}