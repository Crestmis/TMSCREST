import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock, RefreshCw, Plus, Pencil, Trash2, Search, Users, Save,
  CheckCircle2, Lock, PlayCircle, Archive
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { loadUsers } from '../services/auth'
import { fetchPlans, planAdd, planUpdate, planDelete, generatePlannedMonth, planSweep } from '../services/tasks'
import { normalize } from '../services/sheets'

const FREQS = ['Daily', 'Fortnightly', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One-Time']
const SCOPES = [
  { key: 'CL', label: 'Checklist plans', into: 'Checklist' },
  { key: 'DL', label: 'Delegation plans', into: 'DELEGATION' }
]
const emptyForm = {
  mode: 'add', scope: 'CL', planId: '', title: '', assignee: '', department: '',
  startDate: '', time: '09:00', frequency: 'Daily', endDate: '',
  requireAttachment: false, reminders: false, remarks: '', active: true
}

export default function PlannedTasks({ session }) {
  const access = String(session?.access?.['Planned Tasks'] ?? 'None')
  const canEdit = session?.isAdmin || ['Editor', 'Full Access'].includes(access)

  const [scope, setScope] = useState('CL')
  const [users, setUsers] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [q, setQ] = useState('')
  const [doer, setDoer] = useState('all')
  const [form, setForm] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [all, list] = await Promise.all([
        loadUsers().catch(() => ({})),
        fetchPlans(scope)
      ])
      setUsers(Object.values(all))
      setPlans(list)
    } catch (e) {
      setError(e.message || 'Unable to load plans.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [scope, session.username])

  const doers = useMemo(() => {
    const seen = new Map()
    plans.forEach(p => {
      const a = String(p.assignee || '').trim()
      if (a && !seen.has(a.toLowerCase())) seen.set(a.toLowerCase(), a)
    })
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }, [plans])

  const rows = useMemo(() => plans.filter(p => {
    const matchDoer = doer === 'all' || normalize(p.assignee) === normalize(doer)
    const matchQ = !q || `${p.planId} ${p.title} ${p.assignee} ${p.frequency} ${p.remarks}`.toLowerCase().includes(q.toLowerCase())
    return matchDoer && matchQ
  }), [plans, doer, q])

  const departments = useMemo(() => {
    const s = new Set(users.map(u => u.department).filter(Boolean))
    plans.forEach(p => p.department && s.add(p.department))
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [users, plans])

  const openAdd = () => { setError(''); setOk(''); setForm({ ...emptyForm, scope, assignee: doer !== 'all' ? doer : '' }) }
  const openEdit = p => {
    setError(''); setOk('')
    setForm({
      mode: 'edit', scope, planId: p.planId, title: p.title, assignee: p.assignee,
      department: p.department, startDate: p.startDate, time: p.time || '09:00',
      frequency: p.frequency || 'Daily', endDate: p.endDate || '',
      requireAttachment: !!p.requireAttachment, reminders: !!p.reminders,
      remarks: p.remarks || '', active: p.active !== false
    })
  }
  const change = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const changeAssignee = v => {
    const u = users.find(x => x.username === v)
    setForm(f => ({ ...f, assignee: v, department: u?.department || f.department }))
  }

  const submit = async e => {
    e.preventDefault(); setError(''); setOk(''); setBusy(true)
    try {
      if (!form.title || !form.assignee || !form.startDate) {
        setError('Task description, doer and start date are required.'); setBusy(false); return
      }
      const payload = {
        planId: form.planId || undefined,
        taskDescription: form.title, assignee: form.assignee, name: form.assignee,
        department: form.department, givenBy: session.username,
        startDate: form.startDate, time: form.time, frequency: form.frequency,
        endDate: form.endDate, requireAttachment: form.requireAttachment,
        reminders: form.reminders, remarks: form.remarks, active: form.active
      }
      if (form.mode === 'add') { await planAdd(scope, payload); setOk('Plan added.') }
      else { await planUpdate(scope, { ...payload, planId: form.planId }); setOk('Plan updated.') }
      setForm(null); await load()
    } catch (err) {
      setError(err.message || 'Unable to save the plan.')
    } finally { setBusy(false) }
  }

  const remove = async () => {
    setBusy(true); setError('')
    try {
      await planDelete(scope, { planId: confirm.planId })
      setConfirm(null); setOk('Plan deleted.')
      await load()
    } catch (err) {
      setError(err.message || 'Unable to delete the plan.'); setConfirm(null)
    } finally { setBusy(false) }
  }

  const generate = async target => {
    setBusy(true); setError(''); setOk('')
    try {
      const res = await generatePlannedMonth(target)
      const n = res?.created ?? 0, sk = res?.skipped ?? 0
      setOk(`${target === 'next' ? 'Next month' : 'This month'}: ${n} task(s) generated${sk ? `, ${sk} already existed` : ''}.`)
    } catch (err) {
      setError(err.message || 'Unable to generate this month.')
    } finally { setBusy(false) }
  }

  const sweep = async () => {
    setBusy(true); setError(''); setOk('')
    try {
      const res = await planSweep()
      const a = res?.archived ?? 0, m = res?.missedLogged ?? 0
      setOk(`Maintenance: ${a} completed task(s) archived to History${m ? `, ${m} past-due marked Missed` : ''}.`)
      await load()
    } catch (err) {
      setError(err.message || 'Unable to run maintenance.')
    } finally { setBusy(false) }
  }

  const into = SCOPES.find(s => s.key === scope)?.into

  return (
    <>
      <PageHeader
        title="Planned Tasks"
        subtitle={`Recurring rules. On the 1st of each month every active plan's occurrences are generated into ${into} as pending tasks. Editing a plan does not change tasks already generated.`}
        action={
          <div className="header-actions">
            <button className="secondary-btn" onClick={load}><RefreshCw size={15} /> Refresh</button>
            {canEdit && (
              <>
                <button className="secondary-btn" disabled={busy} onClick={() => generate('current')}><PlayCircle size={15} /> Generate this month</button>
                <button className="secondary-btn" disabled={busy} onClick={() => generate('next')}><PlayCircle size={15} /> Next month</button>
                <button className="secondary-btn" disabled={busy} onClick={sweep} title="Archive completed tasks (dated before today) to History"><Archive size={15} /> Run maintenance</button>
                <button className="primary-btn" onClick={openAdd}><Plus size={15} /> Add Plan</button>
              </>
            )}
          </div>
        }
      />

      {error && <div className="error-box page-error">{error}</div>}
      {ok && <div className="success-box page-error"><CheckCircle2 size={16} /> {ok}</div>}
      {!canEdit && (
        <div className="admin-banner"><Lock size={18} /><div>
          <b>View only</b><span> Editor rights on “Planned Tasks” are required to add, edit, delete or generate.</span>
        </div></div>
      )}

      <div className="admin-banner">
        <CalendarClock size={20} />
        <div><b>Recurring plan console</b><span> {plans.length} plan(s) in this list · generated tasks land in {into}. Genuinely one-off tasks still go through Assign Task.</span></div>
      </div>

      <div className="mini-tabs">
        {SCOPES.map(s => (
          <button key={s.key} className={scope === s.key ? 'active' : ''} onClick={() => { setScope(s.key); setDoer('all'); setQ('') }}>{s.label}</button>
        ))}
      </div>

      <div className="toolbar task-filters">
        <div className="search-box">
          <Search size={16} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search description, doer, freq…" />
        </div>
        <label className="filter-field">
          <Users size={14} />
          <select value={doer} onChange={e => setDoer(e.target.value)}>
            <option value="all">All Doers</option>
            {doers.map(x => <option key={x}>{x}</option>)}
          </select>
        </label>
      </div>

      <div className="panel">
        {loading ? (
          <div className="loading-box">Loading plans…</div>
        ) : rows.length ? (
          <div className="mtl-table-wrap">
            <table className="mtl-table">
              <thead>
                <tr>
                  <th>Plan ID</th><th>Task Description</th><th>Doer</th><th>Dept</th>
                  <th>Start</th><th>Time</th><th>Freq</th><th>End</th><th>Active</th>
                  {canEdit && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(p => (
                  <tr key={`plan-${p.planId || p.row}`} style={p.active === false ? { opacity: 0.55 } : undefined}>
                    <td><span className="history-id">{p.planId || '—'}</span></td>
                    <td><b>{p.title || '—'}</b>{p.remarks && <small title={p.remarks}>“{p.remarks}”</small>}</td>
                    <td>{p.assignee || '—'}</td>
                    <td>{p.department || '—'}</td>
                    <td>{p.startDate || '—'}</td>
                    <td>{p.time || '—'}</td>
                    <td>{p.frequency || '—'}</td>
                    <td>{p.endDate || '—'}</td>
                    <td>{p.active === false ? 'No' : 'Yes'}</td>
                    {canEdit && (
                      <td>
                        <div className="mtl-actions">
                          <button className="secondary-btn icon-only" title="Edit plan" onClick={() => openEdit(p)}><Pencil size={13} /></button>
                          <button className="secondary-btn icon-only danger" title="Delete plan" onClick={() => setConfirm(p)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mtl-empty">No plans yet.{canEdit ? ' Add one, or type rows directly in the ' + (scope === 'DL' ? 'Task_Planned_DL' : 'Task_Planned_CL') + ' sheet.' : ''}</div>
        )}
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <section className="completion-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <div>
                <h2>{form.mode === 'add' ? 'Add Plan' : `Edit Plan — ${form.planId}`}</h2>
                <p>Writes one row to {scope === 'DL' ? 'Task_Planned_DL' : 'Task_Planned_CL'}.</p>
              </div>
            </div>
            <form className="modal-body" onSubmit={submit}>
              <label className="modal-field">Task Description
                <input value={form.title} onChange={e => change('title', e.target.value)} required />
              </label>
              <label className="modal-field">Doer
                <select value={form.assignee} onChange={e => changeAssignee(e.target.value)} required>
                  <option value="">Select a doer…</option>
                  {users.map(u => <option key={u.username} value={u.username}>{u.username}{u.department ? ` · ${u.department}` : ''}</option>)}
                  {form.assignee && !users.some(u => u.username === form.assignee) && <option value={form.assignee}>{form.assignee}</option>}
                </select>
              </label>
              <label className="modal-field">Department
                <select value={form.department} onChange={e => change('department', e.target.value)}>
                  <option value="">Select a department…</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  {form.department && !departments.includes(form.department) && <option value={form.department}>{form.department}</option>}
                </select>
              </label>
              <div className="form-grid">
                <label className="modal-field">Start Date
                  <input type="date" value={form.startDate} onChange={e => change('startDate', e.target.value)} required />
                </label>
                <label className="modal-field">Time
                  <input type="time" value={form.time} onChange={e => change('time', e.target.value)} />
                </label>
                <label className="modal-field">Frequency
                  <select value={form.frequency} onChange={e => change('frequency', e.target.value)}>
                    {FREQS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </label>
                <label className="modal-field">End Date <small>(optional)</small>
                  <input type="date" value={form.endDate} onChange={e => change('endDate', e.target.value)} />
                </label>
              </div>
              <label className="check-field"><span><input type="checkbox" checked={form.reminders} onChange={e => change('reminders', e.target.checked)} /> Enable reminders</span></label>
              <label className="check-field"><span><input type="checkbox" checked={form.requireAttachment} onChange={e => change('requireAttachment', e.target.checked)} /> Require attachment</span></label>
              <label className="check-field"><span><input type="checkbox" checked={form.active} onChange={e => change('active', e.target.checked)} /> Active (generate every month)</span></label>
              <label className="modal-field">Remarks
                <input value={form.remarks} onChange={e => change('remarks', e.target.value)} placeholder="Optional notes" />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setForm(null)}>Cancel</button>
                <button className="primary-btn" disabled={busy}><Save size={15} /> {busy ? 'Saving…' : form.mode === 'add' ? 'Add Plan' : 'Save Changes'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {confirm && (
        <div className="modal-backdrop" onClick={() => setConfirm(null)}>
          <section className="completion-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <div>
                <h2>Delete plan “{confirm.title || confirm.planId}”?</h2>
                <p>Stops future monthly generation for this rule. Tasks already generated are not removed.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
              <button className="primary-btn danger" onClick={remove} disabled={busy}><Trash2 size={15} /> {busy ? 'Deleting…' : 'Delete Plan'}</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
