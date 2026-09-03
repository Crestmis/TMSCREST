import {useEffect,useMemo,useState} from 'react'
import {ListChecks,RefreshCw,Plus,Pencil,Trash2,Search,Users,Save,CheckCircle2,Lock} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {loadUsers} from '../services/auth'
import {fetchAllTasksList,allListAdd,allListUpdate,allListDelete} from '../services/tasks'
import {normalize} from '../services/sheets'

const FREQS=['One-Time','Daily','Fortnightly','Weekly','Monthly','Quarterly','Half-Yearly','Yearly']
const emptyForm={mode:'add',row:0,assignee:'',title:'',frequency:'One-Time',remarks:'',expectName:'',expectTitle:''}

export default function AllTaskList({session}){
 const access=String(session?.access?.['All TasksList']??'None')
 const canEdit=session?.isAdmin||['Editor','Full Access'].includes(access)

 const [users,setUsers]=useState([])
 const [tasks,setTasks]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [ok,setOk]=useState('')
 const [doer,setDoer]=useState('all')
 const [q,setQ]=useState('')
 const [form,setForm]=useState(null)
 const [confirm,setConfirm]=useState(null)
 const [busy,setBusy]=useState(false)

 const load=async()=>{
  setLoading(true);setError('')
  try{
   const [all,list]=await Promise.all([loadUsers().catch(()=>({})),fetchAllTasksList()])
   setUsers(Object.values(all))
   setTasks(list)
  }catch(e){setError(e.message||'Unable to load AllTasksList.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[session.username])

 const countFor=name=>tasks.filter(t=>normalize(t.assignee)===normalize(name)).length

 const rows=useMemo(()=>tasks.filter(t=>{
  const matchDoer=doer==='all'||normalize(t.assignee)===normalize(doer)
  const matchQ=!q||`${t.title} ${t.assignee} ${t.frequency} ${t.remarks}`.toLowerCase().includes(q.toLowerCase())
  return matchDoer&&matchQ
 }),[tasks,doer,q])

 const openAdd=()=>{setError('');setOk('');setForm({...emptyForm,mode:'add',assignee:doer!=='all'?doer:''})}
 const openEdit=t=>{setError('');setOk('');setForm({mode:'edit',row:t.row,assignee:t.assignee,title:t.title,frequency:t.frequency||'One-Time',remarks:t.remarks||'',expectName:t.assignee,expectTitle:t.title})}
 const change=(k,v)=>setForm(f=>({...f,[k]:v}))

 const submit=async e=>{
  e.preventDefault();setError('');setOk('');setBusy(true)
  try{
   if(!form.title||!form.assignee){setError('Name and Task Description are required.');setBusy(false);return}
   if(form.mode==='add'){
    await allListAdd({name:form.assignee,taskDescription:form.title,freq:form.frequency,remarks:form.remarks})
    setOk('Entry added to AllTasksList.')
   }else{
    await allListUpdate({row:form.row,name:form.assignee,taskDescription:form.title,freq:form.frequency,remarks:form.remarks,expectName:form.expectName,expectTitle:form.expectTitle})
    setOk('Entry updated.')
   }
   setForm(null);await load()
  }catch(err){setError(err.message||'Unable to save the entry.')}
  finally{setBusy(false)}
 }

 const remove=async()=>{
  setBusy(true);setError('')
  try{
   await allListDelete({row:confirm.row,expectName:confirm.assignee,expectTitle:confirm.title})
   setConfirm(null);setOk('Entry deleted.')
   await load()
  }catch(err){setError(err.message||'Unable to delete the entry.');setConfirm(null)}
  finally{setBusy(false)}
 }

 return <>
  <PageHeader title="All TasksList" subtitle="A standalone, fully manual list in the AllTasksList Google Sheet tab. Type rows here or directly in the sheet — nothing is linked to Checklist / Delegation. Columns: Name, Task Description, Freq, Remarks."
   action={<div className="header-actions">
    <button className="secondary-btn" onClick={load}><RefreshCw size={15}/> Refresh</button>
    {canEdit&&<button className="primary-btn" onClick={openAdd}><Plus size={15}/> Add Entry</button>}
   </div>}/>

  {error&&<div className="error-box page-error">{error}</div>}
  {ok&&<div className="success-box page-error"><CheckCircle2 size={16}/> {ok}</div>}
  {!canEdit&&<div className="admin-banner"><Lock size={18}/><div><b>View only</b><span>You can browse this list but not change it. Editor rights on “All TasksList” are required to add, edit or delete rows.</span></div></div>}

  <div className="admin-banner">
   <ListChecks size={20}/>
   <div><b>All tasks console</b><span>{tasks.length} entr{tasks.length===1?'y':'ies'} · {users.length} user(s). Pick a doer on the left to filter.</span></div>
  </div>

  <div className="access-layout">
   <section className="panel access-users">
    <div className="access-section-head">
     <div><h2>Doers</h2><p>Filter entries by Name.</p></div>
     <div className="header-actions">
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
     <div><h2><ListChecks size={17}/> {doer==='all'?'All Doers':doer}</h2><p>{rows.length} entr{rows.length===1?'y':'ies'} shown.{canEdit?' Edit or delete any row.':''}</p></div>
     {canEdit&&doer!=='all'&&<div className="header-actions">
      <button className="primary-btn" onClick={openAdd}><Plus size={14}/> Add entry for {doer}</button>
     </div>}
    </div>

    <div className="toolbar" style={{padding:'12px 16px 0'}}>
     <div className="search-box">
      <Search size={16}/>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, description, remarks…"/>
     </div>
    </div>

    {loading?<div className="loading-box">Loading AllTasksList…</div>:rows.length?(
     <div className="mtl-table-wrap">
      <table className="mtl-table">
       <thead>
        <tr><th>Name</th><th>Task Description</th><th>Freq</th><th>Remarks</th>{canEdit&&<th style={{textAlign:'right'}}>Actions</th>}</tr>
       </thead>
       <tbody>
        {rows.map(t=>(
         <tr key={`row-${t.row}`}>
          <td>{t.assignee||'—'}</td>
          <td><b>{t.title||'—'}</b></td>
          <td>{t.frequency||'One-Time'}</td>
          <td className="mtl-remarks" title={t.remarks}>{t.remarks||'—'}</td>
          {canEdit&&<td>
           <div className="mtl-actions">
            <button className="secondary-btn icon-only" title="Edit entry" onClick={()=>openEdit(t)}><Pencil size={13}/></button>
            <button className="secondary-btn icon-only danger" title="Delete entry" onClick={()=>setConfirm(t)}><Trash2 size={13}/></button>
           </div>
          </td>}
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    ):<div className="mtl-empty">No entries yet.{canEdit?' Add one here or type rows in the AllTasksList tab.':''}</div>}
   </section>
  </div>

  {form&&<div className="modal-backdrop" onClick={()=>setForm(null)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
    <div className="modal-head">
     <div><h2>{form.mode==='add'?'Add Entry':'Edit Entry'}</h2><p>Writes one row to the AllTasksList tab.</p></div>
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

  {confirm&&<div className="modal-backdrop" onClick={()=>setConfirm(null)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
    <div className="modal-head">
     <div><h2>Delete entry “{confirm.title||confirm.assignee}”?</h2><p>Removes this row from the AllTasksList tab. This cannot be undone.</p></div>
    </div>
    <div className="modal-actions">
     <button className="secondary-btn" onClick={()=>setConfirm(null)} disabled={busy}>Cancel</button>
     <button className="primary-btn danger" onClick={remove} disabled={busy}><Trash2 size={15}/> {busy?'Deleting…':'Delete Entry'}</button>
    </div>
   </section>
  </div>}
 </>
}
