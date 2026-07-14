import React, { useState, useCallback, useEffect } from 'react'
import Setup from './components/Setup.jsx'
import BracketView from './components/BracketView.jsx'
import GroupView from './components/GroupView.jsx'
import Dashboard from './components/Dashboard.jsx'
import Footer from './components/Footer.jsx'
import { generateBracket } from './engine/bracketEngine.js'
import { generateGroups } from './engine/groupEngine.js'
import { useHistory } from './hooks/useHistory.js'

export default function App() {
  const [view, setView]             = useState('home')
  const [tournament, setTournament] = useState(null)
  const [groups, setGroups]         = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const { history, upsertHistory, deleteEntry, deleteAll, restoreEntry, archiveEntry } = useHistory()

  // ── PWA Install Logic ──
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // ── Bracket mode ──
  const handleStart = ({ format, players }) => {
    const t = {
      id: Date.now().toString(),
      format, players,
      bracket: generateBracket(format, players),
      isArchived: true
    }
    setTournament(t)
    upsertHistory(t)
    setGroups(null)
    setView('bracket')
  }

  const handleBracketUpdate = useCallback((updatedBracket) => {
    setTournament(prev => {
      const updated = { ...prev, bracket: updatedBracket }
      upsertHistory(updated)
      return updated
    })
  }, [upsertHistory])

// ── Group mode ──
  const handleGroupStart = ({ id, title, players, groupSize }) => {
    const g = generateGroups(players, groupSize)
    const t = {
      id: id || Date.now().toString(),
      type: 'group',
      title: title || 'Group Draw',
      players,
      groupSize,
      groups: g,
      isArchived: false 
    }
    setTournament(t)
    setGroups(g)
    upsertHistory(t)
    setView('groups')
  }

  const handleGroupsUpdate = useCallback((updatedGroups) => {
    setGroups(updatedGroups)
    setTournament(prev => {
      if (!prev) return prev
      const updated = { ...prev, groups: updatedGroups }
      upsertHistory(updated)
      return updated
    })
  }, [upsertHistory])

  // ── History restore ──
  const handleRestore = (entry) => {
    setTournament(entry)
    if (entry.type === 'group') {
      setGroups(entry.groups)
      setView('groups')
    } else {
      setGroups(null)
      setView('bracket')
    }
  }

  const handleHome  = () => { setTournament(null); setGroups(null); setView('home') }

  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-brand" onClick={handleHome}>
          {/* Replaced trophy icon with the new circular logo */}
          <img 
            src="/AKYSBLogoCircle.png" 
            alt="AKYSB Logo" 
            style={{ 
              height: '40px', 
              width: '40px', 
              borderRadius: '50%', 
              boxShadow: '0 0 12px rgba(0, 212, 255, 0.4)' 
            }} 
          />
          <div>
            <div className="brand-name">AKYSB <span className="brand-accent">DRAWS</span></div>
            <div className="brand-sub">Tournament Draw Manager</div>
          </div>
        </div>
        <nav className="topnav-nav">
          {deferredPrompt && (
            <button className="nav-pill nav-install-btn" onClick={handleInstallClick}>
              <span className="hide-mob">↓ Install </span>App
            </button>
          )}
          <button className={`nav-pill${view !== 'dashboard' ? ' active' : ''}`} onClick={handleHome}>
            <span className="hide-mob">New </span>Draw
          </button>
          <button className={`nav-pill${view === 'dashboard' ? ' active' : ''}`} onClick={() => setView('dashboard')}>
            History {history.filter(h => h.isArchived).length > 0 && <span className="nav-count">{history.filter(h => h.isArchived).length}</span>}
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
            onOpenGroup={(id) => {
              const entry = history.find(e => e.id === id)
              if (entry) {
                handleRestore(entry)
              } else {
                alert("Tournament data not found in history. It may have been cleared.")
              }
            }}
            history={history}
          />
        )}
        {view === 'bracket' && tournament && (
          <BracketView tournament={tournament} onUpdate={handleBracketUpdate} onReset={handleHome} />
        )}
        {view === 'groups' && groups && (
          <GroupView groups={groups} onGroupsUpdate={handleGroupsUpdate} onBack={handleHome} />
        )}
      </main>
      <Footer />
    </div>
  )
}