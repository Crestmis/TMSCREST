import {useEffect,useMemo,useState} from 'react'
import {Save,CheckCircle2,CalendarDays,Clock3} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import AccessBanner from '../components/AccessBanner'
import {createTask,nextNonSunday} from '../services/tasks'
import {loadUsers} from '../services/auth'
import {displayDate} from '../services/sheets'

export default function AssignTask({session,onChanged,setPage,assignHint}){
 const canEdit=session?.isAdmin||['Editor','Full Access'].includes(session?.access?.['Assign Task'])
 const [users,setUsers]=useState([])
 const [form,setForm]=useState(()=>({title:'',type:assignHint==='checklist'?'checklist':'delegation',assignee:'',department:session.department==='all'?'':session.department,date:'',time:'09:00',frequency:'One-Time',reminders:false,attachment:false,remarks:''}))
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('')

 useEffect(()=>{loadUsers().then(all=>setUsers(Object.values(all))).catch(()=>{})},[])

 const departments=useMemo(()=>{
  const set=new Set(users.map(u=>u.department).filter(Boolean))
  if(session.department&&session.department!=='all')set.add(session.department)
  return [...set].sort((a,b)=>a.localeCompare(b))
 },[users,session.department])

 const change=(k,v)=>setForm(f=>({...f,[k]:v}))
 const changeAssignee=v=>{
  const u=users.find(x=>x.username===v)
  setForm(f=>({...f,assignee:v,department:u?.department||f.department}))
 }

 const submit=async e=>{
   e.preventDefault();setError('');setMessage('')
   if(!canEdit){setError('You can view this form but not create tasks. Ask an admin for Editor or Full Access on “Assign Task”.');return}
   if(!form.title||!form.date||!form.assignee){setError('Task title, assignee and planned date are required.');return}
   const safeDate=nextNonSunday(form.date)
   setBusy(true)
   try{
    await createTask({taskType:form.type,taskTitle:form.title,department:form.department,givenBy:session.username,assignee:form.assignee,plannedDate:safeDate,plannedTime:form.time,frequency:form.frequency,reminders:form.reminders,requireAttachment:form.attachment,remarks:form.remarks})
    setMessage(safeDate!==form.date?`Sunday is a holiday. Planned date moved to ${displayDate(safeDate)}. Task saved successfully.`:'Task saved successfully.')
    setForm(f=>({...f,title:'',date:'',time:'09:00',remarks:''}));onChanged?.()
   }catch(e){setError(e.message||'Unable to submit task.')}finally{setBusy(false)}
 }
 return <><PageHeader title="Assign Task" subtitle="Create a checklist or delegation with a planned date and time."/>
 {!canEdit&&<AccessBanner>View only — you can browse this form but not create tasks. Editor or Full Access on “Assign Task” is required. Ask an admin from Admin Access.</AccessBanner>}
 <form className="panel form-panel" onSubmit={submit}>
  <div className="form-grid">
   <label>Task Title<input value={form.title} onChange={e=>change('title',e.target.value)} placeholder="Enter task title"/></label>
   <label>Task Type<select value={form.type} onChange={e=>change('type',e.target.value)}><option value="delegation">Delegation</option><option value="checklist">Checklist</option></select></label>
   <label>Assign To
    <select value={form.assignee} onChange={e=>changeAssignee(e.target.value)}>
     <option value="">Select a doer…</option>
     {users.map(u=><option key={u.username} value={u.username}>{u.username}{u.department?` · ${u.department}`:''}</option>)}
     {form.assignee&&!users.some(u=>u.username===form.assignee)&&<option value={form.assignee}>{form.assignee}</option>}
    </select>
   </label>
   <label>Department
    <select value={form.department} onChange={e=>change('department',e.target.value)}>
     <option value="">Select a department…</option>
     {departments.map(d=><option key={d} value={d}>{d}</option>)}
     {form.department&&!departments.includes(form.department)&&<option value={form.department}>{form.department}</option>}
    </select>
   </label>
   <label><span className="field-with-icon">Planned Date <CalendarDays size={13}/></span><input type="date" value={form.date} onChange={e=>change('date',e.target.value)}/><small className="field-help">Sundays are holidays and automatically move to Monday.</small></label>
   <label><span className="field-with-icon">Set Time <Clock3 size={13}/></span><input type="time" value={form.time} onChange={e=>change('time',e.target.value)}/><small className="field-help">Used for the 24-hour Pending → Overdue rule.</small></label>
   <label>Frequency<select value={form.frequency} onChange={e=>change('frequency',e.target.value)}>
    <option>One-Time</option><option>Daily</option><option>Fortnightly</option><option>Weekly</option><option>Monthly</option><option>Quarterly</option><option>Half-Yearly</option><option>Yearly</option>
   </select></label>
   <label className="check-field"><span><input type="checkbox" checked={form.reminders} onChange={e=>change('reminders',e.target.checked)}/> Enable reminders</span></label>
   <label className="check-field"><span><input type="checkbox" checked={form.attachment} onChange={e=>change('attachment',e.target.checked)}/> Require attachment</span></label>
   <label className="full">Remarks<textarea value={form.remarks} onChange={e=>change('remarks',e.target.value)} placeholder="Optional remarks"/></label>
  </div>
  {error&&<div className="error-box">{error}</div>}{message&&<div className="success-box"><CheckCircle2 size={16}/>{message}</div>}
  <div className="form-actions"><button type="button" className="secondary-btn" onClick={()=>setPage('dashboard')}>Cancel</button><button className="primary-btn" disabled={busy}><Save size={16}/>{busy?'Saving…':'Save Task'}</button></div>
 </form></>
}
