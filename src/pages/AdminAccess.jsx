import {useEffect,useState} from 'react'
import {ShieldCheck,Save,RefreshCw,CheckCircle2,Users,UserPlus,Lock,Pencil,Trash2,AlertTriangle} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {loadUsers} from '../services/auth'
import {fetchAccess,saveAccess} from '../services/sheets'
import {createUser,updateUser,deleteUser} from '../services/tasks'

const PAGES=['Dashboard','Checklist','Delegation','Calendar','Holidays','Reports & Score','Assign Task','Settings','History','Help & Support','Live Score','Admin Access','All TasksList','Planned Tasks']
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
 const [showEdit,setShowEdit]=useState(false)
 const [editUser,setEditUser]=useState({username:'',newUsername:'',password:'',department:'',role:'user'})
 const [confirmDelete,setConfirmDelete]=useState(false)
 const [busy,setBusy]=useState(false)

 const load=async(username='')=>{
  setLoading(true);setError('');setSaved(false)
  try{
   const all=await loadUsers(),list=Object.values(all)
   setUsers(list)
   let u=username||selected||list[0]?.username||'admin'
   if(!list.some(x=>x.username===u))u=list[0]?.username||'admin'
   setSelected(u)
   const rows=await fetchAccess(u),next={}
   PAGES.forEach(p=>next[p]='None')
   next['Task Visibility']='Own Tasks'
   next['Calendar Past']='Allowed'
   next['Calendar Future']='Allowed'
   rows.forEach(r=>{let p=String(r.Page||'');if(!p)return;if(p==='Tasks List')p='Checklist';next[p]=String(r.Access||'None')})
   if(u==='admin'){PAGES.forEach(p=>next[p]='Full Access');next['Task Visibility']='All Tasks';next['Calendar Past']='Allowed';next['Calendar Future']='Allowed'}
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
   if(selected===session.username)onSessionChanged?.({...session,access:{...matrix},taskVisibility:matrix['Task Visibility']||'Own Tasks',calendarPast:session.isAdmin||String(matrix['Calendar Past']||'Allowed').toLowerCase()!=='denied',calendarFuture:session.isAdmin||String(matrix['Calendar Future']||'Allowed').toLowerCase()!=='denied'})
  }catch(e){setError(e.message||'Unable to save access.')}
  finally{setSaving(false)}
 }

 const add=async e=>{
  e.preventDefault();setError('');setBusy(true)
  try{
   await createUser(newUser)
   // F4: write an explicit matrix straight away so the new user is never left on the
   // default fallback set. Everything None except a Dashboard landing page.
   const uname=String(newUser.username||'').trim().toLowerCase()
   const seed={}
   PAGES.forEach(p=>{seed[p]='None'})
   seed['Dashboard']='Viewer'
   seed['Task Visibility']='Own Tasks'
   seed['Calendar Past']='Allowed'
   seed['Calendar Future']='Allowed'
   await saveAccess(uname,seed)
   setShowAdd(false)
   setNewUser({username:'',password:'',department:'',role:'user'})
   await load(uname)
  }catch(e){setError(e.message||'Unable to add user.')}
  finally{setBusy(false)}
 }

 const openEdit=()=>{
  const u=users.find(x=>x.username===selected)
  setEditUser({username:selected,newUsername:selected,password:'',department:u?.department||'',role:u?.role||'user'})
  setError('')
  setShowEdit(true)
 }

 const edit=async e=>{
  e.preventDefault();setError('');setBusy(true)
  try{
   const res=await updateUser({username:editUser.username,newUsername:editUser.newUsername.trim().toLowerCase(),password:editUser.password,department:editUser.department,role:editUser.role})
   setShowEdit(false)
   await load(res?.username||editUser.newUsername.trim().toLowerCase())
  }catch(e){setError(e.message||'Unable to update user.')}
  finally{setBusy(false)}
 }

 const remove=async()=>{
  setError('');setBusy(true)
  try{
   await deleteUser(selected)
   setConfirmDelete(false)
   setSelected('')
   await load('')
  }catch(e){setError(e.message||'Unable to delete user.');setConfirmDelete(false)}
  finally{setBusy(false)}
 }

 const setLevel=(page,level)=>{
  if(selected==='admin')return
  setMatrix(m=>({...m,[page]:level}))
 }

 const canDelete=selected&&selected!=='admin'&&selected!==session.username

 return <>
  <PageHeader title="Admin Access" subtitle="Only administrators can manage users, logins and page/task visibility."
   action={<div className="header-actions">
    <button className="secondary-btn" onClick={()=>setShowAdd(true)}><UserPlus size={15}/> Add User</button>
    <button className="primary-btn" onClick={save} disabled={saving||!selected}><Save size={15}/>{saving?'Saving…':'Save Access'}</button>
   </div>}/>
  {error&&<div className="error-box page-error">{error}</div>}
  {saved&&<div className="success-box page-error"><CheckCircle2 size={16}/> Access permissions saved successfully.</div>}

  <div className="admin-banner">
   <ShieldCheck size={20}/>
   <div><b>Default Administrator — Admin</b><span>Username: <strong>admin</strong> · Full access to every page and all users' tasks. This account cannot be renamed or deleted.</span></div>
  </div>

  <div className="access-layout">
   <section className="panel access-users">
    <div className="access-section-head">
     <div><h2>Users</h2><p>Select a user to manage.</p></div>
     <div className="header-actions">
      <button className="secondary-btn icon-only" title="Rename / edit user" onClick={openEdit} disabled={!selected}><Pencil size={13}/></button>
      <button className="secondary-btn icon-only danger" title={canDelete?'Delete user':'This user cannot be deleted'} onClick={()=>setConfirmDelete(true)} disabled={!canDelete}><Trash2 size={13}/></button>
      <button className="secondary-btn icon-only" title="Refresh" onClick={()=>load(selected)}><RefreshCw size={14}/></button>
     </div>
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
      <div className="header-actions">
       <button className="secondary-btn icon-only" title="Rename / edit user" onClick={openEdit} disabled={!selected}><Pencil size={13}/> Edit</button>
       <button className="secondary-btn danger" title={canDelete?'Delete user':'This user cannot be deleted'} onClick={()=>setConfirmDelete(true)} disabled={!canDelete}><Trash2 size={13}/> Delete</button>
      </div>
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

     <div className="visibility-card">
      <div><b>Calendar — Show Past Tasks</b><small>Allow this user to reveal past-dated occurrences in the Calendar.</small></div>
      <label className="check-switch">
       <input type="checkbox" checked={String(matrix['Calendar Past']||'Allowed').toLowerCase()!=='denied'} disabled={selected==='admin'}
        onChange={e=>setMatrix(m=>({...m,'Calendar Past':e.target.checked?'Allowed':'Denied'}))}/>
       <i/>
      </label>
      <strong>{String(matrix['Calendar Past']||'Allowed').toLowerCase()!=='denied'?'Allowed':'Denied'}</strong>
     </div>

     <div className="visibility-card">
      <div><b>Calendar — Show Future Tasks</b><small>Allow this user to reveal future-dated occurrences in the Calendar.</small></div>
      <label className="check-switch">
       <input type="checkbox" checked={String(matrix['Calendar Future']||'Allowed').toLowerCase()!=='denied'} disabled={selected==='admin'}
        onChange={e=>setMatrix(m=>({...m,'Calendar Future':e.target.checked?'Allowed':'Denied'}))}/>
       <i/>
      </label>
      <strong>{String(matrix['Calendar Future']||'Allowed').toLowerCase()!=='denied'?'Allowed':'Denied'}</strong>
     </div>

     <div className="access-help">
      <ShieldCheck size={18}/>
      <div><b>Access levels</b><span><strong>None</strong> = no access · <strong>Viewer</strong> = open the page &amp; submit tasks · <strong>Editor</strong> = also assign / bulk actions · <strong>Full Access</strong> = complete control.</span></div>
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
      <button className="primary-btn" disabled={busy}><UserPlus size={15}/> {busy?'Creating…':'Create User'}</button>
     </div>
    </form>
   </section>
  </div>}

  {showEdit&&<div className="modal-backdrop" onClick={()=>setShowEdit(false)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()}>
    <div className="modal-head">
     <div><h2>Edit User — {editUser.username}</h2><p>Rename the login, reset the password, or change role / department.</p></div>
    </div>
    <form className="modal-body" onSubmit={edit}>
     <label className="modal-field">Username (rename)
      <input value={editUser.newUsername} onChange={e=>setEditUser({...editUser,newUsername:e.target.value})} required disabled={editUser.username==='admin'}/>
     </label>
     <label className="modal-field">New password <small>(leave blank to keep current)</small>
      <input type="password" value={editUser.password} onChange={e=>setEditUser({...editUser,password:e.target.value})} placeholder="••••••••"/>
     </label>
     <label className="modal-field">Department<input value={editUser.department} onChange={e=>setEditUser({...editUser,department:e.target.value})}/></label>
     <label className="modal-field">Role
      <select value={editUser.role} onChange={e=>setEditUser({...editUser,role:e.target.value})} disabled={editUser.username==='admin'}>
       <option value="user">User</option>
       <option value="admin">Admin</option>
      </select>
     </label>
     {editUser.username!=='admin'&&editUser.newUsername.trim().toLowerCase()!==editUser.username&&(
      <div className="notice-box warning"><AlertTriangle size={14}/> Renaming also updates this user's access rows and task assignments.</div>
     )}
     <div className="modal-actions">
      <button type="button" className="secondary-btn" onClick={()=>setShowEdit(false)}>Cancel</button>
      <button className="primary-btn" disabled={busy}><Save size={15}/> {busy?'Saving…':'Save Changes'}</button>
     </div>
    </form>
   </section>
  </div>}

  {confirmDelete&&<div className="modal-backdrop" onClick={()=>setConfirmDelete(false)}>
   <section className="completion-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
    <div className="modal-head">
     <div><h2>Delete user “{selected}”?</h2><p>This removes their login from the master sheet and all of their access rows. It cannot be undone.</p></div>
    </div>
    <div className="modal-actions">
     <button className="secondary-btn" onClick={()=>setConfirmDelete(false)} disabled={busy}>Cancel</button>
     <button className="primary-btn danger" onClick={remove} disabled={busy}><Trash2 size={15}/> {busy?'Deleting…':'Delete User'}</button>
    </div>
   </section>
  </div>}
 </>
}
