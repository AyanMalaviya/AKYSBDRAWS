import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FORMATS } from '../engine/bracketEngine.js'

const fmtDate = (val) => {
  if (!val) return 'Unknown Date'
  
  // FIX: If the string is purely digits (like Date.now().toString()), safely convert it to a Number so JS Date can parse it
  const parsed = /^\d+$/.test(val) ? Number(val) : val
  const d = new Date(parsed)
  
  if (isNaN(d.getTime())) return 'Unknown Date'
  
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    + ' · ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
}

function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
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
  // FIX: Save the entire object instead of just the ID so corrupted items lacking an ID can still trigger the modal!
  const [tournamentToDelete, setTournamentToDelete] = useState(null)
  const [confirmAllFlag, setAll]    = useState(false)

  // Split history into Active and Archived, filtering out completely null entries
  const safeHistory = history.filter(Boolean)
  const activeTournaments = safeHistory.filter(entry => !entry.isArchived)
  const archivedTournaments = safeHistory.filter(entry => entry.isArchived)

  if (safeHistory.length === 0) return (
    <div className="empty-state">
      <div style={{ fontSize: 52, filter: 'grayscale(0.3)' }}>📂</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>No history yet</div>
      <div style={{ fontSize: 14, color: 'var(--muted)' }}>Your saved tournaments will appear here.</div>
    </div>
  )

  const renderGrid = (tournaments, isArchivedSection) => (
    <div className="history-grid">
      <AnimatePresence>
        {tournaments.map((entry, i) => {
          // Fallback key so React doesn't crash on corrupted data
          const entryId = entry.id || `corrupt-${i}`
          const f = FORMATS.find(x => x.id === entry.format)
          
          return (
            <motion.div key={entryId} className="hcard"
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
                    <span className={`tag ${f?.color || 'tag-blue'}`}>{f?.tag || 'UNK'}</span>
                    <span className="hcard-fmt">{entry.title || f?.label || 'Unknown Bracket'}</span>
                  </>
                )}
              </div>
              <div className="hcard-meta">
                {/* Safe fallbacks in case player arrays are missing */}
                <span>👥 {entry.playerCount || entry.players?.length || 0} players</span>
                <span>🕒 {fmtDate(entry.savedAt || entry.id)}</span>
              </div>
              
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
                {(entry.players || []).slice(0, 6).map((p, pIdx) => {
                  const isChamp = entry.champion?.id && entry.champion.id === p.id;
                  return (
                    <span key={p.id || pIdx} className="p-chip" style={
                      isChamp ? { background: 'rgba(255,215,0,0.2)', color: 'var(--neon-yellow)', border: '1px solid rgba(255,215,0,0.4)' } : {}
                    }>
                      {isChamp && <span style={{ marginRight: 4 }}>🏆</span>}
                      {p.name || 'Unknown'}
                    </span>
                  )
                })}
                {(entry.players || []).length > 6 && <span className="p-chip p-chip-more">+{(entry.players || []).length-6}</span>}
              </div>
              <div className="hcard-actions">
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => onRestore(entry, entry.stage2 ? 'stage2' : 'groups')}
                  disabled={!entry.id} // Prevent trying to restore a totally dead card
                  style={{ opacity: !entry.id ? 0.5 : 1 }}
                >
                  {isArchivedSection ? '↩ Restore' : '▶ Resume Live'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setTournamentToDelete(entry)}>Delete</button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )

  return (
    <div>
      <div className="dash-header">
        <div>
          <div className="dash-title">Tournament Data</div>
          <div className="dash-sub">{safeHistory.length} total saved tournament{safeHistory.length!==1?'s':''}</div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => setAll(true)}>🗑 Clear All</button>
      </div>

      {activeTournaments.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ color: 'var(--green)', fontSize: 16, fontWeight: 800, marginBottom: 16, borderBottom: '1px solid rgba(34,214,122,0.2)', paddingBottom: 8 }}>
            🟢 Active Tournaments
          </h3>
          {renderGrid(activeTournaments, false)}
        </div>
      )}

      {archivedTournaments.length > 0 && (
        <div>
          <h3 style={{ color: 'var(--muted)', fontSize: 16, fontWeight: 800, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
            📂 Archived History
          </h3>
          {renderGrid(archivedTournaments, true)}
        </div>
      )}

      <AnimatePresence>
        {tournamentToDelete && (
          <ConfirmModal
            msg="Permanently delete this tournament? This cannot be undone."
            onConfirm={() => { onDelete(tournamentToDelete.id); setTournamentToDelete(null) }}
            onCancel={() => setTournamentToDelete(null)}
          />
        )}
        {confirmAllFlag && (
          <ConfirmModal
            msg={`Delete all ${safeHistory.length} tournaments? This cannot be undone.`}
            onConfirm={() => { onDeleteAll(); setAll(false) }}
            onCancel={() => setAll(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}