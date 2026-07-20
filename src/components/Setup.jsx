import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FORMATS } from '../engine/bracketEngine.js'
import { TAG_META } from '../engine/groupEngine.js'
import { useSetupStorage } from '../hooks/useSetupStorage.js'

const PRESETS = [4, 8, 16, 32]
const TAGS    = ['A', 'B', 'C']
const MODE_BRACKET = 'bracket'
const MODE_GROUP   = 'group'
const DEFAULT_COUNT = 8

const makePlayer  = (i)      => ({ id: `p${i+1}`, name: '', tag: 'B' })
const makePlayers = (n, old) => Array.from({ length: n }, (_, i) => old?.[i] ?? makePlayer(i))

const defaults = {
  mode:         MODE_BRACKET,
  format:       'single_elim',
  count:        DEFAULT_COUNT,
  custom:       '',
  names:        makePlayers(DEFAULT_COUNT),
  groupSetups:  [],
  activeGroupId: null,
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
          <button className="btn btn-danger" onClick={onConfirm} style={{ minWidth: 90 }}>Archive</button>
        </div>
      </motion.div>
    </div>
  )
}

export default function Setup({ onStart, onGroupStart, onOpenGroup, onArchiveGroup, history = [] }) {
  const [s, set, clearAll] = useSetupStorage(defaults)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    const archivedIds = history.filter(h => h.isArchived).map(h => h.id)
    if (archivedIds.length > 0 && s.groupSetups.length > 0) {
      const remaining = s.groupSetups.filter(g => !archivedIds.includes(g.id))
      if (remaining.length !== s.groupSetups.length) {
        set('groupSetups', remaining)
        if (archivedIds.includes(s.activeGroupId)) {
          set('activeGroupId', null)
        }
      }
    }
  }, [history, s.groupSetups, s.activeGroupId, set])

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

  const updateName = (i, v) => set('names', prev => prev.map((x, idx) => idx === i ? { ...x, name: v } : x))
  const clearNames = () => set('names', s.names.map(p => ({ ...p, name: '' })))

  const activeGroup = s.groupSetups.find(g => g.id === s.activeGroupId)
  const isActiveGenerated = activeGroup ? history.some(h => h.id === activeGroup.id) : false

  const handleCreateGroup = () => {
    if (s.groupSetups.length >= 10) {
      alert("Maximum of 10 active setup cards reached!")
      return
    }
    const title = prompt("Enter Tournament Title (e.g., U 18 A 18):")
    if (!title) return
    
    const newId = Date.now().toString()
    const newSetup = {
      id: newId,
      title,
      count: DEFAULT_COUNT,
      custom: String(DEFAULT_COUNT),
      size: 4,
      players: makePlayers(DEFAULT_COUNT)
    }
    
    set('groupSetups', [...s.groupSetups, newSetup])
    set('activeGroupId', newId)
  }

  const updateActiveGroup = (updates) => {
    set('groupSetups', prev => prev.map(g => g.id === s.activeGroupId ? { ...g, ...updates } : g))
  }

  const confirmDeleteGroupSetup = (id) => {
    set('groupSetups', prev => prev.filter(g => g.id !== id))
    if (s.activeGroupId === id) set('activeGroupId', null)
    onArchiveGroup?.(id) 
    setConfirmDeleteId(null)
  }

  const applyGroupCount = (n) => {
    if (!activeGroup) return
    updateActiveGroup({ count: n, custom: String(n), players: makePlayers(n, activeGroup.players) })
  }
  const onGroupCustom = (val) => {
    if (!activeGroup) return
    updateActiveGroup({ custom: val })
    const n = parseInt(val)
    if (!isNaN(n) && n >= 2 && n <= 64) {
      updateActiveGroup({ count: n, players: makePlayers(n, activeGroup.players) })
    }
  }

  const updateGroupName = (i, v) => {
    if (!activeGroup) return
    updateActiveGroup({ players: activeGroup.players.map((x, idx) => idx === i ? { ...x, name: v } : x) })
  }
  const updateGroupTag = (i, tag) => {
    if (!activeGroup) return
    updateActiveGroup({ players: activeGroup.players.map((x, idx) => idx === i ? { ...x, tag } : x) })
  }
  const clearGroupNames = () => {
    if (!activeGroup) return
    updateActiveGroup({ players: activeGroup.players.map(p => ({ ...p, name: '' })) })
  }

  const fmt = FORMATS.find(f => f.id === s.format)
  const resolvedNames = s.names.map((p, i) => ({ ...p, name: p.name || `Player ${i+1}` }))

  return (
    <>
      <div className="neon-bg">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      </div>

      <div className="setup-root">
        <motion.div className="setup-hero"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="setup-hero-title">Tournament Draws</div>
          <div className="setup-hero-sub">Build your tournament bracket - offline, instant, zero setup</div>
        </motion.div>

        <motion.div className="glass mode-toggle-bar"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <button
            className={`mode-btn${s.mode === MODE_BRACKET ? ' active' : ''}`}
            onClick={() => set('mode', MODE_BRACKET)}
          >🏆 Bracket Draw</button>
          <button
            className={`mode-btn${s.mode === MODE_GROUP ? ' active' : ''}`}
            onClick={() => { set('mode', MODE_GROUP); set('activeGroupId', null); }}
          >⚡ Group Draw</button>
        </motion.div>

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
                  type="number" min="2" max="64" placeholder="Custom (2-64)"
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
                  <button className="clear-names-btn" onClick={clearNames} title="Clear all names">✖ Clear All</button>
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
                  Generate Bracket 🚀
                </button>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
                  {fmt?.label} • {s.names.length} players
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* --- GROUP MODE --- */}
        {s.mode === MODE_GROUP && (
          <>
            {s.activeGroupId === null ? (
              <motion.div className="glass" style={{ padding: 20, marginBottom: 14 }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="step-label">
                  <div className="step-num">1</div>
                  <div className="step-title">Tournament Setup Lobby ({s.groupSetups.length}/10)</div>
                </div>
                
                <div className="formats-grid">
                  {s.groupSetups.map(g => {
                    const tournamentData = history.find(h => h.id === g.id);
                    const isGenerated = !!tournamentData;
                    const hasStage2 = tournamentData && tournamentData.stage2;
                    
                    return (
                    <div key={g.id} className="format-tile"
                          style={{
                            position: 'relative', display: 'flex', flexDirection: 'column',
                            textAlign: 'left', padding: '16px', gap: '12px',
                           background: isGenerated ? 'linear-gradient(145deg, rgba(0,212,255,0.06) 0%, rgba(0,212,255,0.01) 100%)' : 'var(--glass)',
                           border: isGenerated ? '1px solid rgba(0,212,255,0.3)' : '1px solid var(--border2)',
                           boxShadow: isGenerated ? '0 4px 20px rgba(0,212,255,0.05)' : 'none',
                           transition: 'all 0.2s ease'
                         }}
                          onClick={() => {
                           if (isGenerated && onOpenGroup) {
                             onOpenGroup(g.id, hasStage2 ? 'stage2' : 'groups');
                           } else {
                             set('activeGroupId', g.id);
                           }
                         }}>
                        
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="format-tile-name" style={{ fontSize: 18, color: isGenerated ? 'var(--neon-blue)' : 'var(--text)' }}>{g.title}</div>
                          <div className="format-tile-desc" style={{ marginTop: 4 }}>{g.players.length} players • Size {g.size}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, zIndex: 10 }}>
                          {isGenerated && (
                            <button
                              onClick={(e) => { e.stopPropagation(); set('activeGroupId', g.id); }}
                              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-yellow)', cursor: 'pointer', transition: 'background 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              title="Edit Setup"
                            >✏️</button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(g.id); }}
                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-pink)', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            title="Delete & Archive"
                          >🗑</button>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', flexWrap: 'nowrap' }}>
                         {isGenerated ? (
                           <span className="tag tag-green" style={{ fontSize: 10, padding: '4px 8px' }}>🟢 Active</span>
                         ) : (
                           <span className="tag" style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(255,255,255,0.08)' }}>Draft</span>
                         )}
                         
                         <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                           {isGenerated ? (
                             <>
                               <button
                                 onClick={(e) => { e.stopPropagation(); onOpenGroup(g.id, 'groups'); }}
                                 style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--neon-blue)', border: '1px solid rgba(0,212,255,0.4)', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                               >
                                 ▶ Stage 1
                               </button>
                               {hasStage2 && (
                                 <button
                                   onClick={(e) => { e.stopPropagation(); onOpenGroup(g.id, 'stage2'); }}
                                   style={{ background: 'rgba(255,215,0,0.15)', color: 'var(--neon-yellow)', border: '1px solid rgba(255,215,0,0.4)', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                 >
                                   ▶ Stage 2
                                 </button>
                               )}
                             </>
                           ) : (
                             <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                               Setup Draft ➔
                             </span>
                           )}
                         </div>
                      </div>
                    </div>
                  )})}
                  
                  {s.groupSetups.length < 10 && (
                    <div className="format-tile" onClick={handleCreateGroup}
                       style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(0,212,255,0.4)', background: 'rgba(0,212,255,0.03)', minHeight: 90 }}>
                      <div style={{ fontSize: 28, color: 'var(--neon-blue)', fontWeight: 900, lineHeight: 1 }}>+</div>
                      <div style={{ fontSize: 12, color: 'var(--neon-blue)', marginTop: 8, fontWeight: 700 }}>New Tournament</div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              activeGroup && (
                <>
                  <motion.div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', padding: '0 4px' }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <button onClick={() => set('activeGroupId', null)} className="btn btn-ghost btn-sm" style={{ padding: '6px 14px' }}>⬅ Back to Lobby</button>
                    <h3 style={{ margin: 0, color: 'var(--neon-blue)', fontSize: 18 }}>
                      {activeGroup.title} {isActiveGenerated && <span style={{fontSize: 12, color: 'var(--neon-yellow)', marginLeft: 8}}>(Editing Active)</span>}
                    </h3>
                  </motion.div>

                  <motion.div className="glass" style={{ padding: 20, marginBottom: 14 }}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="step-label">
                      <div className="step-num">2</div>
                      <div className="step-title">Number of Players</div>
                    </div>
                    <div className="count-presets">
                      {PRESETS.map(n => (
                        <button key={n} className={`count-btn${activeGroup.count === n ? ' sel' : ''}`}
                          onClick={() => applyGroupCount(n)}>{n}</button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="number" min="2" max="64" placeholder="Custom (2-64)"
                        value={activeGroup.custom}
                        onChange={e => onGroupCustom(e.target.value)}
                        style={{ maxWidth: 160 }}
                      />
                      <span style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {activeGroup.players.length} players
                      </span>
                    </div>
                  </motion.div>

                  <motion.div className="glass" style={{ padding: 20, marginBottom: 14 }}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
                    <div className="step-label">
                      <div className="step-num">3</div>
                      <div className="step-title">Players per Group</div>
                    </div>
                    <div className="count-presets">
                      {[2, 3, 4, 5, 6].map(n => (
                        <button key={n} className={`count-btn${activeGroup.size === n ? ' sel' : ''}`}
                          onClick={() => updateActiveGroup({ size: n })}>{n}</button>
                      ))}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
                      Each group plays a full round-robin among same-tier players.
                    </div>
                  </motion.div>

                  {activeGroup.players.length > 0 && (
                    <motion.div className="glass" style={{ padding: 20, marginBottom: 18 }}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                      <div className="step-label">
                        <div className="step-num">4</div>
                        <div className="step-title">Players &amp; Skill Tags</div>
                        <button className="clear-names-btn" onClick={clearGroupNames} title="Clear all names">✖ Clear All</button>
                      </div>

                      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        {TAGS.map(t => (
                          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={`tag ${TAG_META[t].badge}`}>{t}</span>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{TAG_META[t].label}</span>
                          </span>
                        ))}
                      </div>

                      <div className="names-grid">
                        {activeGroup.players.map((p, i) => (
                          <div key={p.id} className="gp-row" style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 8 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ color: 'var(--muted)', fontSize: 11, minWidth: 22 }}>#{i+1}</span>
                              <input
                                value={p.name}
                                onChange={e => updateGroupName(i, e.target.value)}
                                placeholder={`Player ${i+1}`}
                                style={{ flex: 1 }}
                              />
                            </div>
                            <div className="tag-selector" style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                              {TAGS.map(t => (
                                <button
                                  key={t}
                                  className={`tag ${TAG_META[t].badge}`}
                                  style={{
                                    cursor: 'pointer',
                                    opacity: p.tag === t ? 1 : 0.4,
                                    boxShadow: p.tag === t ? `0 0 10px ${TAG_META[t].glow}` : 'none',
                                    border: p.tag === t ? `1px solid ${TAG_META[t].color}` : '1px solid transparent'
                                  }}
                                  onClick={() => updateGroupTag(i, t)}
                                >{t}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeGroup.players.length >= 2 && (
                    <motion.div style={{ textAlign: 'center', paddingBottom: 32 }}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                      
                      {isActiveGenerated && (() => {
                        const tournamentData = history.find(h => h.id === activeGroup.id);
                        const hasStage2 = tournamentData && tournamentData.stage2;
                        return (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
                            <button className="btn" style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--neon-blue)', border: '1px solid rgba(0,212,255,0.4)', padding: '10px 20px' }}
                              onClick={() => onOpenGroup(activeGroup.id, 'groups')}>
                              ▶ Open Stage 1 (Groups)
                            </button>
                            {hasStage2 && (
                              <button className="btn" style={{ background: 'rgba(255,215,0,0.15)', color: 'var(--neon-yellow)', border: '1px solid rgba(255,215,0,0.4)', padding: '10px 20px' }}
                                onClick={() => onOpenGroup(activeGroup.id, 'stage2')}>
                                ▶ Open Stage 2 (Knockout)
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      <button className="gen-btn"
                        onClick={() => {
                          if (isActiveGenerated) {
                            const proceed = confirm("⚠️ Regenerating will reset all current match scores for this group. Do you want to continue?");
                            if (!proceed) return;
                          }
                          const resolvedGroupPlayers = activeGroup.players.map((p, i) => ({ ...p, name: p.name || `Player ${i+1}` }))
                          
                          onGroupStart({
                            id: activeGroup.id,
                            title: activeGroup.title,
                            players: resolvedGroupPlayers,
                            groupSize: activeGroup.size
                          })
                        }}>
                        {isActiveGenerated ? "Regenerate Groups 🚀" : "Generate Groups 🚀"}
                      </button>
                      <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
                        {activeGroup.players.length} players • {activeGroup.size} per group • tag-matched
                      </div>
                    </motion.div>
                  )}
                </>
              )
            )}
          </>
        )}

        {/* Reset everything — extra bottom padding so it clears the footer */}
        <motion.div style={{ textAlign: 'center', paddingBottom: 48 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <button
            onClick={clearAll}
            style={{
              fontSize: 12, color: 'var(--muted)', background: 'none',
              border: '1px solid var(--border2)', borderRadius: 8,
              padding: '6px 14px', cursor: 'pointer'
            }}
          >⚠️ Reset all setup data</button>
        </motion.div>

        <AnimatePresence>
          {confirmDeleteId && (
            <ConfirmModal
              msg="Delete this card and move the tournament results to History?"
              onConfirm={() => confirmDeleteGroupSetup(confirmDeleteId)}
              onCancel={() => setConfirmDeleteId(null)}
            />
          )}
        </AnimatePresence>

      </div>
    </>
  )
}