import {LayoutDashboard,ListTodo,Users,CalendarDays,BarChart3,Settings,X,Plus,ShieldCheck,History,LifeBuoy,TrendingUp,ListChecks,PartyPopper} from 'lucide-react'
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
export default function Sidebar({page,setPage,open,setOpen,session}){
 const can=(label)=>session?.isAdmin||String(session?.access?.[label]||'None')!=='None'
 const visibleItems=items.filter(x=>can(x[1]))
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
   {session?.isAdmin&&<><div className="nav-divider"/>
   <button className={page==='admin-access'?'nav-item active':'nav-item'} onClick={()=>{setPage('admin-access');setOpen(false)}}>
    <ShieldCheck size={18}/><span>Admin Access</span>
   </button></>}
  </nav>
  <div className="sidebar-bottom">
   <div className="side-user"><b>{session?.username}</b><small>{session?.department||'Department'}</small></div>
  </div>
 </aside>
}
