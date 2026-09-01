import { useEffect, useMemo, useState } from 'react'
import {
  RefreshCw,
  Search,
  Filter,
  CheckSquare,
  Square,
  CalendarDays,
  Users
} from 'lucide-react'

import PageHeader from '../components/PageHeader'
import TaskRow from '../components/TaskRow'
import CompletionDrawer from '../components/CompletionDrawer'
import {
  fetchChecklist,
  fetchDelegation,
  visibleToUser
} from '../services/tasks'

export default function Tasks({ session, refresh }) {
  const canEdit = session?.isAdmin || ['Editor','Full Access'].includes(session?.access?.['Tasks List'])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [doer, setDoer] = useState('all')
  const [date, setDate] = useState('')

  const [selected, setSelected] = useState(new Set())
  const [drawer, setDrawer] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const [c, d] = await Promise.all([
        fetchChecklist(),
        fetchDelegation()
      ])

      setTasks(
        visibleToUser(
          [...c, ...d],
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
          (type === 'all' ||
            t.type.toLowerCase() === type) &&

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
    type,
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
        title="Tasks List"
        subtitle={`All checklist and delegation work. Current work week: ${week.monday.toLocaleDateString(
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
        )}. Sundays are skipped.`}
        action={
          <div className="header-actions">
            <button
              className="secondary-btn"
              onClick={load}
            >
              <RefreshCw size={15} />
              Refresh
            </button>

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
          value={type}
          onChange={e =>
            setType(e.target.value)
          }
        >
          <option value="all">
            All Types
          </option>

          <option value="checklist">
            Checklist
          </option>

          <option value="delegation">
            Delegation
          </option>
        </select>

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
            setType('all')
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
    </>
  )
}