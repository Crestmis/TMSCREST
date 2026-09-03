import {useEffect,useMemo,useState} from 'react'
import {ListTodo,RefreshCw,Plus,Pencil,Trash2,Search,Users,Save,AlertTriangle,CheckCircle2,UserPlus,DownloadCloud} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {loadUsers} from '../services/auth'
import {fetchMasterTasks,createTask,updateTask,deleteTask,createUser,deleteUser,pushMasterTasks} from '../services/tasks'
import {normalize} from '../services/sheets'

const FREqs=['One-Time','Daily','Fortnightly','Weekly','Monthly','Quarterly','Half-Yearly','Yearly']
const STATUSES=['Pending','Overdue','Delay','Done']

const emptyForm={mode:'add',taskId:'',taskType:'checklist',taskTitle:'',assignee:'',department:'',givenBy:'',plannedDate:'',plannedTime:'09:00',frequency:'One-Time',status:'Pending',remarks:''}

export default function MasterTaskList({session}){
 const [users,setUsers]=useState([])
 const [tasks,setTasks]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [ok,setOk]=useState('')
 const [doer,setDoer]=useState('all')
 const [q,setQ]=useState('')
 const [form,setForm]=useState(null)
 const [confirm,setConfirm]=useState(null)
 const [confirmUser,setConfirmUser]=useState(null)
 const [showAddUser,setShowAddUser]=useState(false)
 const [newUser,setNewUser]=useState({username:'',password:'',department:'',role:'user'})
 const [busy,setBusy]=useState(false)

 const load=async()=>{
  setLoading(true);setError('')
  try{
   const [all,mt]=await Promise.all([loadUsers().catch(()=>({})),fetchMasterTasks()])
   setUsers(Object.values(all))
   setTasks(mt)
  }catch(e){setError(e.message||'Unable to load the master task list.')}
  finally{setLoading(false)}
 }
 const applySheetEdits=async()=>{
  setBusy(true);setError('');setOk('')
  try{ await pushMasterTasks(); setOk('MasterTasksList sheet edits applied to the task sheets.'); await load() }
  catch(e){ setError(e.message||'Unable to apply sheet edits.') }
  finally{ setBusy(false) }
 }
 useEffect(()=>{load()},[session.username])

 const countFor=name=>tasks.filter(t=>normalize(t.assignee)===normalize(name)).length

 const departments=useMemo(()=>{
  const set=new Set([...users.map(u=>u.department).filter(Boolean),...tasks.map(t=>t.department).filter(Boolean)])
  return [...set].sort((a,b)=>a.localeCompare(b))
 },[users,tasks])

 const rows=useMemo(()=>tasks.filter(t=>{
  const matchDoer=doer==='all'||normalize(t.assignee)===normalize(doer)
  const matchQ=!q||`${t.id} ${t.title} ${t.assignee} ${t.givenBy} ${t.department}`.toLowerCase().includes(q.toLowerCase())
  return matchDoer&&matchQ
 }).sort((a,b)=>(a.plannedISO||'9999').localeCompare(b.plannedISO||'9999')),[tasks,doer,q])

 const openAdd=()=>{
  const u=users.find(x=>x.username===doer)
  setError('');setOk('')
  setForm({...emptyForm,mode:'add',givenBy:session.username,assignee:doer!=='all'?doer:'',department:u?.department||'',frequency:'One-Time'})
 }
 const openEdit=t=>{setError('');setOk('');setForm({
  mode:'edit',taskId:t.id,taskType:String(t.type).toLowerCase(),taskTitle:t.title,assignee:t.assignee,
  department:t.department,givenBy:t.givenBy,plannedDate:t.plannedISO||'',plannedTime:t.plannedTime||'',
  frequency:t.frequency||'One-Time',status:t.status||'Pending',remarks:t.remarks||''
 })}
 const change=(k,v)=>setForm(f=>({...f,[k]:v}))
 const changeAssignee=v=>{
  const u=users.find(x=>x.username===v)
  setForm(f=>({...f,assignee:v,department:u?.department||f.department}))
 }

 const submit=async e=>{
  e.preventDefault();setError('');setOk('');setBusy(true)
  try{
   if(!form.taskTitle||!form.assignee||!form.plannedDate){setError('Task, doer and planned date are required.');setBusy(false);return}
   if(form.mode==='add'){
    await createTask({taskType:form.taskType,taskTitle:form.taskTitle,department:form.department,givenBy:form.givenBy||session.username,assignee:form.assignee,plannedDate:form.plannedDate,plannedTime:form.plannedTime,frequency:form.frequency,remarks:form.remarks})
    setOk('Task created.')
   }else{
    await updateTask({taskId:form.taskId,taskType:form.taskType,taskTitle:form.taskTitle,assignee:form.assignee,department:form.department,givenBy:form.givenBy,plannedDate:form.plannedDate,plannedTime:form.plannedTime,frequency:form.frequency,status:form.status,remarks:form.remarks})
    setOk('Task updated.')
   }
   setForm(null)
   await load()
  }catch(err){setError(err.message||'Unable to save the task.')}
  finally{setBusy(false)}
 }

 const addUser=async e=>{
  e.preventDefault();setError('');setOk('');setBusy(true)
  try{
   const uname=String(newUser.username||'').trim().toLowerCase()
   await createUser({...newUser,username:uname})
   setOk(`User "${uname}" created. Add their tasks below.`)
   setShowAddUser(false)
   setNewUser({username:'',password:'',department:'',role:'user'})
   await load()
   setDoer(uname)
  }catch(err){setError(err.message||'Unable to add user.')}
  finally{setBusy(false)}
 }

 const remove=async()=>{
  setBusy(true);setError('')
  try{
   await deleteTask({taskId:confirm.id,taskType:String(confirm.type).toLowerCase()})
   setConfirm(null);setOk('Task deleted.')
   await load()
  }catch(err){setError(err.message||'Unable to delete the task.');setConfirm(null)}
  finally{setBusy(false)}
 }

 const removeUser=async()=>{
  setBusy(true);setError('')
  try{
   await deleteUser(confirmUser)
   setConfirmUser(null);setOk(`User "${confirmUser}" deleted.`)
   setDoer('all')
   await load()
  }catch(err){setError(err.message||'Unable to delete user.');setConfirmUser(null)}
  finally{setBusy(false)}
 }
 const canDeleteUser=doer!=='all'&&doer!=='admin'&&doer!==session.username

 return <>
  <PageHeader title="Master TasksList" subtitle="Backed by the MasterTasksList tab in Google Sheets — edit here or in the sheet, both stay in sync. Refresh pulls the sheet; “Apply sheet edits” pushes rows changed in the tab into the task sheets."
   action={<div className="header-actions">
    <button className="secondary-btn" onClick={load}><RefreshCw size={15}/> Refresh</button>
    <button className="secondary-btn" onClick={applySheetEdits} disabled={busy} title="Push rows edited directly in the MasterTasksList tab into Checklist / DELEGATION"><DownloadCloud size={15}/> Apply sheet edits</button>
    <button className="secondary-btn" onClick={()=>{setError('');setOk('');setShowAddUser(true)}}><UserPlus size={15}/> Add User</button>
    <button className="primary-btn" onClick={openAdd}><Plus size={15}/> Add Task</button>
   </div>}/>

  {error&&<div className="error-box page-error">{error}</div>}
  {ok&&<div className="success-box page-error"><CheckCircle2 size={16}/> {ok}</div>}

  <div className="admin-banner">
   <ListTodo size={20}/>
   <div><b>Master task console</b><span>{tasks.length} task(s) across {users.length} user(s). Pick a doer on the left to open their panel.</span></div>
  </div>

  <div className="access-layout">
   <section className="panel access-users">
    <div className="access-section-head">
     <div><h2>Doers</h2><p>Select whose tasks to show.</p></div>
     <div className="header-actions">
      <button className="secondary-btn icon-only" title="Add user" onClick={()=>{setError('');setOk('');setShowAddUser(true)}}><UserPlus size={14}/></button>
      <button className="secondary-btn icon-only danger" title={canDeleteUser?`Delete user "${doer}"`:'Select a deletable user first'} disabled={!canDeleteUser} onClick={()=>setConfirmUser(doer)}><Trash2 size={13}/></button>
      <button className="secondary-btn icon-only" title="Refresh" onClick={load}><RefreshCw size={14}/></button>
     </div>
    </div>
    <div className="access-user-list">
     <button className={doer==='all'?'access-user active':'access-user'} onClick={()=>setDoer('all')}>
      <span className="user-avatar"><Users size={14}/></span>
      <span><b>All Doers</b><small>Every task in the sheet</small></span>
      <span className="mtl-doer-count">{tasks.length}</span>
     </button>
     {users.map(u=>(
      <button key={u.username} className={doer===u.username?'access-user active':'access-user'} onClick={()=>setDoer(u.username)}>
       <span className="user-avatar">{u.username.slice(0,2).toUpperCase()}</span>
       <span><b>{u.username}</b><small>{u.department||'Department'} · {u.role}</small></span>
       <span className="mtl-doer-count">{countFor(u.username)}</span>
      </button>
     ))}
    </div>
   </section>

   <section className="panel access-editor">
    <div className="access-section-head">
     <div><h2><ListTodo size={17}/> {doer==='all'?'All Doers':doer}</h2><p>{rows.length} task(s) shown. Edit or delete any row.</p></div>
     {doer!=='all'&&<div className="header-actions">
      <button className="secondary-btn danger" disabled={!canDeleteUser} title={canDeleteUser?'Delete this user':'This user cannot be deleted'} onClick={()=>setConfirmUser(doer)}><Trash2 size={13}/> Delete user</button>
      <button className="primary-btn" onClick={openAdd}><Plus size={14}/> Add task for {doer}</button>
     </div>}
    </div>

    <div className="toolbar" style={{padding:'12px 16px 0'}}>
     <div className="search-box">
      <Search size={16}/>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search task, doer, ID, department…"/>
     </div>
    </div>

    {loading?<div className="loading-box">Loading tasks…</div>:rows.length?(
     <div className="mtl-table-wrap">
      <table className="mtl-table">
       <thead>
        <tr><th>Name</th><th>Task Description</th><th>Freq</th><th>Remarks</th><th style={{textAlign:'right'}}>Actions</th></tr>
       </thead>
       <tbody>
        {rows.map(t=>(
         <tr key={`${t.type}-${t.id}-${t.row}`}>
          <td>{t.assignee||'—'}</td>
          <td><b>{t.title}</b> <span className={`type-pill ${String(t.type).toLowerCase()}`}>{t.type}</span></td>
          <td>{t.frequency||'One-Time'}</td>
          <td className="mtl-remarks" title={t.remarks}>{t.remarks||'—'}</td>
          <td>
           <div className="mtl-actions">
            <button className="secondary-btn icon-only" title="Edit task" onClick={()=>openEdit(t)}><Pencil size={13}/></button>
            <button className="secondary-btn icon-only danger" title="Delete task" onClick={()=>setConfirm(t)}><Trash2 size={13}/></button>
           </div>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    ):<div className="mtl-empty">No tasks for this selection.</div>}
   </section>
  </div>

  {form&&<div className="modal-backdrop" onClick={()=>setForm(null)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()}>
    <div className="modal-head">
     <div><h2>{form.mode==='add'?'Add Task':`Edit Task — ${form.taskId}`}</h2><p>Writes straight to the {form.taskType==='checklist'?'Checklist':'DELEGATION'} sheet.</p></div>
    </div>
    <form className="modal-body" onSubmit={submit}>
     <label className="modal-field">Task description<input value={form.taskTitle} onChange={e=>change('taskTitle',e.target.value)} required/></label>
     <label className="modal-field">Type
      <select value={form.taskType} onChange={e=>change('taskType',e.target.value)} disabled={form.mode==='edit'}>
       <option value="checklist">Checklist</option>
       <option value="delegation">Delegation</option>
      </select>
     </label>
     <label className="modal-field">Assign to (Name)
      <select value={form.assignee} onChange={e=>changeAssignee(e.target.value)} required>
       <option value="">Select a doer…</option>
       {users.map(u=><option key={u.username} value={u.username}>{u.username}{u.department?` · ${u.department}`:''}</option>)}
       {form.assignee&&!users.some(u=>u.username===form.assignee)&&<option value={form.assignee}>{form.assignee}</option>}
      </select>
     </label>
     <label className="modal-field">Department
      <select value={form.department} onChange={e=>change('department',e.target.value)}>
       <option value="">Select a department…</option>
       {departments.map(d=><option key={d} value={d}>{d}</option>)}
       {form.department&&!departments.includes(form.department)&&<option value={form.department}>{form.department}</option>}
      </select>
     </label>
     <label className="modal-field">Given by<input value={form.givenBy} onChange={e=>change('givenBy',e.target.value)} placeholder={session.username}/></label>
     <label className="modal-field">Planned date<input type="date" value={form.plannedDate} onChange={e=>change('plannedDate',e.target.value)} required/></label>
     <label className="modal-field">Planned time<input type="time" value={form.plannedTime} onChange={e=>change('plannedTime',e.target.value)}/></label>
     <label className="modal-field">Freq
      <select value={form.frequency} onChange={e=>change('frequency',e.target.value)}>{FREqs.map(f=><option key={f}>{f}</option>)}</select>
     </label>
     {form.mode==='edit'&&<label className="modal-field">Status
      <select value={form.status} onChange={e=>change('status',e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
     </label>}
     <label className="modal-field">Remarks<input value={form.remarks} onChange={e=>change('remarks',e.target.value)} placeholder="Optional notes"/></label>
     <div className="notice-box"><AlertTriangle size={14}/> A Sunday planned date is moved to Monday automatically.</div>
     <div className="modal-actions">
      <button type="button" className="secondary-btn" onClick={()=>setForm(null)}>Cancel</button>
      <button className="primary-btn" disabled={busy}><Save size={15}/> {busy?'Saving…':form.mode==='add'?'Create Task':'Save Changes'}</button>
     </div>
    </form>
   </section>
  </div>}

  {showAddUser&&<div className="modal-backdrop" onClick={()=>setShowAddUser(false)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()}>
    <div className="modal-head">
     <div><h2>Add User</h2><p>Create a login, then add their tasks from this page.</p></div>
    </div>
    <form className="modal-body" onSubmit={addUser}>
     <label className="modal-field">Username<input value={newUser.username} onChange={e=>setNewUser({...newUser,username:e.target.value})} required/></label>
     <label className="modal-field">Password<input type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} required/></label>
     <label className="modal-field">Department
      <input list="mtl-dept-list" value={newUser.department} onChange={e=>setNewUser({...newUser,department:e.target.value})} placeholder="Department"/>
      <datalist id="mtl-dept-list">{departments.map(d=><option key={d} value={d}/>)}</datalist>
     </label>
     <label className="modal-field">Role
      <select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>
       <option value="user">User</option>
       <option value="admin">Admin</option>
      </select>
     </label>
     <div className="modal-actions">
      <button type="button" className="secondary-btn" onClick={()=>setShowAddUser(false)}>Cancel</button>
      <button className="primary-btn" disabled={busy}><UserPlus size={15}/> {busy?'Creating…':'Create User'}</button>
     </div>
    </form>
   </section>
  </div>}

  {confirm&&<div className="modal-backdrop" onClick={()=>setConfirm(null)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
    <div className="modal-head">
     <div><h2>Delete task “{confirm.title}”?</h2><p>Removes {confirm.id} from the {String(confirm.type).toLowerCase()==='checklist'?'Checklist':'DELEGATION'} sheet. This cannot be undone.</p></div>
    </div>
    <div className="modal-actions">
     <button className="secondary-btn" onClick={()=>setConfirm(null)} disabled={busy}>Cancel</button>
     <button className="primary-btn danger" onClick={remove} disabled={busy}><Trash2 size={15}/> {busy?'Deleting…':'Delete Task'}</button>
    </div>
   </section>
  </div>}

  {confirmUser&&<div className="modal-backdrop" onClick={()=>setConfirmUser(null)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
    <div className="modal-head">
     <div><h2>Delete user “{confirmUser}”?</h2><p>Removes their login from the master sheet and all of their access rows. Their existing tasks stay in the sheet. This cannot be undone.</p></div>
    </div>
    <div className="modal-actions">
     <button className="secondary-btn" onClick={()=>setConfirmUser(null)} disabled={busy}>Cancel</button>
     <button className="primary-btn danger" onClick={removeUser} disabled={busy}><Trash2 size={15}/> {busy?'Deleting…':'Delete User'}</button>
    </div>
   </section>
  </div>}
 </>
}
