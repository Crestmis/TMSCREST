import {useEffect,useState} from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Delegation from './pages/Delegation'
import Calendar from './pages/Calendar'
import Holidays from './pages/Holidays'
import Reports from './pages/Reports'
import AssignTask from './pages/AssignTask'
import {Settings} from './pages/SimplePages'
import Login from './pages/Login'
import AdminAccess from './pages/AdminAccess'
import AllTaskList from './pages/AllTaskList'
import History from './pages/History'
import HelpSupport from './pages/HelpSupport'
import LiveScore from './pages/LiveScore'
import {getSession,logout,refreshAccess} from './services/auth'

export default function App(){
 const [session,setSession]=useState(getSession())
 const [page,setPage]=useState('dashboard')
 const [menu,setMenu]=useState(false)
 const [refresh,setRefresh]=useState(0)
 const [assignHint,setAssignHint]=useState('delegation')
 useEffect(()=>{ if(session) sessionStorage.setItem('crest_session',JSON.stringify(session)) },[session])
 // F3: on every app load, re-sync this user's permissions from ACCESS CONTROL so an
 // admin's matrix change reaches them on their next page reload (no full re-login needed).
 useEffect(()=>{ refreshAccess().then(s=>{ if(s) setSession(s) }) },[])
 if(!session) return <Login onLogin={()=>setSession(getSession())}/>
 const props={setPage,session,refresh,assignHint,setAssignHint,onChanged:()=>setRefresh(x=>x+1)}
 const pageAccess={
  dashboard:'Dashboard',
  tasks:'Checklist',
  delegation:'Delegation',
  calendar:'Calendar',
  holidays:'Holidays',
  reports:'Reports & Score',
  assign:'Assign Task',
  settings:'Settings',
  'admin-access':'Admin Access',
  'all-tasklist':'All TasksList',
  history:'History',
  'help-support':'Help & Support',
  livescore:'Live Score'
 }
 const canPage=id=>session.isAdmin||String(session.access?.[pageAccess[id]]||'None')!=='None'
 // Admin Access opens for the superadmin, or a user explicitly granted Editor/Full Access to it.
 const canAdmin=session.isAdmin||['Editor','Full Access'].includes(String(session.access?.['Admin Access']||''))
 let content
 switch(canPage(page)?page:'dashboard'){
  case 'tasks': content=<Tasks {...props}/>;break
  case 'delegation': content=<Delegation {...props}/>;break
  case 'calendar': content=<Calendar {...props}/>;break
  case 'holidays': content=<Holidays {...props}/>;break
  case 'reports': content=<Reports {...props}/>;break
  case 'assign': content=<AssignTask {...props}/>;break
  case 'settings': content=<Settings {...props}/>;break
  case 'admin-access': content=canAdmin?<AdminAccess {...props} onSessionChanged={setSession}/>:<Dashboard {...props}/>;break
  case 'all-tasklist': content=<AllTaskList {...props}/>;break
  case 'history': content=<History {...props}/>;break
  case 'help-support': content=<HelpSupport {...props}/>;break
  case 'livescore': content=<LiveScore {...props}/>;break
  default: content=<Dashboard {...props}/>
 }
 return <div className="app-shell">
  <Sidebar page={page} setPage={setPage} open={menu} setOpen={setMenu} session={session} onLogout={logout} canAdmin={canAdmin}/>
  {menu&&<div className="overlay" onClick={()=>setMenu(false)}/>}
  <main className="main">
   <Topbar onMenu={()=>setMenu(true)} session={session} onLogout={logout}/>
   <div className="page-wrap">{content}</div>
  </main>
  <div className="mobile-nav">
   <button className={page==='dashboard'?'active':''} onClick={()=>setPage('dashboard')}>Home</button>
   <button className={page==='tasks'?'active':''} onClick={()=>setPage('tasks')}>Checklist</button>
   <button className={page==='calendar'?'active':''} onClick={()=>setPage('calendar')}>Calendar</button>
   <button onClick={()=>setMenu(true)}>More</button>
  </div>
 </div>
}
