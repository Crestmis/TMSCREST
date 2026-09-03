import { useState } from 'react'
import { Bell, Search, Menu, LogOut, Moon, Sun } from 'lucide-react'

function applyTheme(dark) {
  const el = document.documentElement
  if (dark) el.setAttribute('data-theme', 'dark')
  else el.removeAttribute('data-theme')
  try { localStorage.setItem('crest_theme', dark ? 'dark' : 'light') } catch { /* ignore */ }
}

export default function Topbar({ onMenu, session, onLogout }) {
  const [dark, setDark] = useState(() => {
    try { return document.documentElement.getAttribute('data-theme') === 'dark' } catch { return false }
  })
  const toggleTheme = () => { const next = !dark; setDark(next); applyTheme(next) }

  return (
    <header className="topbar">
      <button className="icon-btn mobile-only" onClick={onMenu}><Menu size={20} /></button>
      <div className="top-search">
        <Search size={17} />
        <input placeholder="Search tasks, people or data..." />
      </div>
      <div className="top-actions">
        <button className="icon-btn theme-toggle" title={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-btn"><Bell size={18} /></button>
        <div className="avatar">{session?.username?.slice(0, 2).toUpperCase()}</div>
        <div className="profile"><b>{session?.username}</b><small>{session?.role}</small></div>
        <button className="icon-btn" title="Sign out" onClick={onLogout}><LogOut size={17} /></button>
      </div>
    </header>
  )
}
