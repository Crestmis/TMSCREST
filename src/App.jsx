import {useEffect,useState} from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Delegation from './pages/Delegation'
import Calendar from './pages/Calendar'
import Reports from './pages/Reports'
import AssignTask from './pages/AssignTask'
import {Settings} from './pages/SimplePages'
import Login from './pages/Login'
import AdminAccess from './pages/AdminAccess'
import History from './pages/History'
import HelpSupport from './pages/HelpSupport'
import LiveScore from './pages/LiveScore'
import {getSession,logout} from './services/auth'

export default function App(){
 const [session,setSession]=useState(getSession())
 const [page,setPage]=useState('dashboard')
 const [menu,setMenu]=useState(false)
 const [refresh,setRefresh]=useState(0)
 useEffect(()=>{ if(session) sessionStorage.setItem('crest_session',JSON.stringify(session)) },[session])
 if(!session) return <Login onLogin={()=>setSession(getSession())}/>
 const props={setPage,session,refresh,onChanged:()=>setRefresh(x=>x+1)}
 const pageAccess={
  dashboard:'Dashboard',
  tasks:'Tasks List',
  delegation:'Delegation',
  calendar:'Calendar',
  reports:'Reports & Score',
  assign:'Assign Task',
  settings:'Settings',
  'admin-access':'Admin Access',
  history:'History',
  'help-support':'Help & Support',
  livescore:'Live Score'
 }
 const canPage=id=>session.isAdmin||String(session.access?.[pageAccess[id]]||'None')!=='None'
 let content
 switch(canPage(page)?page:'dashboard'){
  case 'tasks': content=<Tasks {...props}/>;break
  case 'delegation': content=<Delegation {...props}/>;break
  case 'calendar': content=<Calendar {...props}/>;break
  case 'reports': content=<Reports {...props}/>;break
  case 'assign': content=<AssignTask {...props}/>;break
  case 'settings': content=<Settings {...props}/>;break
  case 'admin-access': content=session.isAdmin?<AdminAccess {...props} onSessionChanged={setSession}/>:<Dashboard {...props}/>;break
  case 'history': content=<History {...props}/>;break
  case 'help-support': content=<HelpSupport {...props}/>;break
  case 'livescore': content=<LiveScore {...props}/>;break
  default: content=<Dashboard {...props}/>
 }
 return <div className="app-shell">
  <Sidebar page={page} setPage={setPage} open={menu} setOpen={setMenu} session={session}/>
  {menu&&<div className="overlay" onClick={()=>setMenu(false)}/>}
  <main className="main">
   <Topbar onMenu={()=>setMenu(true)} session={session} onLogout={logout}/>
   <div className="page-wrap">{content}</div>
  </main>
  <div className="mobile-nav">
   <button className={page==='dashboard'?'active':''} onClick={()=>setPage('dashboard')}>Home</button>
   <button className={page==='tasks'?'active':''} onClick={()=>setPage('tasks')}>Tasks</button>
   <button className={page==='calendar'?'active':''} onClick={()=>setPage('calendar')}>Calendar</button>
   <button onClick={()=>setMenu(true)}>More</button>
  </div>
 </div>
}
