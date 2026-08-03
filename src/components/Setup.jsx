import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FORMATS } from '../engine/bracketEngine.js'
import { TAG_META } from '../engine/groupEngine.js'
import { useSetupStorage } from '../hooks/useSetupStorage.js'
import '../setup.css'

const PRESETS = [4, 8, 16, 32]
const TAGS    = ['A', 'B', 'C']
const MODE_BRACKET = 'bracket'
const MODE_GROUP   = 'group'
const DEFAULT_COUNT = 8

const makePlayer  = (i)      => ({ id: `p${i+1}`, name: '', tag: 'B' })
const makePlayers = (n, old) => Array.from({ length: n }, (_, i) => old?.[i] ?? makePlayer(i))

const defaults = {
  mode:          MODE_BRACKET,
  // Group state
  groupSetups:   [],
  activeGroupId: null,
  // Bracket state
  bracketSetups: [],
  activeBracketId: null,
}

// ── Confirm Modal ────────────────────────────────────────────────────
function ConfirmModal({ msg, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel }) {
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
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} style={{ minWidth: 90 }}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Segmented Tab Bar ───────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = [
    { id: MODE_BRACKET, label: 'Bracket Draw', icon: '⚡' },
    { id: MODE_GROUP,   label: 'Group Draw',   icon: '⊞' },
  ]
  return (
    <div className="su-tabbar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`su-tab${active === t.id ? ' su-tab--active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="su-tab-icon">{t.icon}</span>
          <span>{t.label}</span>
          {active === t.id && <motion.div className="su-tab-ink" layoutId="tab-ink" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
        </button>
      ))}
    </div>
  )
}

// ── Section Shell ───────────────────────────────────────────────
function Section({ step, title, action, children }) {
  return (
    <div className="su-section">
      <div className="su-section-head">
        <span className="su-step">{step}</span>
        <span className="su-section-title">{title}</span>
        {action && <div className="su-section-action">{action}</div>}
      </div>
      <div className="su-section-body">{children}</div>
    </div>
  )
}

export default function Setup({ onStart, onGroupStart, onOpenGroup, onOpenBracket, onArchiveGroup, history = [] }) {
  const [s, set, clearAll] = useSetupStorage(defaults)

  const [confirmDeleteId,   setConfirmDeleteId]   = useState(null)
  const [confirmDeleteType, setConfirmDeleteType] = useState(null) // 'group' or 'bracket'
  const [confirmReset,      setConfirmReset]      = useState(false) 
  const [confirmClearNames, setConfirmClearNames] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  // Auto-cleanup cards that have been archived (finished)
  useEffect(() => {
    const archivedIds = history.filter(h => h.isArchived).map(h => h.id)
    
    if (archivedIds.length > 0 && s.groupSetups?.length > 0) {
      const remaining = s.groupSetups.filter(g => !archivedIds.includes(g.id))
      if (remaining.length !== s.groupSetups.length) {
        set('groupSetups', remaining)
        if (archivedIds.includes(s.activeGroupId)) set('activeGroupId', null)
      }
    }

    if (archivedIds.length > 0 && s.bracketSetups?.length > 0) {
      const remainingBrackets = s.bracketSetups.filter(b => !archivedIds.includes(b.id))
      if (remainingBrackets.length !== s.bracketSetups.length) {
        set('bracketSetups', remainingBrackets)
        if (archivedIds.includes(s.activeBracketId)) set('activeBracketId', null)
      }
    }
  }, [history, s.groupSetups, s.bracketSetups, s.activeGroupId, s.activeBracketId, set])

  // ═══════════════ BRACKET HELPERS ═══════════════
  const activeBracket = (s.bracketSetups || []).find(b => b.id === s.activeBracketId)
  const isActiveBracketGenerated = activeBracket ? history.some(h => h.id === activeBracket.id) : false

  const handleCreateBracket = () => {
    if ((s.bracketSetups || []).length >= 10) { alert('Maximum of 10 active bracket setups reached!'); return }
    const title = prompt('Enter Bracket Title (e.g., U18 Boys Knockout):')
    if (!title) return
    const newId = Date.now().toString()
    const newSetup = { id: newId, title, format: 'single_elim', count: DEFAULT_COUNT, custom: String(DEFAULT_COUNT), players: makePlayers(DEFAULT_COUNT) }
    set('bracketSetups', [...(s.bracketSetups || []), newSetup])
    set('activeBracketId', newId)
  }

  const updateActiveBracket = (updates) =>
    set('bracketSetups', prev => prev.map(b => b.id === s.activeBracketId ? { ...b, ...updates } : b))

  const confirmDeleteBracketSetup = (id) => {
    set('bracketSetups', prev => prev.filter(b => b.id !== id))
    if (s.activeBracketId === id) set('activeBracketId', null)
    onArchiveGroup?.(id)
    setConfirmDeleteId(null)
    setConfirmDeleteType(null)
  }

  const applyBracketCount = (n) => {
    if (!activeBracket) return
    updateActiveBracket({ count: n, custom: String(n), players: makePlayers(n, activeBracket.players) })
  }

  const onBracketCustom = (val) => {
    if (!activeBracket) return
    updateActiveBracket({ custom: val })
    const n = parseInt(val)
    if (!isNaN(n) && n >= 2 && n <= 64) updateActiveBracket({ count: n, players: makePlayers(n, activeBracket.players) })
  }

  const updateBracketName = (i, v) => {
    if (!activeBracket) return
    updateActiveBracket({ players: activeBracket.players.map((x, idx) => idx === i ? { ...x, name: v } : x) })
  }

  const updateBracketTag = (i, tag) => {
    if (!activeBracket) return
    updateActiveBracket({ players: activeBracket.players.map((x, idx) => idx === i ? { ...x, tag } : x) })
  }

  const clearBracketNames = () => {
    if (!activeBracket) return
    updateActiveBracket({ players: activeBracket.players.map(p => ({ ...p, name: '' })) })
  }

  const doRegenerateBracket = () => {
    const resolvedPlayers = activeBracket.players.map((p, i) => ({ ...p, name: p.name || `Player ${i+1}` }))
    onStart({ id: activeBracket.id, title: activeBracket.title, format: activeBracket.format, players: resolvedPlayers })
    setConfirmRegenerate(false)
  }

  // ═══════════════ GROUP HELPERS ═══════════════
  const activeGroup = (s.groupSetups || []).find(g => g.id === s.activeGroupId)
  const isActiveGroupGenerated = activeGroup ? history.some(h => h.id === activeGroup.id) : false

  const handleCreateGroup = () => {
    if ((s.groupSetups || []).length >= 10) { alert('Maximum of 10 active group setups reached!'); return }
    const title = prompt('Enter Tournament Title (e.g., U18 Boys Groups):')
    if (!title) return
    const newId = Date.now().toString()
    const newSetup = { id: newId, title, count: DEFAULT_COUNT, custom: String(DEFAULT_COUNT), size: 4, players: makePlayers(DEFAULT_COUNT) }
    set('groupSetups', [...(s.groupSetups || []), newSetup])
    set('activeGroupId', newId)
  }

  const updateActiveGroup = (updates) =>
    set('groupSetups', prev => prev.map(g => g.id === s.activeGroupId ? { ...g, ...updates } : g))

  const confirmDeleteGroupSetup = (id) => {
    set('groupSetups', prev => prev.filter(g => g.id !== id))
    if (s.activeGroupId === id) set('activeGroupId', null)
    onArchiveGroup?.(id)
    setConfirmDeleteId(null)
    setConfirmDeleteType(null)
  }

  const applyGroupCount = (n) => {
    if (!activeGroup) return
    updateActiveGroup({ count: n, custom: String(n), players: makePlayers(n, activeGroup.players) })
  }

  const onGroupCustom = (val) => {
    if (!activeGroup) return
    updateActiveGroup({ custom: val })
    const n = parseInt(val)
    if (!isNaN(n) && n >= 2 && n <= 64) updateActiveGroup({ count: n, players: makePlayers(n, activeGroup.players) })
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

  const doRegenerateGroup = () => {
    const resolvedGroupPlayers = activeGroup.players.map((p, i) => ({ ...p, name: p.name || `Player ${i+1}` }))
    onGroupStart({ id: activeGroup.id, title: activeGroup.title, players: resolvedGroupPlayers, groupSize: activeGroup.size })
    setConfirmRegenerate(false)
  }

  return (
    <div className="su-root">
      <TabBar
        active={s.mode}
        onChange={(m) => { set('mode', m); set('activeGroupId', null); set('activeBracketId', null) }}
      />

      <AnimatePresence mode="wait">

        {/* ─────────────── BRACKET MODE ─────────────── */}
        {s.mode === MODE_BRACKET && (
          <motion.div key="bracket"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}>

            <AnimatePresence mode="wait">
              {/* ── Bracket Lobby ── */}
              {s.activeBracketId === null && (
                <motion.div key="bracket-lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Section step="1" title={`Active Brackets · ${(s.bracketSetups || []).length}/10`}>
                    <div className="su-lobby">
                      {(s.bracketSetups || []).map(b => {
                        const isGenerated = history.some(h => h.id === b.id)
                        const fmtMeta = FORMATS.find(f => f.id === b.format)
                        return (
                          <div key={b.id} className={`su-lobby-card${isGenerated ? ' su-lobby-card--active' : ''}`}
                               onClick={() => isGenerated ? onOpenBracket(b.id) : set('activeBracketId', b.id)}>
                            <div className="su-lobby-card-top">
                              <div>
                                <div className="su-lobby-title">{b.title}</div>
                                <div className="su-lobby-meta">{b.players.length} players · {fmtMeta?.label}</div>
                              </div>
                              <div className="su-lobby-badges">
                                {isGenerated
                                  ? <span className="su-badge su-badge--live">Live</span>
                                  : <span className="su-badge su-badge--draft">Draft</span>}
                              </div>
                            </div>
                            <div className="su-lobby-card-actions">
                              {isGenerated ? (
                                <>
                                  <button className="su-lbtn su-lbtn--stage1" onClick={(e) => { e.stopPropagation(); onOpenBracket(b.id) }}>▶ Open Bracket</button>
                                  <button className="su-lbtn su-lbtn--edit" onClick={(e) => { e.stopPropagation(); set('activeBracketId', b.id) }}>✎ Edit</button>
                                </>
                              ) : (
                                <button className="su-lbtn su-lbtn--open" onClick={(e) => { e.stopPropagation(); set('activeBracketId', b.id) }}>Configure →</button>
                              )}
                              <button className="su-lbtn su-lbtn--del" onClick={(e) => { e.stopPropagation(); setConfirmDeleteType('bracket'); setConfirmDeleteId(b.id) }}>✕</button>
                            </div>
                          </div>
                        )
                      })}
                      {(s.bracketSetups || []).length < 10 && (
                        <button className="su-lobby-new" onClick={handleCreateBracket}>
                          <span className="su-lobby-new-plus">+</span>
                          <span>New Bracket</span>
                        </button>
                      )}
                    </div>
                  </Section>
                </motion.div>
              )}

              {/* ── Configure Bracket ── */}
              {s.activeBracketId !== null && activeBracket && (
                <motion.div key="configure-bracket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="su-configure-header">
                    <button className="su-back-btn" onClick={() => set('activeBracketId', null)}>← Back to Lobby</button>
                    <span className="su-configure-title">{activeBracket.title}</span>
                    {isActiveBracketGenerated && <span className="su-badge su-badge--live" style={{ marginLeft: 8 }}>Live</span>}
                  </div>

                  <Section step="2" title="Format">
                    <div className="su-formats">
                      {FORMATS.map(f => (
                        <button
                          key={f.id}
                          className={`su-format-card${activeBracket.format === f.id ? ' su-format-card--sel' : ''}`}
                          onClick={() => updateActiveBracket({ format: f.id })}
                        >
                          <span className={`tag ${f.color}`}>{f.tag}</span>
                          <div className="su-format-name">{f.label}</div>
                          <div className="su-format-desc">{f.desc}</div>
                        </button>
                      ))}
                    </div>
                  </Section>

                  <Section step="3" title="Number of Players">
                    <div className="su-presets">
                      {PRESETS.map(n => (
                        <button key={n} className={`su-preset${activeBracket.count === n ? ' su-preset--sel' : ''}`} onClick={() => applyBracketCount(n)}>{n}</button>
                      ))}
                      <input
                        type="number" min="2" max="64" placeholder="Custom"
                        value={activeBracket.custom}
                        onChange={e => onBracketCustom(e.target.value)}
                        className="su-custom-input"
                      />
                    </div>
                    <div className="su-player-count">{activeBracket.players.length} players</div>
                  </Section>

                  {activeBracket.players.length > 0 && (
                    <Section step="4" title="Players & Tags"
                      action={<button className="su-clear-btn" onClick={() => setConfirmClearNames(true)}>Clear all</button>}>
                      <div className="su-tag-legend">
                        {TAGS.map(t => (
                          <span key={t} className="su-tag-legend-item">
                            <span className={`tag ${TAG_META[t].badge}`}>{t}</span>
                            <span className="su-tag-legend-label">{TAG_META[t].label}</span>
                          </span>
                        ))}
                      </div>
                      <div className="su-names-grid su-names-grid--group">
                        {activeBracket.players.map((p, i) => (
                          <div key={p.id} className="su-group-player-row">
                            <span className="su-name-idx">#{i+1}</span>
                            <input value={p.name} onChange={e => updateBracketName(i, e.target.value)} placeholder={`Player ${i+1}`} />
                            <div className="su-tag-pills">
                              {TAGS.map(t => (
                                <button
                                  key={t}
                                  className={`tag ${TAG_META[t].badge} su-tag-pill${p.tag === t ? ' su-tag-pill--sel' : ''}`}
                                  onClick={() => updateBracketTag(i, t)}
                                >{t}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {activeBracket.players.length >= 2 && (
                    <div className="su-generate-row">
                      {isActiveBracketGenerated && (
                        <div className="su-open-btns">
                          <button className="su-lbtn su-lbtn--stage1" onClick={() => onOpenBracket(activeBracket.id)}>▶ Open Bracket</button>
                        </div>
                      )}
                      <button className="su-gen-btn" onClick={() => {
                        if (isActiveBracketGenerated) {
                          setConfirmRegenerate(true)
                        } else {
                          const resolvedPlayers = activeBracket.players.map((p, i) => ({ ...p, name: p.name || `Player ${i+1}` }))
                          onStart({ id: activeBracket.id, title: activeBracket.title, format: activeBracket.format, players: resolvedPlayers })
                        }
                      }}>
                        {isActiveBracketGenerated ? 'Regenerate Bracket' : 'Generate Bracket'}
                      </button>
                      <span className="su-gen-meta">{FORMATS.find(f => f.id === activeBracket.format)?.label} · {activeBracket.players.length} players</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ─────────────── GROUP MODE ─────────────── */}
        {s.mode === MODE_GROUP && (
          <motion.div key="group"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}>

            <AnimatePresence mode="wait">

              {/* ── Group Lobby ── */}
              {s.activeGroupId === null && (
                <motion.div key="group-lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Section step="1" title={`Active Groups · ${(s.groupSetups || []).length}/10`}>
                    <div className="su-lobby">
                      {(s.groupSetups || []).map(g => {
                        const tournamentData = history.find(h => h.id === g.id)
                        const isGenerated    = !!tournamentData
                        const hasStage2      = !!(tournamentData?.stage2)
                        return (
                          <div key={g.id} className={`su-lobby-card${isGenerated ? ' su-lobby-card--active' : ''}`}
                               onClick={() => isGenerated ? onOpenGroup(g.id, hasStage2 ? 'stage2' : 'groups') : set('activeGroupId', g.id)}>
                            <div className="su-lobby-card-top">
                              <div>
                                <div className="su-lobby-title">{g.title}</div>
                                <div className="su-lobby-meta">{g.players.length} players · {g.size}/group</div>
                              </div>
                              <div className="su-lobby-badges">
                                {isGenerated
                                  ? <span className="su-badge su-badge--live">Live</span>
                                  : <span className="su-badge su-badge--draft">Draft</span>}
                              </div>
                            </div>
                            <div className="su-lobby-card-actions">
                              {isGenerated ? (
                                <>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="su-lbtn su-lbtn--stage1" onClick={(e) => { e.stopPropagation(); onOpenGroup(g.id, 'groups') }}>Stg 1</button>
                                    {hasStage2 && <button className="su-lbtn su-lbtn--stage2" onClick={(e) => { e.stopPropagation(); onOpenGroup(g.id, 'stage2') }}>Stg 2</button>}
                                  </div>
                                  <button className="su-lbtn su-lbtn--edit" onClick={(e) => { e.stopPropagation(); set('activeGroupId', g.id) }}>✎ Edit</button>
                                </>
                              ) : (
                                <button className="su-lbtn su-lbtn--open" onClick={(e) => { e.stopPropagation(); set('activeGroupId', g.id) }}>Configure →</button>
                              )}
                              <button className="su-lbtn su-lbtn--del" onClick={(e) => { e.stopPropagation(); setConfirmDeleteType('group'); setConfirmDeleteId(g.id) }}>✕</button>
                            </div>
                          </div>
                        )
                      })}

                      {(s.groupSetups || []).length < 10 && (
                        <button className="su-lobby-new" onClick={handleCreateGroup}>
                          <span className="su-lobby-new-plus">+</span>
                          <span>New Tournament</span>
                        </button>
                      )}
                    </div>
                  </Section>
                </motion.div>
              )}

              {/* ── Configure Group ── */}
              {s.activeGroupId !== null && activeGroup && (
                <motion.div key="configure-group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="su-configure-header">
                    <button className="su-back-btn" onClick={() => set('activeGroupId', null)}>← Back to Lobby</button>
                    <span className="su-configure-title">{activeGroup.title}</span>
                    {isActiveGroupGenerated && <span className="su-badge su-badge--live" style={{ marginLeft: 8 }}>Live</span>}
                  </div>

                  <Section step="2" title="Number of Players">
                    <div className="su-presets">
                      {PRESETS.map(n => (
                        <button key={n} className={`su-preset${activeGroup.count === n ? ' su-preset--sel' : ''}`} onClick={() => applyGroupCount(n)}>{n}</button>
                      ))}
                      <input
                        type="number" min="2" max="64" placeholder="Custom"
                        value={activeGroup.custom}
                        onChange={e => onGroupCustom(e.target.value)}
                        className="su-custom-input"
                      />
                    </div>
                    <div className="su-player-count">{activeGroup.players.length} players</div>
                  </Section>

                  <Section step="3" title="Players per Group">
                    <div className="su-presets">
                      {[2,3,4,5,6].map(n => (
                        <button key={n} className={`su-preset${activeGroup.size === n ? ' su-preset--sel' : ''}`} onClick={() => updateActiveGroup({ size: n })}>{n}</button>
                      ))}
                    </div>
                    <div className="su-hint">Round-robin within each group</div>
                  </Section>

                  {activeGroup.players.length > 0 && (
                    <Section step="4" title="Players & Tags"
                      action={<button className="su-clear-btn" onClick={() => setConfirmClearNames(true)}>Clear all</button>}>
                      <div className="su-tag-legend">
                        {TAGS.map(t => (
                          <span key={t} className="su-tag-legend-item">
                            <span className={`tag ${TAG_META[t].badge}`}>{t}</span>
                            <span className="su-tag-legend-label">{TAG_META[t].label}</span>
                          </span>
                        ))}
                      </div>
                      <div className="su-names-grid su-names-grid--group">
                        {activeGroup.players.map((p, i) => (
                          <div key={p.id} className="su-group-player-row">
                            <span className="su-name-idx">#{i+1}</span>
                            <input value={p.name} onChange={e => updateGroupName(i, e.target.value)} placeholder={`Player ${i+1}`} />
                            <div className="su-tag-pills">
                              {TAGS.map(t => (
                                <button
                                  key={t}
                                  className={`tag ${TAG_META[t].badge} su-tag-pill${p.tag === t ? ' su-tag-pill--sel' : ''}`}
                                  onClick={() => updateGroupTag(i, t)}
                                >{t}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {activeGroup.players.length >= 2 && (
                    <div className="su-generate-row su-generate-row--group">
                      {isActiveGroupGenerated && (() => {
                        const td = history.find(h => h.id === activeGroup.id)
                        return (
                          <div className="su-open-btns">
                            <button className="su-lbtn su-lbtn--stage1" onClick={() => onOpenGroup(activeGroup.id, 'groups')}>▶ Stage 1</button>
                            {td?.stage2 && <button className="su-lbtn su-lbtn--stage2" onClick={() => onOpenGroup(activeGroup.id, 'stage2')}>▶ Stage 2</button>}
                          </div>
                        )
                      })()}
                      <button className="su-gen-btn" onClick={() => {
                        if (isActiveGroupGenerated) {
                          setConfirmRegenerate(true)
                        } else {
                          const resolvedGroupPlayers = activeGroup.players.map((p, i) => ({ ...p, name: p.name || `Player ${i+1}` }))
                          onGroupStart({ id: activeGroup.id, title: activeGroup.title, players: resolvedGroupPlayers, groupSize: activeGroup.size })
                        }
                      }}>
                        {isActiveGroupGenerated ? 'Regenerate Groups' : 'Generate Groups'}
                      </button>
                      <span className="su-gen-meta">{activeGroup.players.length} players · {activeGroup.size}/group · snake-drafted</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="su-reset-row">
        <button className="su-reset-btn" onClick={() => setConfirmReset(true)}>Reset all setup data</button>
      </div>

      {/* ── Confirmation Modals ── */}
      <AnimatePresence>
        {confirmDeleteId && (
          <ConfirmModal
            msg="Delete this card and move the tournament results to History?"
            confirmLabel="Archive"
            onConfirm={() => {
              if (confirmDeleteType === 'group') confirmDeleteGroupSetup(confirmDeleteId)
              if (confirmDeleteType === 'bracket') confirmDeleteBracketSetup(confirmDeleteId)
            }}
            onCancel={() => { setConfirmDeleteId(null); setConfirmDeleteType(null) }}
          />
        )}
        {confirmReset && (
          <ConfirmModal
            msg="Reset ALL setup data? This clears every draft, name list and configuration. Tournament history is kept."
            confirmLabel="Reset"
            onConfirm={() => { clearAll(); setConfirmReset(false) }}
            onCancel={() => setConfirmReset(false)}
          />
        )}
        {confirmClearNames && (
          <ConfirmModal
            msg="Clear all player names in this setup? Slots are kept but every name will be wiped."
            confirmLabel="Clear"
            onConfirm={() => {
              if (s.mode === MODE_BRACKET) clearBracketNames()
              else clearGroupNames()
              setConfirmClearNames(false)
            }}
            onCancel={() => setConfirmClearNames(false)}
          />
        )}
        {confirmRegenerate && (
          <ConfirmModal
            msg="Regenerating will reset all match scores and results for this tournament. Continue?"
            confirmLabel="Regenerate"
            onConfirm={() => {
              if (s.mode === MODE_BRACKET) doRegenerateBracket()
              else doRegenerateGroup()
            }}
            onCancel={() => setConfirmRegenerate(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}