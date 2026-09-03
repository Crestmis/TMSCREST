import {useEffect,useMemo,useState} from 'react'
import {ListTodo,RefreshCw,Plus,Pencil,Trash2,Search,Users,Save,CheckCircle2,UserPlus} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {loadUsers} from '../services/auth'
import {fetchMasterTasks,masterAdd,masterUpdate,masterDelete,createUser,deleteUser} from '../services/tasks'
import {normalize} from '../services/sheets'

const FREQS=['One-Time','Daily','Fortnightly','Weekly','Monthly','Quarterly','Half-Yearly','Yearly']
const emptyForm={mode:'add',taskId:'',row:0,assignee:'',title:'',frequency:'One-Time',remarks:''}

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
  }catch(e){setError(e.message||'Unable to load MasterTasksList.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[session.username])

 const countFor=name=>tasks.filter(t=>normalize(t.assignee)===normalize(name)).length
 const departments=useMemo(()=>[...new Set(users.map(u=>u.department).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),[users])

 const rows=useMemo(()=>tasks.filter(t=>{
  const matchDoer=doer==='all'||normalize(t.assignee)===normalize(doer)
  const matchQ=!q||`${t.id} ${t.title} ${t.assignee} ${t.frequency} ${t.remarks}`.toLowerCase().includes(q.toLowerCase())
  return matchDoer&&matchQ
 }),[tasks,doer,q])

 const openAdd=()=>{setError('');setOk('');setForm({...emptyForm,mode:'add',assignee:doer!=='all'?doer:''})}
 const openEdit=t=>{setError('');setOk('');setForm({mode:'edit',taskId:t.id,row:t.row,assignee:t.assignee,title:t.title,frequency:t.frequency||'One-Time',remarks:t.remarks||''})}
 const change=(k,v)=>setForm(f=>({...f,[k]:v}))

 const submit=async e=>{
  e.preventDefault();setError('');setOk('');setBusy(true)
  try{
   if(!form.title||!form.assignee){setError('Name and Task Description are required.');setBusy(false);return}
   if(form.mode==='add'){
    await masterAdd({name:form.assignee,taskDescription:form.title,freq:form.frequency,remarks:form.remarks})
    setOk('Entry added to MasterTasksList.')
   }else{
    await masterUpdate({taskId:form.taskId,row:form.row,name:form.assignee,taskDescription:form.title,freq:form.frequency,remarks:form.remarks})
    setOk('Entry updated.')
   }
   setForm(null);await load()
  }catch(err){setError(err.message||'Unable to save the entry.')}
  finally{setBusy(false)}
 }

 const remove=async()=>{
  setBusy(true);setError('')
  try{
   await masterDelete({taskId:confirm.id,row:confirm.row})
   setConfirm(null);setOk('Entry deleted.')
   await load()
  }catch(err){setError(err.message||'Unable to delete the entry.');setConfirm(null)}
  finally{setBusy(false)}
 }

 const addUser=async e=>{
  e.preventDefault();setError('');setOk('');setBusy(true)
  try{
   const uname=String(newUser.username||'').trim().toLowerCase()
   await createUser({...newUser,username:uname})
   setOk(`User "${uname}" created.`)
   setShowAddUser(false);setNewUser({username:'',password:'',department:'',role:'user'})
   await load();setDoer(uname)
  }catch(err){setError(err.message||'Unable to add user.')}
  finally{setBusy(false)}
 }
 const removeUser=async()=>{
  setBusy(true);setError('')
  try{
   await deleteUser(confirmUser)
   setConfirmUser(null);setOk(`User "${confirmUser}" deleted.`)
   setDoer('all');await load()
  }catch(err){setError(err.message||'Unable to delete user.');setConfirmUser(null)}
  finally{setBusy(false)}
 }
 const canDeleteUser=doer!=='all'&&doer!=='admin'&&doer!==session.username

 return <>
  <PageHeader title="Master TasksList" subtitle="A standalone, fully manual list in the MasterTasksList Google Sheet tab. Type entries here or directly in the sheet — nothing is auto-fetched from the task sheets. Fields: Name, Task Description, Freq, Remarks."
   action={<div className="header-actions">
    <button className="secondary-btn" onClick={load}><RefreshCw size={15}/> Refresh</button>
    <button className="secondary-btn" onClick={()=>{setError('');setOk('');setShowAddUser(true)}}><UserPlus size={15}/> Add User</button>
    <button className="primary-btn" onClick={openAdd}><Plus size={15}/> Add Entry</button>
   </div>}/>

  {error&&<div className="error-box page-error">{error}</div>}
  {ok&&<div className="success-box page-error"><CheckCircle2 size={16}/> {ok}</div>}

  <div className="admin-banner">
   <ListTodo size={20}/>
   <div><b>Master task console</b><span>{tasks.length} entr{tasks.length===1?'y':'ies'} · {users.length} user(s). Pick a doer on the left to filter.</span></div>
  </div>

  <div className="access-layout">
   <section className="panel access-users">
    <div className="access-section-head">
     <div><h2>Doers</h2><p>Filter entries by Name.</p></div>
     <div className="header-actions">
      <button className="secondary-btn icon-only" title="Add user" onClick={()=>{setError('');setOk('');setShowAddUser(true)}}><UserPlus size={14}/></button>
      <button className="secondary-btn icon-only danger" title={canDeleteUser?`Delete user "${doer}"`:'Select a deletable user first'} disabled={!canDeleteUser} onClick={()=>setConfirmUser(doer)}><Trash2 size={13}/></button>
      <button className="secondary-btn icon-only" title="Refresh" onClick={load}><RefreshCw size={14}/></button>
     </div>
    </div>
    <div className="access-user-list">
     <button className={doer==='all'?'access-user active':'access-user'} onClick={()=>setDoer('all')}>
      <span className="user-avatar"><Users size={14}/></span>
      <span><b>All Doers</b><small>Every entry</small></span>
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
     <div><h2><ListTodo size={17}/> {doer==='all'?'All Doers':doer}</h2><p>{rows.length} entr{rows.length===1?'y':'ies'} shown. Edit or delete any row.</p></div>
     {doer!=='all'&&<div className="header-actions">
      <button className="secondary-btn danger" disabled={!canDeleteUser} title={canDeleteUser?'Delete this user':'This user cannot be deleted'} onClick={()=>setConfirmUser(doer)}><Trash2 size={13}/> Delete user</button>
      <button className="primary-btn" onClick={openAdd}><Plus size={14}/> Add entry for {doer}</button>
     </div>}
    </div>

    <div className="toolbar" style={{padding:'12px 16px 0'}}>
     <div className="search-box">
      <Search size={16}/>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, description, remarks…"/>
     </div>
    </div>

    {loading?<div className="loading-box">Loading MasterTasksList…</div>:rows.length?(
     <div className="mtl-table-wrap">
      <table className="mtl-table">
       <thead>
        <tr><th>Name</th><th>Task Description</th><th>Freq</th><th>Remarks</th><th style={{textAlign:'right'}}>Actions</th></tr>
       </thead>
       <tbody>
        {rows.map(t=>(
         <tr key={t.id||`row-${t.row}`}>
          <td>{t.assignee||'—'}</td>
          <td><b>{t.title||'—'}</b></td>
          <td>{t.frequency||'One-Time'}</td>
          <td className="mtl-remarks" title={t.remarks}>{t.remarks||'—'}</td>
          <td>
           <div className="mtl-actions">
            <button className="secondary-btn icon-only" title="Edit entry" onClick={()=>openEdit(t)}><Pencil size={13}/></button>
            <button className="secondary-btn icon-only danger" title="Delete entry" onClick={()=>setConfirm(t)}><Trash2 size={13}/></button>
           </div>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    ):<div className="mtl-empty">No entries yet. Add one here or type rows in the MasterTasksList tab.</div>}
   </section>
  </div>

  {form&&<div className="modal-backdrop" onClick={()=>setForm(null)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
    <div className="modal-head">
     <div><h2>{form.mode==='add'?'Add Entry':`Edit Entry — ${form.taskId||'row '+form.row}`}</h2><p>Writes one row to the MasterTasksList tab.</p></div>
    </div>
    <form className="modal-body" onSubmit={submit}>
     <label className="modal-field">Name (doer)
      <select value={form.assignee} onChange={e=>change('assignee',e.target.value)} required>
       <option value="">Select a doer…</option>
       {users.map(u=><option key={u.username} value={u.username}>{u.username}{u.department?` · ${u.department}`:''}</option>)}
       {form.assignee&&!users.some(u=>u.username===form.assignee)&&<option value={form.assignee}>{form.assignee}</option>}
      </select>
     </label>
     <label className="modal-field">Task Description<input value={form.title} onChange={e=>change('title',e.target.value)} required/></label>
     <label className="modal-field">Freq
      <select value={form.frequency} onChange={e=>change('frequency',e.target.value)}>{FREQS.map(f=><option key={f}>{f}</option>)}</select>
     </label>
     <label className="modal-field">Remarks<input value={form.remarks} onChange={e=>change('remarks',e.target.value)} placeholder="Optional notes"/></label>
     <div className="modal-actions">
      <button type="button" className="secondary-btn" onClick={()=>setForm(null)}>Cancel</button>
      <button className="primary-btn" disabled={busy}><Save size={15}/> {busy?'Saving…':form.mode==='add'?'Add Entry':'Save Changes'}</button>
     </div>
    </form>
   </section>
  </div>}

  {showAddUser&&<div className="modal-backdrop" onClick={()=>setShowAddUser(false)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()}>
    <div className="modal-head">
     <div><h2>Add User</h2><p>Create a login. Manage their page access from Admin Access.</p></div>
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
     <div><h2>Delete entry “{confirm.title||confirm.id}”?</h2><p>Removes this row from the MasterTasksList tab. This cannot be undone.</p></div>
    </div>
    <div className="modal-actions">
     <button className="secondary-btn" onClick={()=>setConfirm(null)} disabled={busy}>Cancel</button>
     <button className="primary-btn danger" onClick={remove} disabled={busy}><Trash2 size={15}/> {busy?'Deleting…':'Delete Entry'}</button>
    </div>
   </section>
  </div>}

  {confirmUser&&<div className="modal-backdrop" onClick={()=>setConfirmUser(null)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
    <div className="modal-head">
     <div><h2>Delete user “{confirmUser}”?</h2><p>Removes their login from the master sheet and all of their access rows. This cannot be undone.</p></div>
    </div>
    <div className="modal-actions">
     <button className="secondary-btn" onClick={()=>setConfirmUser(null)} disabled={busy}>Cancel</button>
     <button className="primary-btn danger" onClick={removeUser} disabled={busy}><Trash2 size={15}/> {busy?'Deleting…':'Delete User'}</button>
    </div>
   </section>
  </div>}
 </>
}
