import {useEffect,useState} from 'react'
import {ShieldCheck,Save,RefreshCw,CheckCircle2,Users,UserPlus,Lock} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {loadUsers} from '../services/auth'
import {fetchAccess,saveAccess} from '../services/sheets'
import {createUser} from '../services/tasks'

const PAGES=['Dashboard','Tasks List','Delegation','Calendar','Reports & Score','Assign Task','Settings','History','Help & Support','Live Score','Admin Access']
const LEVELS=['None','Viewer','Editor','Full Access']

export default function AdminAccess({session,onSessionChanged}){
 const [users,setUsers]=useState([])
 const [selected,setSelected]=useState('')
 const [matrix,setMatrix]=useState({})
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [saved,setSaved]=useState(false)
 const [error,setError]=useState('')
 const [showAdd,setShowAdd]=useState(false)
 const [newUser,setNewUser]=useState({username:'',password:'',department:'',role:'user'})

 const load=async(username='')=>{
  setLoading(true);setError('');setSaved(false)
  try{
   const all=await loadUsers(),list=Object.values(all)
   setUsers(list)
   const u=username||selected||list[0]?.username||'admin'
   setSelected(u)
   const rows=await fetchAccess(u),next={}
   PAGES.forEach(p=>next[p]='None')
   next['Task Visibility']='Own Tasks'
   rows.forEach(r=>{if(r.Page)next[String(r.Page)]=String(r.Access||'None')})
   if(u==='admin'){PAGES.forEach(p=>next[p]='Full Access');next['Task Visibility']='All Tasks'}
   setMatrix(next)
  }catch(e){setError(e.message||'Unable to load access settings.')}
  finally{setLoading(false)}
 }

 useEffect(()=>{load('')},[])

 const save=async()=>{
  setSaving(true);setError('')
  try{
   await saveAccess(selected,matrix)
   setSaved(true)
   if(selected===session.username)onSessionChanged?.({...session,access:{...matrix},taskVisibility:matrix['Task Visibility']||'Own Tasks'})
  }catch(e){setError(e.message||'Unable to save access.')}
  finally{setSaving(false)}
 }

 const add=async e=>{
  e.preventDefault();setError('')
  try{
   await createUser(newUser)
   setShowAdd(false)
   setNewUser({username:'',password:'',department:'',role:'user'})
   await load(newUser.username)
  }catch(e){setError(e.message||'Unable to add user.')}
 }

 const setLevel=(page,level)=>{
  if(selected==='admin')return
  setMatrix(m=>({...m,[page]:level}))
 }

 return <>
  <PageHeader title="Admin Access" subtitle="Only administrators can manage users and page/task visibility."
   action={<div className="header-actions">
    <button className="secondary-btn" onClick={()=>setShowAdd(true)}><UserPlus size={15}/> Add User</button>
    <button className="primary-btn" onClick={save} disabled={saving||!selected}><Save size={15}/>{saving?'Saving…':'Save Access'}</button>
   </div>}/>
  {error&&<div className="error-box page-error">{error}</div>}
  {saved&&<div className="success-box page-error"><CheckCircle2 size={16}/> Access permissions saved successfully.</div>}

  <div className="admin-banner">
   <ShieldCheck size={20}/>
   <div><b>Default Administrator — Admin</b><span>Username: <strong>admin</strong> · Full access to every page and all users' tasks.</span></div>
  </div>

  <div className="access-layout">
   <section className="panel access-users">
    <div className="access-section-head">
     <div><h2>Users</h2><p>Select a user to manage.</p></div>
     <button className="secondary-btn" onClick={()=>load(selected)}><RefreshCw size={14}/></button>
    </div>
    <div className="access-user-list">
     {users.map(u=>(
      <button key={u.username} className={selected===u.username?'access-user active':'access-user'} onClick={()=>load(u.username)}>
       <span className="user-avatar">{u.username.slice(0,2).toUpperCase()}</span>
       <span><b>{u.username}</b><small>{u.department||'Department'} · {u.role}</small></span>
      </button>
     ))}
    </div>
   </section>

   <section className="panel access-editor">
    {loading?<div className="loading-box">Loading access matrix…</div>:<>
     <div className="access-section-head">
      <div><h2><Users size={17}/> {selected}</h2><p>Check/uncheck rights for each page. "None" removes access.</p></div>
      <span className="access-lock"><Lock size={13}/> Admin only</span>
     </div>
     <div className="access-table-wrap">
      <table className="access-table">
       <thead>
        <tr>
         <th>Page Name</th>
         {LEVELS.map(x=><th key={x} className={x==='None'?'level-none':''}>{x}</th>)}
        </tr>
       </thead>
       <tbody>
        {PAGES.map(page=>(
         <tr key={page}>
          <td><b>{page}</b></td>
          {LEVELS.map(level=>(
           <td key={level} className={level==='None'?'level-none':''}>
            <label className="access-radio">
             <input
              type="radio"
              name={`${selected}-${page}`}
              checked={matrix[page]===level||(level==='None'&&(!matrix[page]||matrix[page]==='None'))}
              onChange={()=>setLevel(page,level)}
              disabled={selected==='admin'}
             />
             <span className={level==='None'?'radio-none':''}>{(matrix[page]===level||(level==='None'&&(!matrix[page]||matrix[page]==='None')))?'✓':''}</span>
            </label>
           </td>
          ))}
         </tr>
        ))}
       </tbody>
      </table>
     </div>

     <div className="visibility-card">
      <div><b>Task Visibility</b><small>Allow this user to see tasks assigned to other users.</small></div>
      <label className="check-switch">
       <input type="checkbox" checked={matrix['Task Visibility']==='All Tasks'} disabled={selected==='admin'}
        onChange={e=>setMatrix(m=>({...m,'Task Visibility':e.target.checked?'All Tasks':'Own Tasks'}))}/>
       <i/>
      </label>
      <strong>{matrix['Task Visibility']==='All Tasks'?'Can view all users':'Own tasks only'}</strong>
     </div>

     <div className="access-help">
      <ShieldCheck size={18}/>
      <div><b>Access levels</b><span><strong>None</strong> = no access · <strong>Viewer</strong> = view only · <strong>Editor</strong> = task actions · <strong>Full Access</strong> = complete control.</span></div>
     </div>
    </>}
   </section>
  </div>

  {showAdd&&<div className="modal-backdrop" onClick={()=>setShowAdd(false)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()}>
    <div className="modal-head">
     <div><h2>Add User</h2><p>Create a login, then assign rights from the access matrix.</p></div>
    </div>
    <form className="modal-body" onSubmit={add}>
     <label className="modal-field">Username<input value={newUser.username} onChange={e=>setNewUser({...newUser,username:e.target.value})} required/></label>
     <label className="modal-field">Password<input type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} required/></label>
     <label className="modal-field">Department<input value={newUser.department} onChange={e=>setNewUser({...newUser,department:e.target.value})}/></label>
     <label className="modal-field">Role
      <select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>
       <option value="user">User</option>
       <option value="admin">Admin</option>
      </select>
     </label>
     <div className="modal-actions">
      <button type="button" className="secondary-btn" onClick={()=>setShowAdd(false)}>Cancel</button>
      <button className="primary-btn"><UserPlus size={15}/> Create User</button>
     </div>
    </form>
   </section>
  </div>}
 </>
}
