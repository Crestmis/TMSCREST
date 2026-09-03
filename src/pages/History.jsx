import {useEffect,useMemo,useState} from 'react'
import {RefreshCw,Search,History as HistoryIcon,Filter,CalendarDays,Users,ListFilter} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {fetchAllHistory,visibleToUser} from '../services/tasks'

export default function History({session,refresh}){
 const [rows,setRows]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [q,setQ]=useState('')
 const [statusFilter,setStatusFilter]=useState('all')
 const [typeFilter,setTypeFilter]=useState('all')
 const [dateFilter,setDateFilter]=useState('')
 const [doerFilter,setDoerFilter]=useState('all')

 const load=async()=>{
  setLoading(true);setError('')
  try{
   const h=await fetchAllHistory()
   setRows(visibleToUser(h,session))
  }catch(e){setError(e.message||'Unable to load history.')}
  finally{setLoading(false)}
 }

 useEffect(()=>{load()},[refresh,session.username,session.taskVisibility])

 const doers=useMemo(()=>[...new Set(rows.map(r=>r.assignee).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),[rows])

 const filtered=useMemo(()=>rows.filter(r=>{
  const st=String(r.status||'').toLowerCase()
  const ty=String(r.type||'').toLowerCase()
  const matchQ=`${r.id} ${r.title} ${r.assignee} ${r.givenBy} ${r.department} ${r.status}`.toLowerCase().includes(q.toLowerCase())
  const matchStatus=statusFilter==='all'||st===statusFilter
  const matchType=typeFilter==='all'||ty===typeFilter
  const matchDate=!dateFilter||(r.plannedISO===dateFilter)||(r.actualISO===dateFilter)
  const matchDoer=doerFilter==='all'||r.assignee===doerFilter
  return matchQ&&matchStatus&&matchType&&matchDate&&matchDoer
 }),[rows,q,statusFilter,typeFilter,dateFilter,doerFilter])

 const statusClass=s=>{
  const l=String(s||'').toLowerCase().trim()
  if(l==='done') return 'history-row-done'
  if(l==='delay') return 'history-row-delay'
  if(l==='overdue') return 'history-row-overdue'
  return 'history-row-pending'
 }
 const cls=s=>String(s||'').toLowerCase().replace(/\s+/g,'-')

 const stats={
  done:rows.filter(r=>String(r.status||'').toLowerCase()==='done').length,
  delay:rows.filter(r=>String(r.status||'').toLowerCase()==='delay').length,
  overdue:rows.filter(r=>String(r.status||'').toLowerCase()==='overdue').length,
 }

 const clearFilters=()=>{setQ('');setStatusFilter('all');setTypeFilter('all');setDateFilter('');setDoerFilter('all')}

 return <>
  <PageHeader title="History" subtitle={`${session?.isAdmin?'Every submitted task across all users':'Your submitted task history'} — planned date, actual date & time, doer and final status. Checklist + Delegation.`}
   action={<button className="secondary-btn" onClick={load}><RefreshCw size={15}/> Refresh</button>}/>

  <div className="history-stats">
   <div className="hstat hstat-done"><span>{stats.done}</span><small>Done</small></div>
   <div className="hstat hstat-delay"><span>{stats.delay}</span><small>Delayed</small></div>
   <div className="hstat hstat-overdue"><span>{stats.overdue}</span><small>Overdue</small></div>
   <div className="hstat hstat-total"><span>{rows.length}</span><small>Total</small></div>
  </div>

  <div className="toolbar history-toolbar">
   <div className="search-box">
    <Search size={16}/>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search task, doer, department or status..."/>
   </div>

   <label className="filter-field">
    <Users size={14}/>
    <select value={doerFilter} onChange={e=>setDoerFilter(e.target.value)}>
     <option value="all">All Doers</option>
     {doers.map(d=><option key={d}>{d}</option>)}
    </select>
   </label>

   <label className="filter-field">
    <ListFilter size={14}/>
    <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
     <option value="all">All Types</option>
     <option value="checklist">Checklist</option>
     <option value="delegation">Delegation</option>
    </select>
   </label>

   <label className="filter-field">
    <CalendarDays size={14}/>
    <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} title="Filter by planned / actual date"/>
   </label>

   <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
    <option value="all">All Status</option>
    <option value="done">Done</option>
    <option value="delay">Delay</option>
    <option value="overdue">Overdue</option>
   </select>

   <button className="secondary-btn" onClick={clearFilters}>
    <Filter size={15}/> Clear
   </button>
  </div>

  {error&&<div className="error-box page-error">{error}</div>}

  <div className="panel history-panel">
   {loading?<div className="loading-box">Loading history…</div>:
    filtered.length?
    <div className="history-table-wrap">
     <table className="history-table">
      <thead>
       <tr>
        <th>Task ID</th>
        <th>Task Name</th>
        <th>Doer</th>
        <th>Department</th>
        <th>Planned</th>
        <th>Actual Date &amp; Time</th>
        <th>Status</th>
        <th>Type</th>
       </tr>
      </thead>
      <tbody>
       {filtered.map(r=>(
        <tr className={`history-row ${statusClass(r.status)}`} key={`${r.type}-${r.id}-${r.actualISO||r.plannedISO||r.row}`}>
         <td><span className="history-id">{r.id}</span></td>
         <td>
          <b>{r.title}</b>
          {r.givenBy&&<small>Given by {r.givenBy}</small>}
          {r.remarks&&<small title={r.remarks}>“{r.remarks}”</small>}
         </td>
         <td>{r.assignee||'—'}</td>
         <td>{r.department||'—'}</td>
         <td>{r.planned||'—'}{r.plannedTime?` ${r.plannedTime}`:''}</td>
         <td>{r.actual||r.actualDate||'—'}</td>
         <td><span className={`status ${cls(r.status)}`}>{r.status}</span></td>
         <td><span className={`history-type-badge ${String(r.type||'').toLowerCase()}`}>{r.type}</span></td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>:
    <div className="empty-box"><HistoryIcon size={18}/> No submitted history found.</div>}
  </div>

  <p className="muted-note" style={{padding:'10px 4px 0',fontSize:13}}>Showing {filtered.length} of {rows.length} record(s).{session?.isAdmin?' Admin view — all users.':''}</p>
 </>
}
