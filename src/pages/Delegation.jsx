import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Search, Filter, CalendarDays, Users, CheckSquare, Square } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import TaskRow from '../components/TaskRow'
import CompletionDrawer from '../components/CompletionDrawer'
import CollapsibleControls from '../components/CollapsibleControls'
import { fetchDelegation, fetchDelegationHistory, visibleToUser, isFuturePlanned } from '../services/tasks'
import { normalize, localISO } from '../services/sheets'

export default function Delegation({ session, setPage, refresh, onChanged, setAssignHint }) {
  // Anyone who can open this page (Viewer / Editor / Full Access) may select and submit tasks.
  const delegationAccess = String(session?.access?.Delegation ?? 'None')
  const canEdit = session?.isAdmin || (delegationAccess !== 'None' && delegationAccess !== '')

  const [current, setCurrent] = useState([])
  const [history, setHistory] = useState([])
  const [tab, setTab] = useState('current')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [doer, setDoer] = useState('all')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('all')

  const [selected, setSelected] = useState(new Set())
  const [drawer, setDrawer] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [a, b] = await Promise.all([fetchDelegation(), fetchDelegationHistory()])
      const today = localISO()
      const isFinished = t => ['done', 'delay'].includes(String(t.liveStatus || t.status).toLowerCase())
      // "Current" = this user's due delegations (future-dated ones stay hidden),
      // PLUS anything completed today — shown ticked until local midnight, then
      // it moves to the History tab.
      setCurrent(visibleToUser(a, session).filter(t =>
        isFinished(t) ? t.actualISO === today : !isFuturePlanned(t)
      ))
      setHistory(visibleToUser(b, session).filter(t => t.actualISO !== today))
      setSelected(new Set())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [refresh, session.username])

  const doers = useMemo(() => {
    const seen = new Map()
    ;[...current, ...history].forEach(t => {
      const a = String(t.assignee || '').trim()
      if (a && !seen.has(a.toLowerCase())) seen.set(a.toLowerCase(), a)
    })
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }, [current, history])

  const list = useMemo(() => {
    return (tab === 'current' ? current : history).filter(t => {
      const live = String(t.liveStatus || t.status || 'Pending').toLowerCase()
      return (
        (!q || `${t.title} ${t.assignee} ${t.givenBy} ${t.id}`.toLowerCase().includes(q.toLowerCase())) &&
        (doer === 'all' || normalize(t.assignee) === normalize(doer)) &&
        (status === 'all' || live === status) &&
        (!date || t.plannedISO === date || t.actualISO === date)
      )
    })
  }, [tab, current, history, q, doer, date, status])

  const pending = canEdit ? list.filter(t => String(t.liveStatus || t.status).toLowerCase() !== 'done') : []
  const allSelected = pending.length > 0 && pending.every(t => selected.has(`${t.type}:${t.id}`))

  const toggle = t => setSelected(prev => {
    const n = new Set(prev)
    const k = `${t.type}:${t.id}`
    n.has(k) ? n.delete(k) : n.add(k)
    return n
  })
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pending.map(t => `${t.type}:${t.id}`)))
  const selectedTasks = list.filter(t => selected.has(`${t.type}:${t.id}`))

  const clearFilters = () => { setDoer('all'); setDate(''); setStatus('all'); setSelected(new Set()) }
  const activeCount = (doer !== 'all' ? 1 : 0) + (date ? 1 : 0) + (status !== 'all' ? 1 : 0)

  return (
    <>
      <PageHeader
        title="Delegation"
        subtitle="Assign, monitor and submit delegated work."
        action={
          <div className="header-actions">
            <button className="secondary-btn" onClick={load}><RefreshCw size={15} /> Refresh</button>
            <button style={{ display: canEdit ? 'inline-flex' : 'none' }} className="primary-btn" onClick={() => { setAssignHint?.('delegation'); setPage('assign') }}>
              <Plus size={15} /> Assign Task
            </button>
            {selectedTasks.length > 0 && tab === 'current' && (
              <button className="primary-btn" onClick={() => canEdit && setDrawer(selectedTasks)}>
                <CheckSquare size={15} /> Submit Selected ({selectedTasks.length})
              </button>
            )}
          </div>
        }
      />

      <div className="mini-tabs">
        <button className={tab === 'current' ? 'active' : ''} onClick={() => { setTab('current'); setSelected(new Set()) }}>Current</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => { setTab('history'); setSelected(new Set()) }}>History</button>
      </div>

      <div className="toolbar task-filters">
        <div className="search-box">
          <Search size={16} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search task, doer or ID..." />
        </div>
      </div>

      <CollapsibleControls activeCount={activeCount} onClear={clearFilters}>
        <div className="delegation-summary">
          <div><span>Visible tasks</span><b>{current.length}</b></div>
          <div><span>Pending</span><b>{current.filter(x => String(x.liveStatus || x.status).toLowerCase() !== 'done').length}</b></div>
          <div><span>History</span><b>{history.length}</b></div>
          <div><span>Showing</span><b>{list.length}</b></div>
        </div>
        <div className="toolbar task-filters">
          <label className="filter-field">
            <Users size={14} />
            <select value={doer} onChange={e => setDoer(e.target.value)}>
              <option value="all">All Doers</option>
              {doers.map(x => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <CalendarDays size={14} />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} title="Filter by planned / actual date" />
          </label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="delay">Delay</option>
            <option value="done">Done</option>
          </select>
        </div>
      </CollapsibleControls>

      {error && <div className="error-box page-error">{error}</div>}

      <div className="panel">

        {tab === 'current' && (
          <div className="selection-bar">
            <button className="select-all-btn" onClick={toggleAll} disabled={!pending.length}>
              {allSelected ? <CheckSquare size={17} /> : <Square size={17} />}
              <b>{allSelected ? 'Clear All' : 'Select All'}</b>
              <span>{selectedTasks.length} selected</span>
            </button>
            <small>{canEdit ? `${pending.length} selectable` : 'View only'}</small>
          </div>
        )}

        {loading ? (
          <div className="loading-box">Loading delegation…</div>
        ) : list.length ? (
          list.map(t => (
            <TaskRow
              key={`${t.id}-${t.row}-${tab}`}
              task={t}
              selectable={tab === 'current' && canEdit}
              selected={selected.has(`${t.type}:${t.id}`)}
              onSelect={canEdit ? toggle : undefined}
              onComplete={canEdit && tab === 'current' ? task => setDrawer([task]) : undefined}
            />
          ))
        ) : (
          <div className="empty-box">No delegation records found.</div>
        )}
      </div>

      {drawer && (
        <CompletionDrawer
          tasks={drawer}
          onClose={() => setDrawer(null)}
          onDone={() => { setDrawer(null); load(); onChanged?.() }}
        />
      )}
    </>
  )
}
