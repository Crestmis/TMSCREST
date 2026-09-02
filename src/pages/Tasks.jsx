import { useEffect, useMemo, useState } from 'react'
import {
  RefreshCw,
  Search,
  Filter,
  CheckSquare,
  Square,
  CalendarDays,
  Users,
  Plus
} from 'lucide-react'

import PageHeader from '../components/PageHeader'
import TaskRow from '../components/TaskRow'
import CompletionDrawer from '../components/CompletionDrawer'
import {
  fetchChecklist,
  visibleToUser
} from '../services/tasks'

export default function Tasks({ session, refresh, setPage, setAssignHint }) {
  // Anyone who can open this page (Viewer / Editor / Full Access) may select and submit tasks.
  const checklistAccess = String(session?.access?.['Checklist'] ?? session?.access?.['Tasks List'] ?? 'None')
  const canEdit = session?.isAdmin || (checklistAccess !== 'None' && checklistAccess !== '')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [doer, setDoer] = useState('all')
  const [date, setDate] = useState('')

  const [selected, setSelected] = useState(new Set())
  const [drawer, setDrawer] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const checklist = await fetchChecklist()

      setTasks(
        visibleToUser(
          checklist,
          session
        )
      )

      setSelected(new Set())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [refresh, session.username])

  const week = useMemo(() => {
    const now = new Date()
    const day = now.getDay()

    const monday = new Date(now)

    monday.setDate(
      now.getDate() - (day === 0 ? 6 : day - 1)
    )

    monday.setHours(0, 0, 0, 0)

    const saturday = new Date(monday)

    saturday.setDate(
      monday.getDate() + 5
    )

    return {
      monday,
      saturday
    }
  }, [])

  const doers = useMemo(() => {
    return [
      ...new Set(
        tasks
          .map(t => t.assignee)
          .filter(Boolean)
      )
    ].sort((a, b) => a.localeCompare(b))
  }, [tasks])

  const filtered = useMemo(() => {
    return tasks
      .filter(t => {
        const live =
          t.liveStatus ||
          t.status ||
          'Pending'

        return (
          (status === 'all' ||
            String(live).toLowerCase() === status) &&

          (doer === 'all' ||
            t.assignee === doer) &&

          (!date ||
            t.plannedISO === date) &&

          (!q ||
            `${t.title} ${t.assignee} ${t.givenBy} ${t.id}`
              .toLowerCase()
              .includes(q.toLowerCase()))
        )
      })
      .sort((a, b) =>
        (a.plannedISO || '9999')
          .localeCompare(b.plannedISO || '9999')
      )
  }, [
    tasks,
    q,
    status,
    doer,
    date
  ])

  const pending = canEdit ? filtered.filter(
    t =>
      String(
        t.liveStatus || t.status
      ).toLowerCase() !== 'done'
  ) : []

  const summary = useMemo(() => {
    const s = { total: filtered.length, pending: 0, overdue: 0, done: 0 }
    filtered.forEach(t => {
      const st = String(t.liveStatus || t.status || 'Pending').toLowerCase()
      if (st === 'done') s.done++
      else if (st === 'overdue') s.overdue++
      else s.pending++
    })
    return s
  }, [filtered])

  const allSelected =
    pending.length > 0 &&
    pending.every(
      t =>
        selected.has(
          `${t.type}:${t.id}`
        )
    )

  const toggle = t => {
    setSelected(prev => {
      const next = new Set(prev)

      const key = `${t.type}:${t.id}`

      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }

      return next
    })
  }

  const toggleAll = () => {
    setSelected(
      allSelected
        ? new Set()
        : new Set(
            pending.map(
              t => `${t.type}:${t.id}`
            )
          )
    )
  }

  const selectedTasks = filtered.filter(
    t =>
      selected.has(
        `${t.type}:${t.id}`
      )
  )

  return (
    <>
      <PageHeader
        title="Checklist"
        subtitle={`All checklist work. Current work week: ${week.monday.toLocaleDateString(
          'en-IN',
          {
            day: '2-digit',
            month: 'short'
          }
        )}–${week.saturday.toLocaleDateString(
          'en-IN',
          {
            day: '2-digit',
            month: 'short'
          }
        )}. Sundays are skipped. Delegated work is on the Delegation page.`}
        action={
          <div className="header-actions">
            <button
              className="secondary-btn"
              onClick={load}
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            {canEdit && setPage && (
              <button
                className="primary-btn"
                onClick={() => { setAssignHint?.('checklist'); setPage('assign') }}
              >
                <Plus size={15} />
                Assign Task
              </button>
            )}

            {selectedTasks.length > 0 && (
              <button
                className="primary-btn"
                onClick={() =>
                  setDrawer(selectedTasks)
                }
              >
                <CheckSquare size={15} />
                Submit Selected (
                {selectedTasks.length}
                )
              </button>
            )}
          </div>
        }
      />

      <div className="toolbar task-filters">

        <div className="search-box">
          <Search size={16} />

          <input
            value={q}
            onChange={e =>
              setQ(e.target.value)
            }
            placeholder="Search task, doer or ID..."
          />
        </div>

        <label className="filter-field">
          <Users size={14} />

          <select
            value={doer}
            onChange={e =>
              setDoer(e.target.value)
            }
          >
            <option value="all">
              All Doers
            </option>

            {doers.map(x => (
              <option key={x}>
                {x}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <CalendarDays size={14} />

          <input
            type="date"
            value={date}
            onChange={e =>
              setDate(e.target.value)
            }
            title="Filter by planned date"
          />
        </label>

        <select
          value={status}
          onChange={e =>
            setStatus(e.target.value)
          }
        >
          <option value="all">
            All Status
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="overdue">
            Overdue
          </option>

          <option value="done">
            Done
          </option>
        </select>

        <button
          className="secondary-btn"
          onClick={() => {
            setQ('')
            setStatus('all')
            setDoer('all')
            setDate('')
            setSelected(new Set())
          }}
        >
          <Filter size={15} />
          Clear
        </button>

      </div>

      {error && (
        <div className="error-box page-error">
          {error}
        </div>
      )}

      <div className="panel">

        <div className="delegation-summary">
          <div><span>Visible tasks</span><b>{summary.total}</b></div>
          <div><span>Pending</span><b>{summary.pending}</b></div>
          <div><span>Overdue</span><b>{summary.overdue}</b></div>
          <div><span>Done</span><b>{summary.done}</b></div>
        </div>

        <div className="selection-bar">

          <button
            className="select-all-btn"
            onClick={toggleAll}
            disabled={!pending.length}
          >
            {allSelected ? (
              <CheckSquare size={17} />
            ) : (
              <Square size={17} />
            )}

            <b>
              {allSelected
                ? 'Clear All'
                : 'Select All'}
            </b>

            <span>
              {selectedTasks.length} selected
            </span>
          </button>

          <small>{canEdit ? `${pending.length} selectable` : 'View only'}</small>

        </div>

        {loading ? (
          <div className="loading-box">
            Loading tasks…
          </div>
        ) : filtered.length ? (
          filtered.map(t => (
            <TaskRow
              key={`${t.type}-${t.id}-${t.row}`}
              task={t}
              selected={selected.has(
                `${t.type}:${t.id}`
              )}
              onSelect={canEdit?toggle:undefined}
              selectable={canEdit}
              onComplete={canEdit ? (task => setDrawer([task])) : undefined}
            />
          ))
        ) : (
          <div className="empty-box">
            No matching tasks found.
          </div>
        )}

      </div>

      {drawer && (
        <CompletionDrawer
          tasks={drawer}
          onClose={() =>
            setDrawer(null)
          }
          onDone={() => {
            setDrawer(null)
            load()
          }}
        />
      )}
    </>
  )
}
