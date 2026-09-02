import {useEffect,useMemo,useState} from 'react'
import {ArrowUpRight,RefreshCw} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import TaskRow from '../components/TaskRow'
import {fetchChecklist,fetchDelegation,visibleToUser} from '../services/tasks'
import {localISO} from '../services/sheets'

export default function Dashboard({setPage,session,refresh}){
 const [tasks,setTasks]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=async()=>{setLoading(true);setError('');try{const [c,d]=await Promise.all([fetchChecklist(),fetchDelegation()]);setTasks(visibleToUser([...c,...d],session))}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[refresh,session.username])
 const todayISO=localISO()
 const stats=useMemo(()=>{const total=tasks.length,done=tasks.filter(t=>(t.liveStatus||t.status).toLowerCase()==='done').length,pending=tasks.filter(t=>(t.liveStatus||t.status).toLowerCase()==='pending').length,overdue=tasks.filter(t=>(t.liveStatus||t.status).toLowerCase()==='overdue').length;return {total,done,pending,overdue,score:total?Math.round(done/total*1000)/10:0}},[tasks])
 // Today's list: open tasks planned for today, plus tasks completed today (shown only until end of the day).
 const isFinished=t=>['done','delay'].includes(String(t.liveStatus||t.status).toLowerCase())
 const todayTasks=tasks.filter(t=>isFinished(t)?t.actualISO===todayISO:(t.plannedISO===todayISO||!t.plannedISO)).slice(0,8)
 return <><PageHeader title={`Good morning, ${session.username}`} subtitle="Your work at a glance." action={<button className="secondary-btn" onClick={load}><RefreshCw size={15}/> Refresh</button>}/>
 <div className="stats-grid"><StatCard label="Total Tasks" value={stats.total} meta="Current visible work" accent="blue"/><StatCard label="Completed" value={stats.done} meta="Marked done" accent="green"/><StatCard label="Pending" value={stats.pending} meta="Needs attention" accent="amber"/><StatCard label="Live Score" value={`${stats.score}%`} meta="Current completion rate" accent="purple"/></div>
 {error&&<div className="error-box page-error">{error}</div>}
 <div className="content-grid"><div className="panel"><div className="panel-head"><div><h2>Today's Tasks</h2><p>{todayTasks.length} task(s) shown</p></div><button className="text-btn" onClick={()=>setPage('tasks')}>View all <ArrowUpRight size={14}/></button></div>{loading?<div className="loading-box">Loading tasks…</div>:todayTasks.length?<div className="task-list">{todayTasks.map(t=><TaskRow key={`${t.type}-${t.id}-${t.row}`} task={t} selectable={false}/>)}</div>:<div className="empty-box">No tasks scheduled for today.</div>}</div>
 <div className="panel score-panel"><div className="panel-head"><div><h2>Live Score</h2><p>Simple current performance</p></div></div><div className="score-mini"><strong>{stats.score}%</strong><span>{stats.done} of {stats.total} tasks completed</span><div className="score-track"><i style={{width:`${Math.min(stats.score,100)}%`}}/></div></div><div className="score-lines"><div><span>Completed</span><b>{stats.done}</b></div><div><span>Pending</span><b>{stats.pending}</b></div><div><span>Overdue</span><b>{stats.overdue}</b></div></div><button className="secondary-btn wide" onClick={()=>setPage('reports')}>View Detailed Report</button></div></div>
 <div className="panel"><div className="panel-head"><div><h2>Upcoming Work</h2><p>Next scheduled tasks</p></div></div><div className="upcoming-grid">{tasks.filter(t=>t.plannedISO>todayISO).sort((a,b)=>a.plannedISO.localeCompare(b.plannedISO)).slice(0,8).map(t=><div key={`${t.type}-${t.id}-${t.row}`}><b>{t.planned||'No date'}</b><span>{t.title}</span></div>)}{!tasks.some(t=>t.plannedISO>todayISO)&&<div className="empty-box">No upcoming tasks found.</div>}</div></div></>}
