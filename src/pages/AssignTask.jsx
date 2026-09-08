import { useEffect, useMemo, useState } from 'react'
import { Save, CheckCircle2, CalendarDays, Clock3, CalendarClock } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import AccessBanner from '../components/AccessBanner'
import { planAdd, generatePlannedMonth } from '../services/tasks'
import { loadUsers } from '../services/auth'
import { displayDate } from '../services/sheets'

// Checklist tasks are recurring; delegations are one-time. Either way the entry
// is written to the plan sheet (Task_Planned_CL / _DL) and the generator turns
// it into dated rows in Checklist / DELEGATION.
const CHECKLIST_FREQS = ['Daily', 'Fortnightly', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']

export default function AssignTask({ session, onChanged, setPage, assignHint }) {
  const canEdit = session?.isAdmin || ['Editor', 'Full Access'].includes(session?.access?.['Assign Task'])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(() => ({
    title: '', type: assignHint === 'checklist' ? 'checklist' : 'delegation',
    assignee: '', department: session.department === 'all' ? '' : session.department,
    date: '', time: '09:00', frequency: assignHint === 'checklist' ? 'Daily' : 'One-Time',
    endDate: '', reminders: false, attachment: false, remarks: ''
  }))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { loadUsers().then(all => setUsers(Object.values(all))).catch(() => {}) }, [])

  const departments = useMemo(() => {
    const set = new Set(users.map(u => u.department).filter(Boolean))
    if (session.department && session.department !== 'all') set.add(session.department)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [users, session.department])

  const change = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const changeType = v => setForm(f => ({
    ...f, type: v,
    frequency: v === 'delegation' ? 'One-Time' : (f.frequency === 'One-Time' ? 'Daily' : f.frequency)
  }))
  const changeAssignee = v => {
    const u = users.find(x => x.username === v)
    setForm(f => ({ ...f, assignee: v, department: u?.department || f.department }))
  }

  const submit = async e => {
    e.preventDefault(); setError(''); setMessage('')
    if (!canEdit) { setError('You can view this form but not create tasks. Ask an admin for Editor or Full Access on “Assign Task”.'); return }
    if (!form.title || !form.date || !form.assignee) { setError('Task title, assignee and start date are required.'); return }

    const scope = form.type === 'checklist' ? 'CL' : 'DL'
    const recurring = form.type === 'checklist'
    setBusy(true)
    try {
      await planAdd(scope, {
        taskDescription: form.title,
        name: form.assignee,
        assignee: form.assignee,
        department: form.department,
        givenBy: session.username,
        startDate: form.date,
        time: form.time,
        frequency: recurring ? form.frequency : 'One-Time',
        endDate: recurring ? form.endDate : form.date,
        requireAttachment: form.attachment,
        reminders: form.reminders,
        remarks: form.remarks,
        active: true
      })
      // Materialise now so the task shows without waiting for the 1st.
      let created = 0
      for (const t of ['current', 'next']) {
        try { const r = await generatePlannedMonth(t); created += Number(r?.created || 0) } catch { /* ignore */ }
      }
      setMessage(
        recurring
          ? `Recurring plan added${created ? ` — ${created} occurrence(s) generated` : ''}. Manage or stop it on the Planned Tasks page.`
          : `Task scheduled for ${displayDate(form.date)}${created ? ' and generated' : ' — it will appear on its date'}.`
      )
      setForm(f => ({ ...f, title: '', date: '', endDate: '', time: '09:00', remarks: '' }))
      onChanged?.()
    } catch (e) {
      setError(e.message || 'Unable to submit task.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader
        title="Assign Task"
        subtitle="Adds a rule to the plan sheet. Checklist = recurring; Delegation = one-time. The generator turns it into dated tasks."
      />
      {!canEdit && <AccessBanner>View only — you can browse this form but not create tasks. Editor or Full Access on “Assign Task” is required. Ask an admin from Admin Access.</AccessBanner>}
      <form className="panel form-panel" onSubmit={submit}>
        <div className="form-grid">
          <label>Task Title<input value={form.title} onChange={e => change('title', e.target.value)} placeholder="Enter task title" /></label>
          <label>Task Type
            <select value={form.type} onChange={e => changeType(e.target.value)}>
              <option value="delegation">Delegation (one-time)</option>
              <option value="checklist">Checklist (recurring)</option>
            </select>
          </label>
          <label>Assign To
            <select value={form.assignee} onChange={e => changeAssignee(e.target.value)}>
              <option value="">Select a doer…</option>
              {users.map(u => <option key={u.username} value={u.username}>{u.username}{u.department ? ` · ${u.department}` : ''}</option>)}
              {form.assignee && !users.some(u => u.username === form.assignee) && <option value={form.assignee}>{form.assignee}</option>}
            </select>
          </label>
          <label>Department
            <select value={form.department} onChange={e => change('department', e.target.value)}>
              <option value="">Select a department…</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
              {form.department && !departments.includes(form.department) && <option value={form.department}>{form.department}</option>}
            </select>
          </label>
          <label>
            <span className="field-with-icon">Start Date <CalendarDays size={13} /></span>
            <input type="date" value={form.date} onChange={e => change('date', e.target.value)} />
            <small className="field-help">The recurrence counts from this date. Sundays &amp; holidays are skipped by the generator.</small>
          </label>
          <label>
            <span className="field-with-icon">Set Time <Clock3 size={13} /></span>
            <input type="time" value={form.time} onChange={e => change('time', e.target.value)} />
            <small className="field-help">Used for the 24-hour Pending → Overdue rule.</small>
          </label>
          <label>Frequency
            {form.type === 'delegation'
              ? <select value="One-Time" disabled title="Delegations are one-time"><option>One-Time</option></select>
              : <select value={form.frequency} onChange={e => change('frequency', e.target.value)}>
                  {CHECKLIST_FREQS.map(f => <option key={f}>{f}</option>)}
                </select>}
          </label>
          {form.type === 'checklist' && (
            <label>
              <span className="field-with-icon">End Date <CalendarClock size={13} /></span>
              <input type="date" value={form.endDate} onChange={e => change('endDate', e.target.value)} />
              <small className="field-help">Optional — leave blank to repeat indefinitely.</small>
            </label>
          )}
          <label className="check-field"><span><input type="checkbox" checked={form.reminders} onChange={e => change('reminders', e.target.checked)} /> Enable reminders</span></label>
          <label className="check-field"><span><input type="checkbox" checked={form.attachment} onChange={e => change('attachment', e.target.checked)} /> Require attachment</span></label>
          <label className="full">Remarks<textarea value={form.remarks} onChange={e => change('remarks', e.target.value)} placeholder="Optional remarks" /></label>
        </div>
        {error && <div className="error-box">{error}</div>}
        {message && <div className="success-box"><CheckCircle2 size={16} />{message}</div>}
        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={() => setPage('dashboard')}>Cancel</button>
          <button className="primary-btn" disabled={busy}><Save size={16} />{busy ? 'Saving…' : 'Save Task'}</button>
        </div>
      </form>
    </>
  )
}
