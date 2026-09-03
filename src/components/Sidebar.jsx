import {LayoutDashboard,ListTodo,Users,CalendarDays,BarChart3,Settings,X,Plus,ShieldCheck,History,LifeBuoy,TrendingUp,ListChecks,PartyPopper,LogOut,User} from 'lucide-react'
const items=[
  ['dashboard','Dashboard',LayoutDashboard],
  ['tasks','Checklist',ListTodo],
  ['delegation','Delegation',Users],
  ['calendar','Calendar',CalendarDays],
  ['holidays','Holidays',PartyPopper],
  ['reports','Reports & Score',BarChart3],
  ['livescore','Live Score',TrendingUp],
  ['all-tasklist','All TasksList',ListChecks],
  ['history','History',History],
  ['help-support','Help & Support',LifeBuoy],
  ['settings','Settings',Settings],
]
export default function Sidebar({page,setPage,open,setOpen,session,onLogout,canAdmin}){
 const can=(label)=>session?.isAdmin||String(session?.access?.[label]||'None')!=='None'
 const visibleItems=items.filter(x=>can(x[1]))
 const go=id=>{setPage(id);setOpen(false)}
 return <aside className={`sidebar ${open?'open':''}`}>
  <div className="brand">
   <div className="brand-mark">C</div>
   <div><b>CREST</b><small>Task Management</small></div>
   <button className="icon-btn mobile-only" onClick={()=>setOpen(false)}><X size={19}/></button>
  </div>
  <nav>
   {visibleItems.map(([id,label,Icon])=>(
    <button key={id} className={page===id?'nav-item active':'nav-item'} onClick={()=>{setPage(id);setOpen(false)}}>
     <Icon size={18}/><span>{label}</span>
    </button>
   ))}
   <div className="nav-divider"/>
   <button style={{display:can('Assign Task')?'flex':'none'}} className={page==='assign'?'nav-item active':'nav-item'} onClick={()=>{setPage('assign');setOpen(false)}}>
    <Plus size={18}/><span>Assign Task</span>
   </button>
   {canAdmin&&<><div className="nav-divider"/>
   <button className={page==='admin-access'?'nav-item active':'nav-item'} onClick={()=>{setPage('admin-access');setOpen(false)}}>
    <ShieldCheck size={18}/><span>Admin Access</span>
   </button></>}
  </nav>
  <div className="sidebar-bottom">
   <button className="side-user" onClick={()=>go('settings')} title="Open your profile settings">
    <span className="user-avatar">{session?.username?.slice(0,2).toUpperCase()||<User size={14}/>}</span>
    <span className="side-user-meta">
     <b>{session?.username||'Account'}</b>
     <small>{session?.role||'user'}{session?.department?` · ${session.department}`:''}</small>
    </span>
   </button>
   <button className="side-logout" onClick={onLogout}><LogOut size={15}/> Sign out</button>
  </div>
 </aside>
}
