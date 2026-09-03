import {useEffect,useMemo,useState} from 'react'
import {TrendingUp,RefreshCw,CalendarDays,Users,Search} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import CollapsibleControls from '../components/CollapsibleControls'
import {fetchChecklist,fetchDelegation,fetchTaskHistory,visibleToUser} from '../services/tasks'

function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function pretty(v){if(!v)return '—';const d=new Date(`${v}T12:00:00`);return Number.isNaN(d.getTime())?v:`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}

export default function LiveScore({session,refresh}){
 const [tasks,setTasks]=useState([])
 const [history,setHistory]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [q,setQ]=useState('')
 const [doerFilter,setDoerFilter]=useState('all')
 const [dateFrom,setDateFrom]=useState('')
 const [dateTo,setDateTo]=useState('')
 const [typeFilter,setTypeFilter]=useState('all')

 const load=async()=>{
  setLoading(true);setError('')
  try{
   const [c,d,h]=await Promise.all([fetchChecklist(),fetchDelegation(),fetchTaskHistory().catch(()=>[])])
   const all=visibleToUser([...c,...d],session)
   setTasks(all)
   setHistory(h)
  }catch(e){setError(e.message||'Unable to load score data.')}
  finally{setLoading(false)}
 }

 useEffect(()=>{load()},[refresh,session.username])

 // Merge tasks with history actuals
 const merged=useMemo(()=>{
  const histMap={}
  history.forEach(h=>{if(h.id)histMap[String(h.id)]={actual:h.actual||h.actualDate||'',actualISO:h.actualISO||'',status:String(h.status||''),completionType:h.completionType||''}})
  return tasks.map(t=>{
   const h=histMap[String(t.id)]||{}
   return {
    ...t,
    actual:h.actual||t.actual||'',
    actualISO:h.actualISO||t.actualISO||'',
    finalStatus:h.status||String(t.liveStatus||t.status||'Pending'),
    completionType:h.completionType||t.completionType||''
   }
  })
 },[tasks,history])

 const doers=useMemo(()=>[...new Set(merged.map(t=>t.assignee).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),[merged])

 const filtered=useMemo(()=>merged.filter(t=>{
  const st=String(t.finalStatus||'').toLowerCase()
  const iso=t.plannedISO||''
  const matchQ=`${t.id} ${t.title} ${t.assignee} ${t.givenBy}`.toLowerCase().includes(q.toLowerCase())
  const matchDoer=doerFilter==='all'||t.assignee===doerFilter
  const matchType=typeFilter==='all'||t.type.toLowerCase()===typeFilter
  const matchFrom=!dateFrom||iso>=dateFrom
  const matchTo=!dateTo||iso<=dateTo
  return matchQ&&matchDoer&&matchType&&matchFrom&&matchTo
 }),[merged,q,doerFilter,typeFilter,dateFrom,dateTo])

 const score=useMemo(()=>{
  if(!filtered.length)return {pct:0,done:0,delay:0,overdue:0,pending:0,total:0}
  const done=filtered.filter(t=>String(t.finalStatus||'').toLowerCase()==='done').length
  const delay=filtered.filter(t=>String(t.finalStatus||'').toLowerCase()==='delay').length
  const overdue=filtered.filter(t=>String(t.finalStatus||'').toLowerCase()==='overdue').length
  const pending=filtered.filter(t=>!['done','delay','overdue'].includes(String(t.finalStatus||'').toLowerCase())).length
  const total=filtered.length
  const pct=Math.round((done/total)*1000)/10
  return {pct,done,delay,overdue,pending,total}
 },[filtered])

 const scoreColor=score.pct>=90?'#10b981':score.pct>=75?'#3b82f6':score.pct>=50?'#f59e0b':'#ef4444'
 const today=todayISO()

 const setTodayFilter=()=>{setDateFrom(today);setDateTo(today)}
 const setThisWeek=()=>{
  const now=new Date()
  const day=now.getDay()
  const mon=new Date(now);mon.setDate(now.getDate()-(day===0?6:day-1));mon.setHours(0,0,0,0)
  const sat=new Date(mon);sat.setDate(mon.getDate()+5)
  const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  setDateFrom(fmt(mon));setDateTo(fmt(sat))
 }
 const clearFilters=()=>{setDoerFilter('all');setTypeFilter('all');setDateFrom('');setDateTo('')}
 const activeCount=(doerFilter!=='all'?1:0)+(typeFilter!=='all'?1:0)+(dateFrom?1:0)+(dateTo?1:0)

 const statusClass=s=>{
  const l=String(s||'').toLowerCase()
  if(l==='done')return 'score-done'
  if(l==='delay')return 'score-delay'
  if(l==='overdue')return 'score-overdue'
  return 'score-pending'
 }

 return <>
  <PageHeader title="Live Score" subtitle="Real-time performance scoresheet with date and doer filtering."
   action={<button className="secondary-btn" onClick={load}><RefreshCw size={15}/> Refresh</button>}/>

  {/* Score Hero */}
  <div className="livescore-hero">
   <div className="panel lsh-score-card">
    <small>Live Score</small>
    <div className="lsh-big-score" style={{color:scoreColor}}>{score.pct}%</div>
    <div className="lsh-score-track"><div className="lsh-score-fill" style={{width:`${Math.min(score.pct,100)}%`,background:scoreColor}}/></div>
    <span>{score.done} done of {score.total} tasks</span>
   </div>
   <div className="lsh-stat-grid">
    <div className="lsh-stat lsh-done"><b>{score.done}</b><small>Done</small></div>
    <div className="lsh-stat lsh-delay"><b>{score.delay}</b><small>Delayed</small></div>
    <div className="lsh-stat lsh-overdue"><b>{score.overdue}</b><small>Overdue</small></div>
    <div className="lsh-stat lsh-pending"><b>{score.pending}</b><small>Pending</small></div>
   </div>
  </div>

  {/* Filters */}
  <div className="toolbar">
   <div className="search-box">
    <Search size={16}/>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search task, doer, ID..."/>
   </div>
  </div>

  <CollapsibleControls label="Filters" activeCount={activeCount} onClear={clearFilters}>
   <div className="toolbar livescore-toolbar">
    <label className="filter-field">
     <Users size={14}/>
     <select value={doerFilter} onChange={e=>setDoerFilter(e.target.value)}>
      <option value="all">All Doers</option>
      {doers.map(d=><option key={d}>{d}</option>)}
     </select>
    </label>

    <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
     <option value="all">All Types</option>
     <option value="checklist">Checklist</option>
     <option value="delegation">Delegation</option>
    </select>

    <label className="filter-field">
     <CalendarDays size={14}/>
     <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} title="From date"/>
    </label>
    <span className="date-range-sep">–</span>
    <label className="filter-field">
     <CalendarDays size={14}/>
     <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} title="To date"/>
    </label>

    <div className="livescore-quick-dates">
     <button className="secondary-btn" onClick={setTodayFilter}>Today</button>
     <button className="secondary-btn" onClick={setThisWeek}>This Week</button>
    </div>
   </div>
  </CollapsibleControls>

  {error&&<div className="error-box page-error">{error}</div>}

  <div className="panel livescore-panel">
   {loading?<div className="loading-box">Loading score data…</div>:
   filtered.length?
   <div className="livescore-table-wrap">
    <table className="livescore-table">
     <thead>
      <tr>
       <th>Task ID</th>
       <th>Task Name</th>
       <th>Doer</th>
       <th>Given By</th>
       <th>Type</th>
       <th>Planned Date</th>
       <th>Actual Date &amp; Time</th>
       <th>Status</th>
      </tr>
     </thead>
     <tbody>
      {filtered.map((t,i)=>(
       <tr key={`${t.type}-${t.id}-${i}`} className={`livescore-row ${statusClass(t.finalStatus)}`}>
        <td><span className="history-id">{t.id}</span></td>
        <td>
         <b>{t.title}</b>
         {t.department&&<small>{t.department}</small>}
        </td>
        <td>{t.assignee||'—'}</td>
        <td>{t.givenBy||'—'}</td>
        <td><span className={`type-badge ${String(t.type||'').toLowerCase()}`}>{t.type}</span></td>
        <td>{pretty(t.plannedISO)||t.planned||'—'}</td>
        <td>{t.actual||'—'}</td>
        <td><span className={`status ${String(t.finalStatus||'pending').toLowerCase().replace(/\s+/g,'-')}`}>{t.finalStatus}</span></td>
       </tr>
      ))}
     </tbody>
    </table>
   </div>:
   <div className="empty-box"><TrendingUp size={18}/> No tasks match the current filters.</div>}
  </div>
 </>
}
