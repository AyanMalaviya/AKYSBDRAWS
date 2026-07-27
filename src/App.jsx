import React, { useState, useCallback, useEffect, useRef } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import GroupView from './components/GroupView.jsx'
import Dashboard from './components/Dashboard.jsx'
import Footer from './components/Footer.jsx'
import { generateBracket, generateStage2Elim, advanceWinnerStage2Elim } from './engine/bracketEngine.js'
import { generateGroups, reassignTagsByStandings } from './engine/groupEngine.js'
import { useHistory } from './hooks/useHistory.js'

const HOME_FRAME = { view: 'home', tournament: null, groups: null, stage2: null }

function pickByePlayer(players) {
  if (!players || players.length === 0) return null
  return [...players].sort((a, b) =>
    ((b.scoreDiff ?? b.sd ?? 0) - (a.scoreDiff ?? a.sd ?? 0)) ||
    ((b.wins      ?? 0)         - (a.wins      ?? 0))         ||
    ((b.scoredFor ?? b.gf ?? 0) - (a.scoredFor ?? a.gf ?? 0)) ||
    (a.name ?? '').localeCompare(b.name ?? '')
  )[0]
}

export default function App() {
  const [view, setView]             = useState('home')
  const [tournament, setTournament] = useState(null)
  const [groups, setGroups]         = useState(null)
  const [stage2, setStage2]         = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  const { history, upsertHistory, deleteEntry, deleteAll, archiveEntry } = useHistory()

  const stackRef = useRef([HOME_FRAME])
  const isPushingRef = useRef(false)

  const tournamentRef = useRef(tournament)
  const groupsRef     = useRef(groups)
  useEffect(() => { tournamentRef.current = tournament }, [tournament])
  useEffect(() => { groupsRef.current = groups }, [groups])

  const applyFrame = useCallback((frame) => {
    setView(frame.view)
    setTournament(frame.tournament)
    setGroups(frame.groups)
    setStage2(frame.stage2)
  }, [])

  const navigate = useCallback((newView, extra = {}) => {
    const frame = {
      view: newView,
      tournament: extra.tournament ?? null,
      groups:     extra.groups     ?? null,
      stage2:     extra.stage2     ?? null,
    }
    stackRef.current.push(frame)
    isPushingRef.current = true
    window.history.pushState({ depth: stackRef.current.length }, '')
    isPushingRef.current = false
    applyFrame(frame)
  }, [applyFrame])

  useEffect(() => {
    window.history.replaceState({ depth: 1 }, '')

    const handlePopState = () => {
      if (isPushingRef.current) return
      const stack = stackRef.current
      if (stack.length <= 1) {
        isPushingRef.current = true
        window.history.pushState({ depth: 1 }, '')
        isPushingRef.current = false
        return
      }
      stack.pop()
      const prev = stack[stack.length - 1]
      applyFrame(prev)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [applyFrame])

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  const handleHome = useCallback(() => {
    stackRef.current = [HOME_FRAME]
    window.history.replaceState({ depth: 1 }, '')
    applyFrame(HOME_FRAME)
  }, [applyFrame])

  const handleStart = ({ format, players }) => {
    const t = {
      id: Date.now().toString(), format, players,
      bracket: generateBracket(format, players),
      isArchived: true,
    }
    upsertHistory(t)
    stackRef.current = [HOME_FRAME]
    navigate('bracket', { tournament: t, groups: null, stage2: null })
  }

  const handleBracketUpdate = useCallback((updatedBracket) => {
    setTournament(prev => {
      const isFinished = !!updatedBracket.champion
      const u = { ...prev, bracket: updatedBracket }
      if (isFinished) u.isArchived = true
      upsertHistory(u)
      const stack = stackRef.current
      if (stack.length > 0) stack[stack.length - 1] = { ...stack[stack.length - 1], tournament: u }
      return u
    })
  }, [upsertHistory])

  const handleGroupStart = ({ id, title, players, groupSize }) => {
    const g = generateGroups(players, groupSize)
    const t = {
      id: id || Date.now().toString(), type: 'group',
      title: title || 'Group Draw', players, groupSize,
      groups: g, isArchived: false,
    }
    upsertHistory(t)
    stackRef.current = [HOME_FRAME]

    navigate('groups', { tournament: t, groups: g, stage2: null })
  }

  const handleGroupsUpdate = useCallback((updatedGroups) => {
    setGroups(updatedGroups)
    setTournament(prev => {
      if (!prev) return prev
      const u = { ...prev, groups: updatedGroups }
      upsertHistory(u)
      stackRef.current.forEach((f, i) => {
        if (f.view === 'groups') stackRef.current[i] = { ...f, groups: updatedGroups, tournament: u }
      })
      return u
    })
  }, [upsertHistory])

  const handleAdvanceToStage2 = useCallback((advancers, stage2Type = 'knockout') => {
    const currentTournament = tournamentRef.current
    const currentGroups     = groupsRef.current

    if (stage2Type === 'groups') {
      const seededAdvancers = reassignTagsByStandings(advancers)
      const groupSize = Math.max(3, Math.round(seededAdvancers.length / Math.max(2, Math.round(seededAdvancers.length / 4))))
      const newGroups = generateGroups(seededAdvancers, groupSize)
      const s2 = { type: 'groups', players: seededAdvancers, groups: newGroups, groupSize }
      setTournament(prev => {
        const u = { ...prev, stage2: s2, groups: newGroups }
        upsertHistory(u)
        stackRef.current.forEach((f, i) => {
          if (f.view === 'groups') stackRef.current[i] = { ...f, groups: newGroups, tournament: u }
        })
        return u
      })
      navigate('stage2', { groups: newGroups, stage2: s2 })
      return
    }

    const prevIds = currentTournament?.stage2?.players?.map(p => p.id).join(',') || ''
    const newIds  = advancers.map(p => p.id).join(',')
    if (currentTournament?.stage2 && currentTournament.stage2.type !== 'groups' && prevIds === newIds) {
      navigate('stage2', { tournament: currentTournament, groups: currentGroups, stage2: currentTournament.stage2 })
      return
    }

    let bracket = generateStage2Elim(advancers)

    if (bracket.pendingByeSelection) {
      const byePlayer = pickByePlayer(bracket.pendingByeSelection)
      if (byePlayer) {
        bracket = advanceWinnerStage2Elim(bracket, bracket.rounds.length - 1, null, null, byePlayer.id)
      }
    }

    const s2 = { type: 'knockout', players: advancers, bracket }
    setTournament(prev => {
      const u = { ...prev, stage2: s2 }
      upsertHistory(u)
      stackRef.current.forEach((f, i) => {
        if (f.view === 'groups') stackRef.current[i] = { ...f, tournament: u }
      })
      return u
    })
    navigate('stage2', { groups: currentGroups, stage2: s2 })
  }, [upsertHistory, navigate])

  const handleStage2BracketUpdate = useCallback((updatedBracket) => {
    let resolvedBracket = updatedBracket
    if (resolvedBracket.pendingByeSelection) {
      const byePlayer = pickByePlayer(resolvedBracket.pendingByeSelection)
      if (byePlayer) {
        resolvedBracket = advanceWinnerStage2Elim(
          resolvedBracket,
          resolvedBracket.rounds.length - 1,
          null, null,
          byePlayer.id
        )
      }
    }
    setStage2(prev => {
      const s2 = { ...prev, bracket: resolvedBracket }
      setTournament(t => {
        const isFinished = !!resolvedBracket.champion
        const u = { ...t, stage2: s2 }
        if (isFinished) u.isArchived = true
        upsertHistory(u)
        stackRef.current.forEach((f, i) => {
          if (f.view === 'stage2') stackRef.current[i] = { ...f, stage2: s2, tournament: u }
        })
        return u
      })
      return s2
    })
  }, [upsertHistory])

  const handleStage2GroupsUpdate = useCallback((updatedGroups) => {
    setGroups(updatedGroups)
    setStage2(prev => {
      const s2 = { ...prev, groups: updatedGroups }
      setTournament(t => {
        const u = { ...t, stage2: s2 }
        upsertHistory(u)
        stackRef.current.forEach((f, i) => {
          if (f.view === 'stage2') stackRef.current[i] = { ...f, stage2: s2, groups: updatedGroups, tournament: u }
        })
        return u
      })
      return s2
    })
  }, [upsertHistory])

  const handleAdvanceToStage3 = useCallback((advancers, stage2Type = 'knockout') => {
    const currentGroups = groupsRef.current
    if (stage2Type === 'groups') {
      const seededAdvancers = reassignTagsByStandings(advancers)
      const groupSize = Math.max(3, Math.round(seededAdvancers.length / Math.max(2, Math.round(seededAdvancers.length / 4))))
      const newGroups = generateGroups(seededAdvancers, groupSize)
      const s3 = { type: 'groups', players: seededAdvancers, groups: newGroups, groupSize }
      setTournament(prev => {
        const u = { ...prev, stage2: s3, groups: newGroups }
        upsertHistory(u)
        return u
      })
      navigate('stage2', { groups: newGroups, stage2: s3 })
      return
    }
    let bracket = generateStage2Elim(advancers)
    if (bracket.pendingByeSelection) {
      const byePlayer = pickByePlayer(bracket.pendingByeSelection)
      if (byePlayer) bracket = advanceWinnerStage2Elim(bracket, bracket.rounds.length - 1, null, null, byePlayer.id)
    }
    const s3 = { type: 'knockout', players: advancers, bracket }
    setTournament(prev => {
      const u = { ...prev, stage2: s3 }
      upsertHistory(u)
      return u
    })
    navigate('stage2', { groups: currentGroups, stage2: s3 })
  }, [upsertHistory, navigate])

  const handleRestore = useCallback((entry, targetView = 'groups') => {
    stackRef.current = [HOME_FRAME]
    window.history.replaceState({ depth: 1 }, '')

    if (entry.type === 'group') {
      const hasStage2  = !!(entry.stage2)
      const gGroups    = entry.groups || null
      const gStage2    = entry.stage2 || null

      const groupsFrame = { view: 'groups', tournament: entry, groups: gGroups, stage2: null }
      stackRef.current.push(groupsFrame)
      isPushingRef.current = true
      window.history.pushState({ depth: stackRef.current.length }, '')
      isPushingRef.current = false

      if (hasStage2 && targetView === 'stage2') {
        const stage2Frame = { view: 'stage2', tournament: entry, groups: gGroups, stage2: gStage2 }
        stackRef.current.push(stage2Frame)
        isPushingRef.current = true
        window.history.pushState({ depth: stackRef.current.length }, '')
        isPushingRef.current = false
        applyFrame(stage2Frame)
      } else {
        applyFrame(groupsFrame)
      }
    } else {
      const bracketFrame = { view: 'bracket', tournament: entry, groups: null, stage2: null }
      stackRef.current.push(bracketFrame)
      isPushingRef.current = true
      window.history.pushState({ depth: stackRef.current.length }, '')
      isPushingRef.current = false
      applyFrame(bracketFrame)
    }
  }, [applyFrame])

  const handleDashboard = useCallback(() => {
    navigate('dashboard', { tournament, groups, stage2 })
  }, [navigate, tournament, groups, stage2])


  const topFrame      = stackRef.current[stackRef.current.length - 1]
  const renderGroups  = topFrame?.view === 'groups'  ? (topFrame.groups  ?? groups)  : groups
  const renderStage2  = topFrame?.view === 'stage2'  ? (topFrame.stage2  ?? stage2)  : stage2

  const s2BannerStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'linear-gradient(90deg, rgba(212,160,23,0.08), rgba(139,92,246,0.06))',
    border: '1px solid rgba(212,160,23,0.28)',
    borderRadius: 12, padding: '12px 20px', marginBottom: 16,
  }

  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-brand" onClick={handleHome}>
          <div>
            <div className="brand-name">Tournament <span className="brand-accent">Draws</span></div>
            <div className="brand-sub">Draw Manager</div>
          </div>
        </div>
        <nav className="topnav-nav">
          {deferredPrompt && (
            <button className="nav-pill nav-install-btn" onClick={handleInstallClick}>
              <span className="hide-mob">⭐ Install </span>App
            </button>
          )}
          <button
            className={`nav-pill${view !== 'dashboard' ? ' active' : ''}`}
            onClick={handleHome}
          >
            <span className="hide-mob">New </span>Draw
          </button>
          <button
            className={`nav-pill${view === 'dashboard' ? ' active' : ''}`}
            onClick={handleDashboard}
          >
            History {history.filter(h => h.isArchived).length > 0 &&
              <span className="nav-count">{history.filter(h => h.isArchived).length}</span>}
          </button>
        </nav>
      </header>

      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard history={history} onRestore={handleRestore} onDelete={deleteEntry} onDeleteAll={deleteAll} />
        )}

        {view === 'home' && (
          <Setup
            onStart={handleStart}
            onGroupStart={handleGroupStart}
            onArchiveGroup={archiveEntry}
            onOpenGroup={(id, targetView = 'groups') => {
              const entry = history.find(e => e.id === id)
              if (entry) handleRestore(entry, targetView)
              else alert('Tournament data not found in history.')
            }}
            history={history}
          />
        )}

        {view === 'bracket' && tournament && (
          <BracketView tournament={tournament} onUpdate={handleBracketUpdate} onReset={handleHome} />
        )}

        {view === 'groups' && renderGroups && (
          <GroupView
            groups={renderGroups}
            onGroupsUpdate={handleGroupsUpdate}
            onBack={handleHome}
            onAdvanceToStage2={handleAdvanceToStage2}
            hasStage2={!!(tournament?.stage2)}/>
        )}

        {view === 'stage2' && renderStage2 && (
          <div>
            <div style={s2BannerStyle}>
              <span style={{ fontSize: 24 }}>🏆</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--gold-light)' }}>
                  Stage 2 — {renderStage2.type === 'groups' ? 'New Groups' : 'Knockout'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {renderStage2.players.length} players advancing
                </div>
              </div>
              <button
                onClick={() => window.history.back()}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'var(--muted)',
                  padding: '6px 14px', borderRadius: 8,
                  cursor: 'pointer', fontSize: 13,
                }}
              >🔙 Stage 1</button>
            </div>

            {renderStage2.type === 'groups' && renderStage2.groups && (
              <GroupView
                groups={renderStage2.groups}
                onGroupsUpdate={handleStage2GroupsUpdate}
                onBack={() => window.history.back()}
                onAdvanceToStage2={handleAdvanceToStage3}
                hasStage2={false}
              />
            )}

            {renderStage2.type === 'knockout' && renderStage2.bracket && (
              <BracketView
                tournament={{
                  id: (tournament?.id || 'stage2') + '_s2',
                  format: 'stage2_elim',
                  players: renderStage2.players,
                  bracket: renderStage2.bracket,
                }}
                onUpdate={handleStage2BracketUpdate}
                onReset={handleHome}
              />
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
