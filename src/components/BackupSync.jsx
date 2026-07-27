import React, { useState, useRef } from 'react'
import { get, set } from 'idb-keyval'

const KEY = 'akysbdraws_history'
const MAX_HISTORY = 30

// --- Merge logic ---
// Merges incoming entries with local ones.
// If total exceeds MAX_HISTORY, drop oldest (by savedAt) non-archived first, then oldest archived.
function mergeHistories(local, incoming) {
  const map = new Map()

  // Local first so incoming can overwrite with newer savedAt
  for (const e of local) map.set(e.id, e)
  for (const e of incoming) {
    const existing = map.get(e.id)
    if (!existing) {
      map.set(e.id, e)
    } else {
      // Keep whichever was saved more recently
      const localDate = new Date(existing.savedAt || 0)
      const incomingDate = new Date(e.savedAt || 0)
      if (incomingDate >= localDate) map.set(e.id, e)
    }
  }

  let merged = Array.from(map.values())

  // Sort: newest savedAt first
  merged.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0))

  // Trim to MAX_HISTORY — drop oldest non-archived first, then oldest archived
  if (merged.length > MAX_HISTORY) {
    const keep = merged.slice(0, MAX_HISTORY)
    return keep
  }
  return merged
}

export default function BackupSync({ history, onHistoryChange }) {
  const [modal, setModal] = useState(null) // null | 'download' | 'upload'
  const [uploadStatus, setUploadStatus] = useState(null) // null | 'success' | 'error'
  const [uploadMsg, setUploadMsg] = useState('')
  const [mergePreview, setMergePreview] = useState(null)
  const fileRef = useRef(null)

  // --- Download backup ---
  const handleDownload = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tournaments: history,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().slice(0, 10)
    a.download = `akysbdraws-backup-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- Upload & merge ---
  const handleFileChange = async (e) => {
    setUploadStatus(null)
    setMergePreview(null)
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)

      let incoming = []
      if (Array.isArray(parsed)) {
        incoming = parsed
      } else if (parsed?.tournaments && Array.isArray(parsed.tournaments)) {
        incoming = parsed.tournaments
      } else {
        throw new Error('Invalid backup format')
      }

      const currentRaw = await get(KEY)
      const current = currentRaw ? JSON.parse(currentRaw) : []
      const merged = mergeHistories(current, incoming)

      const added = merged.filter(m => !current.find(c => c.id === m.id)).length
      const updated = merged.filter(m => {
        const old = current.find(c => c.id === m.id)
        return old && old.savedAt !== m.savedAt
      }).length
      const removed = current.length + incoming.filter(i => !current.find(c => c.id === i.id)).length - merged.length

      setMergePreview({ merged, added, updated, removed: Math.max(0, removed) })
    } catch (err) {
      setUploadStatus('error')
      setUploadMsg(err.message || 'Could not read backup file.')
    }

    // reset input so same file can be selected again
    e.target.value = ''
  }

  const confirmMerge = async () => {
    if (!mergePreview) return
    try {
      await set(KEY, JSON.stringify(mergePreview.merged))
      onHistoryChange(mergePreview.merged)
      setUploadStatus('success')
      setUploadMsg(
        `Merged! ${mergePreview.added} added, ${mergePreview.updated} updated` +
        (mergePreview.removed > 0 ? `, ${mergePreview.removed} trimmed (limit ${MAX_HISTORY})` : '') + '.'
      )
      setMergePreview(null)
    } catch {
      setUploadStatus('error')
      setUploadMsg('Failed to save merged data.')
    }
  }

  const closeModal = () => {
    setModal(null)
    setUploadStatus(null)
    setUploadMsg('')
    setMergePreview(null)
  }

  return (
    <>
      {/* Navbar buttons */}
      <button
        className="nav-pill"
        title="Download backup"
        onClick={() => setModal('download')}
      >
        <span style={{ fontSize: 14 }}>💾</span>
        <span className="hide-mob"> Backup</span>
      </button>
      <button
        className="nav-pill"
        title="Upload & merge backup"
        onClick={() => { setModal('upload'); setUploadStatus(null); setUploadMsg(''); setMergePreview(null) }}
      >
        <span style={{ fontSize: 14 }}>📂</span>
        <span className="hide-mob"> Restore</span>
      </button>

      {/* Modal backdrop */}
      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.72)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{
            background: 'var(--surface, #1a1a2e)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16,
            padding: '28px 24px',
            maxWidth: 480,
            width: '100%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            position: 'relative',
          }}>
            {/* Close */}
            <button
              onClick={closeModal}
              style={{
                position: 'absolute', top: 14, right: 16,
                background: 'none', border: 'none',
                color: 'var(--muted)', fontSize: 22, cursor: 'pointer',
                lineHeight: 1,
              }}
              aria-label="Close"
            >×</button>

            {/* ---- DOWNLOAD MODAL ---- */}
            {modal === 'download' && (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💾</div>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Download Backup</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
                  Exports all <strong style={{ color: 'var(--gold-light)' }}>{history.length}</strong> tournament{history.length !== 1 ? 's' : ''} as a JSON file.
                </p>

                {/* How-to transfer section */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 20,
                  fontSize: 13,
                  color: 'var(--muted)',
                  lineHeight: 1.7,
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontSize: 13 }}>📲 How to transfer to another device</div>
                  <ol style={{ paddingLeft: 18, margin: 0 }}>
                    <li><strong style={{ color: 'var(--text)' }}>Download</strong> the backup file using the button below.</li>
                    <li>Share it via <strong style={{ color: 'var(--text)' }}>Nearby Share</strong> (Android/Windows) or <strong style={{ color: 'var(--text)' }}>AirDrop</strong> (Apple) or any messenger/email.</li>
                    <li>On the other device, open the <strong style={{ color: 'var(--text)' }}>AKYS Draws</strong> app and tap <strong style={{ color: 'var(--text)' }}>📂 Restore</strong> in the navbar.</li>
                    <li>Select the received JSON file — it will <strong style={{ color: 'var(--gold-light)' }}>merge</strong> with existing data, keeping both devices' tournaments.</li>
                    <li>If the total exceeds <strong style={{ color: 'var(--text)' }}>30 tournaments</strong>, the oldest ones are removed automatically.</li>
                  </ol>
                </div>

                <button
                  onClick={handleDownload}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    background: 'var(--accent, #7c3aed)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                    letterSpacing: 0.3,
                  }}
                >
                  ⬇ Download Backup ({history.length} tournament{history.length !== 1 ? 's' : ''})
                </button>
              </>
            )}

            {/* ---- UPLOAD MODAL ---- */}
            {modal === 'upload' && (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Restore / Merge Backup</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
                  Select a <code style={{ color: 'var(--gold-light)', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '1px 5px' }}>.json</code> backup file.
                  It will be <strong style={{ color: 'var(--text)' }}>merged</strong> with your current data — no overwriting.
                  Newer versions of the same tournament win. If total exceeds 30, oldest are trimmed.
                </p>

                {/* Upload area */}
                {!mergePreview && uploadStatus !== 'success' && (
                  <div
                    style={{
                      border: '2px dashed rgba(255,255,255,0.15)',
                      borderRadius: 10,
                      padding: '28px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      marginBottom: 16,
                      transition: 'border-color 0.18s',
                    }}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const file = e.dataTransfer.files?.[0]
                      if (file) {
                        const fakeEvent = { target: { files: [file], value: '' }, preventDefault: () => {} }
                        handleFileChange(fakeEvent)
                      }
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                    <div style={{ fontSize: 14, color: 'var(--muted)' }}>Tap to select or drag & drop a backup file</div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint, #555)', marginTop: 4 }}>.json files only</div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".json,application/json"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </div>
                )}

                {/* Error */}
                {uploadStatus === 'error' && (
                  <div style={{
                    background: 'rgba(220,38,38,0.12)',
                    border: '1px solid rgba(220,38,38,0.3)',
                    borderRadius: 8, padding: '10px 14px',
                    color: '#fca5a5', fontSize: 13, marginBottom: 12,
                  }}>
                    ❌ {uploadMsg}
                  </div>
                )}

                {/* Success */}
                {uploadStatus === 'success' && (
                  <div style={{
                    background: 'rgba(34,197,94,0.10)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    borderRadius: 8, padding: '14px',
                    color: '#86efac', fontSize: 14, marginBottom: 16, textAlign: 'center',
                  }}>
                    ✅ {uploadMsg}
                    <div style={{ marginTop: 12 }}>
                      <button
                        onClick={closeModal}
                        style={{
                          background: 'rgba(34,197,94,0.15)',
                          border: '1px solid rgba(34,197,94,0.3)',
                          color: '#86efac',
                          borderRadius: 8, padding: '8px 20px',
                          cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        }}
                      >Done</button>
                    </div>
                  </div>
                )}

                {/* Merge preview */}
                {mergePreview && (
                  <div style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: '14px 16px', marginBottom: 16,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Merge Preview</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                      <div style={{ textAlign: 'center', background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '8px 4px' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#86efac' }}>{mergePreview.added}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Added</div>
                      </div>
                      <div style={{ textAlign: 'center', background: 'rgba(251,191,36,0.08)', borderRadius: 8, padding: '8px 4px' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#fde68a' }}>{mergePreview.updated}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Updated</div>
                      </div>
                      <div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 4px' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#fca5a5' }}>{mergePreview.removed}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Trimmed</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                      Result: <strong style={{ color: 'var(--text)' }}>{mergePreview.merged.length}</strong> tournaments total
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={confirmMerge}
                        style={{
                          flex: 1, padding: '10px 0',
                          background: 'var(--accent, #7c3aed)',
                          color: '#fff', border: 'none',
                          borderRadius: 8, fontWeight: 700,
                          fontSize: 14, cursor: 'pointer',
                        }}
                      >✅ Confirm Merge</button>
                      <button
                        onClick={() => setMergePreview(null)}
                        style={{
                          padding: '10px 16px',
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--muted)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8, fontWeight: 600,
                          fontSize: 13, cursor: 'pointer',
                        }}
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
