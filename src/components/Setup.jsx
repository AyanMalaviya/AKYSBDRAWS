import React, { useState, useEffect, useRef } from 'react'
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
  format:        'single_elim',
  count:         DEFAULT_COUNT,
  custom:        '',
  names:         makePlayers(DEFAULT_COUNT),
  groupSetups:   [],
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

export default function Setup({ onStart, onGroupStart, onOpenGroup, onArchiveGroup, history = [] }) {
  const [s, set, clearAll] = useSetupStorage(defaults)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    const archivedIds = history.filter(h => h.isArchived).map(h => h.id)
    if (archivedIds.length > 0 && s.groupSetups.length > 0) {
      const remaining = s.groupSetups.filter(g => !archivedIds.includes(g.id))
      if (remaining.length !== s.groupSetups.length) {
        set('groupSetups', remaining)
        if (archivedIds.includes(s.activeGroupId)) set('activeGroupId', null)
      }
    }
  }, [history, s.groupSetups, s.activeGroupId, set])

  // ── Bracket helpers ──
  const applyCount = (n) => { set('count', n); set('custom', String(n)); set('names', makePlayers(n, s.names)) }
  const onCustomBracket = (val) => {
    set('custom', val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 2 && n <= 64) { set('count', n); set('names', makePlayers(n, s.names)) }
  }
  const updateName = (i, v) => set('names', prev => prev.map((x, idx) => idx === i ? { ...x, name: v } : x))
  const clearNames = () => set('names', s.names.map(p => ({ ...p, name: '' })))

  // ── Group helpers ──
  const activeGroup = s.groupSetups.find(g => g.id === s.activeGroupId)
  const isActiveGenerated = activeGroup ? history.some(h => h.id === activeGroup.id) : false

  const handleCreateGroup = () => {
    if (s.groupSetups.length >= 10) { alert('Maximum of 10 active setup cards reached!'); return }
    const title = prompt('Enter Tournament Title (e.g., U18 Boys):')
    if (!title) return
    const newId = Date.now().toString()
    const newSetup = { id: newId, title, count: DEFAULT_COUNT, custom: String(DEFAULT_COUNT), size: 4, players: makePlayers(DEFAULT_COUNT) }
    set('groupSetups', [...s.groupSetups, newSetup])
    set('activeGroupId', newId)
  }

  const updateActiveGroup = (updates) =>
    set('groupSetups', prev => prev.map(g => g.id === s.activeGroupId ? { ...g, ...updates } : g))

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

  const fmt = FORMATS.find(f => f.id === s.format)
  const resolvedNames = s.names.map((p, i) => ({ ...p, name: p.name || `Player ${i+1}` }))

  return (
    <div className="su-root">

      <TabBar
        active={s.mode}
        onChange={(m) => { set('mode', m); set('activeGroupId', null) }}
      />

      <AnimatePresence mode="wait">

        {/* ─────────────── BRACKET MODE ─────────────── */}
        {s.mode === MODE_BRACKET && (
          <motion.div key="bracket"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}>

            <Section step="1" title="Format">
              <div className="su-formats">
                {FORMATS.map(f => (
                  <button
                    key={f.id}
                    className={`su-format-card${s.format === f.id ? ' su-format-card--sel' : ''}`}
                    onClick={() => set('format', f.id)}
                  >
                    <span className={`tag ${f.color}`}>{f.tag}</span>
                    <div className="su-format-name">{f.label}</div>
                    <div className="su-format-desc">{f.desc}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section step="2" title="Players">
              <div className="su-presets">
                {PRESETS.map(n => (
                  <button key={n} className={`su-preset${s.count === n ? ' su-preset--sel' : ''}`} onClick={() => applyCount(n)}>{n}</button>
                ))}
                <input
                  type="number" min="2" max="64" placeholder="Custom"
                  value={s.custom}
                  onChange={e => onCustomBracket(e.target.value)}
                  className="su-custom-input"
                />
              </div>
              <div className="su-player-count">{s.names.length} players</div>
            </Section>

            {s.names.length > 0 && (
              <Section step="3" title="Names"
                action={<button className="su-clear-btn" onClick={clearNames}>Clear all</button>}>
                <div className="su-names-grid">
                  {s.names.map((p, i) => (
                    <div key={p.id} className="su-name-row">
                      <span className="su-name-idx">#{i+1}</span>
                      <input value={p.name} onChange={e => updateName(i, e.target.value)} placeholder={`Player ${i+1}`} />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {s.names.length >= 2 && (
              <div className="su-generate-row">
                <button className="su-gen-btn" onClick={() => onStart({ format: s.format, players: resolvedNames })}>
                  Generate Bracket
                </button>
                <span className="su-gen-meta">{fmt?.label} · {s.names.length} players</span>
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────── GROUP MODE ─────────────── */}
        {s.mode === MODE_GROUP && (
          <motion.div key="group"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}>

            <AnimatePresence mode="wait">

              {/* ── Lobby ── */}
              {s.activeGroupId === null && (
                <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Section step="1" title={`Tournaments · ${s.groupSetups.length}/10`}>
                    <div className="su-lobby">
                      {s.groupSetups.map(g => {
                        const tournamentData = history.find(h => h.id === g.id)
                        const isGenerated    = !!tournamentData
                        const hasStage2      = !!(tournamentData?.stage2)
                        return (
                          <div key={g.id} className={`su-lobby-card${isGenerated ? ' su-lobby-card--active' : ''}`}>
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
                                  <button className="su-lbtn su-lbtn--stage1" onClick={() => onOpenGroup(g.id, 'groups')}>Stage 1</button>
                                  {hasStage2 && <button className="su-lbtn su-lbtn--stage2" onClick={() => onOpenGroup(g.id, 'stage2')}>Stage 2</button>}
                                  <button className="su-lbtn su-lbtn--edit" onClick={() => set('activeGroupId', g.id)}>Edit</button>
                                </>
                              ) : (
                                <button className="su-lbtn su-lbtn--open" onClick={() => set('activeGroupId', g.id)}>Configure →</button>
                              )}
                              <button className="su-lbtn su-lbtn--del" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(g.id) }}>✕</button>
                            </div>
                          </div>
                        )
                      })}

                      {s.groupSetups.length < 10 && (
                        <button className="su-lobby-new" onClick={handleCreateGroup}>
                          <span className="su-lobby-new-plus">+</span>
                          <span>New Tournament</span>
                        </button>
                      )}
                    </div>
                  </Section>
                </motion.div>
              )}

              {/* ── Configure group ── */}
              {s.activeGroupId !== null && activeGroup && (
                <motion.div key="configure" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="su-configure-header">
                    <button className="su-back-btn" onClick={() => set('activeGroupId', null)}>← Back</button>
                    <span className="su-configure-title">{activeGroup.title}</span>
                    {isActiveGenerated && <span className="su-badge su-badge--live" style={{ marginLeft: 8 }}>Live</span>}
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
                      action={<button className="su-clear-btn" onClick={clearGroupNames}>Clear all</button>}>
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
                      {isActiveGenerated && (() => {
                        const td = history.find(h => h.id === activeGroup.id)
                        return (
                          <div className="su-open-btns">
                            <button className="su-lbtn su-lbtn--stage1" onClick={() => onOpenGroup(activeGroup.id, 'groups')}>▶ Stage 1</button>
                            {td?.stage2 && <button className="su-lbtn su-lbtn--stage2" onClick={() => onOpenGroup(activeGroup.id, 'stage2')}>▶ Stage 2</button>}
                          </div>
                        )
                      })()}
                      <button className="su-gen-btn" onClick={() => {
                        if (isActiveGenerated) {
                          if (!confirm('Regenerating will reset all match scores. Continue?')) return
                        }
                        const resolvedGroupPlayers = activeGroup.players.map((p, i) => ({ ...p, name: p.name || `Player ${i+1}` }))
                        onGroupStart({ id: activeGroup.id, title: activeGroup.title, players: resolvedGroupPlayers, groupSize: activeGroup.size })
                      }}>
                        {isActiveGenerated ? 'Regenerate Groups' : 'Generate Groups'}
                      </button>
                      <span className="su-gen-meta">{activeGroup.players.length} players · {activeGroup.size}/group · tag-matched</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="su-reset-row">
        <button className="su-reset-btn" onClick={clearAll}>Reset all setup data</button>
      </div>

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
  )
}
