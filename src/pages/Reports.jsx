import {useEffect,useMemo,useState} from 'react'
import {RefreshCw,Search,Users,CalendarDays} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import CollapsibleControls from '../components/CollapsibleControls'
import {fetchChecklist,fetchDelegation,visibleToUser} from '../services/tasks'

export default function Reports({session,refresh}){
 const [tasks,setTasks]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const [q,setQ]=useState('')
 const [doerFilter,setDoerFilter]=useState('all')
 const [typeFilter,setTypeFilter]=useState('all')
 const [dateFrom,setDateFrom]=useState('')
 const [dateTo,setDateTo]=useState('')

 const load=async()=>{
  setLoading(true);setError('')
  try{const [c,d]=await Promise.all([fetchChecklist(),fetchDelegation()]);setTasks(visibleToUser([...c,...d],session))}
  catch(e){setError(e.message)}finally{setLoading(false)}
 }
 useEffect(()=>{load()},[refresh,session.username])

 const doers=useMemo(()=>[...new Set(tasks.map(t=>t.assignee).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),[tasks])

 const filtered=useMemo(()=>tasks.filter(t=>{
  const iso=t.plannedISO||''
  const matchQ=`${t.id} ${t.title} ${t.assignee} ${t.givenBy}`.toLowerCase().includes(q.toLowerCase())
  const matchDoer=doerFilter==='all'||t.assignee===doerFilter
  const matchType=typeFilter==='all'||String(t.type||'').toLowerCase()===typeFilter
  const matchFrom=!dateFrom||iso>=dateFrom
  const matchTo=!dateTo||iso<=dateTo
  return matchQ&&matchDoer&&matchType&&matchFrom&&matchTo
 }),[tasks,q,doerFilter,typeFilter,dateFrom,dateTo])

 const s=useMemo(()=>{
  const list=filtered
  const total=list.length
  const isDone=t=>String(t.liveStatus||t.status).toLowerCase()==='done'
  const done=list.filter(isDone).length
  const pending=list.filter(t=>String(t.liveStatus||t.status).toLowerCase()!=='done').length
  const overdue=list.filter(t=>String(t.liveStatus||t.status).toLowerCase()==='overdue').length
  const check=list.filter(t=>t.type==='Checklist'),del=list.filter(t=>t.type==='Delegation')
  const pct=a=>a.length?Math.round(a.filter(isDone).length/a.length*1000)/10:0
  return {total,done,pending,overdue,score:pct(list),checkScore:pct(check),delScore:pct(del),
   checkDone:check.filter(isDone).length,checkTotal:check.length,
   delDone:del.filter(isDone).length,delTotal:del.length}
 },[filtered])

 const today=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})()
 const setToday=()=>{setDateFrom(today);setDateTo(today)}
 const setThisWeek=()=>{
  const now=new Date(),day=now.getDay()
  const mon=new Date(now);mon.setDate(now.getDate()-(day===0?6:day-1));mon.setHours(0,0,0,0)
  const sat=new Date(mon);sat.setDate(mon.getDate()+5)
  const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  setDateFrom(fmt(mon));setDateTo(fmt(sat))
 }
 const clearFilters=()=>{setDoerFilter('all');setTypeFilter('all');setDateFrom('');setDateTo('')}
 const activeCount=(doerFilter!=='all'?1:0)+(typeFilter!=='all'?1:0)+(dateFrom?1:0)+(dateTo?1:0)

 return <>
  <PageHeader title="Reports & Score" subtitle="Detailed live performance summary — filter by doer, type or date range."
   action={<button className="secondary-btn" onClick={load}><RefreshCw size={15}/> Refresh</button>}/>

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
     <button className="secondary-btn" onClick={setToday}>Today</button>
     <button className="secondary-btn" onClick={setThisWeek}>This Week</button>
    </div>
   </div>
  </CollapsibleControls>

  <p className="muted-note" style={{padding:'0 4px 10px',fontSize:13}}>Report is based on {filtered.length} of {tasks.length} visible task(s).</p>

  {error&&<div className="error-box page-error">{error}</div>}
  {loading?<div className="panel loading-box">Calculating report…</div>:<>
   <div className="report-hero">
    <div className="panel"><small>Overall Live Score</small><strong>{s.score}%</strong><span>{s.done} completed of {s.total} tasks</span><div className="score-track large"><i style={{width:`${Math.min(s.score,100)}%`}}/></div></div>
    <div className="panel"><div className="panel-head"><div><h2>Score Breakdown</h2><p>Short, detailed view of current performance.</p></div></div><div className="report-bars"><div><span>Checklist</span><i><em style={{width:`${s.checkScore}%`}}/></i><b>{s.checkScore}%</b></div><div><span>Delegation</span><i><em style={{width:`${s.delScore}%`}}/></i><b>{s.delScore}%</b></div></div></div>
   </div>
   <div className="stats-grid">
    <div className="stat-card"><span>Completed</span><strong>{s.done}</strong><small>Matching tasks</small></div>
    <div className="stat-card"><span>Pending</span><strong>{s.pending}</strong><small>Not yet completed</small></div>
    <div className="stat-card"><span>Overdue</span><strong>{s.overdue}</strong><small>Needs attention</small></div>
    <div className="stat-card"><span>Total</span><strong>{s.total}</strong><small>In current view</small></div>
   </div>
   <div className="content-grid">
    <div className="panel"><div className="panel-head"><div><h2>Detailed Structure</h2><p>Current counts used by the live percentage.</p></div></div><div className="score-lines"><div><span>Overall completed</span><b>{s.done}/{s.total}</b></div><div><span>Checklist completed</span><b>{s.checkDone}/{s.checkTotal}</b></div><div><span>Delegation completed</span><b>{s.delDone}/{s.delTotal}</b></div><div><span>Pending</span><b>{s.pending}</b></div><div><span>Overdue</span><b>{s.overdue}</b></div></div></div>
    <div className="panel"><div className="panel-head"><div><h2>Score Meaning</h2><p>Simple interpretation.</p></div></div><div className="summary-list"><div><span>90–100%</span><b>Excellent</b></div><div><span>75–89.9%</span><b>Good</b></div><div><span>50–74.9%</span><b>Needs focus</b></div><div><span>Below 50%</span><b>Attention required</b></div></div></div>
   </div>
  </>}
 </>
}
