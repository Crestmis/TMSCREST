import {useEffect,useMemo,useState} from 'react'
import {RefreshCw,Search,History as HistoryIcon,Filter,CalendarDays,Users} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {fetchTaskHistory,fetchChecklist,fetchDelegation,visibleToUser} from '../services/tasks'

export default function History({session,refresh}){
 const [rows,setRows]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [q,setQ]=useState('')
 const [statusFilter,setStatusFilter]=useState('all')
 const [dateFilter,setDateFilter]=useState('')
 const [doerFilter,setDoerFilter]=useState('all')

 const load=async()=>{
  setLoading(true);setError('')
  try{
   let h=await fetchTaskHistory()
   if(!h.length){
    const [c,d]=await Promise.all([fetchChecklist(),fetchDelegation()])
    h=[...c,...d]
     .filter(t=>['done','delay'].includes(String(t.status).toLowerCase()))
   }
   setRows(visibleToUser(h,session))
  }catch(e){setError(e.message||'Unable to load history.')}
  finally{setLoading(false)}
 }

 useEffect(()=>{load()},[refresh,session.username,session.taskVisibility])

 const doers=useMemo(()=>[...new Set(rows.map(r=>r.assignee).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),[rows])

 const filtered=useMemo(()=>rows.filter(r=>{
  const st=String(r.status||'').toLowerCase()
  const matchQ=`${r.id} ${r.title} ${r.assignee} ${r.givenBy} ${r.status}`.toLowerCase().includes(q.toLowerCase())
  const matchStatus=statusFilter==='all'||st===statusFilter
  const matchDate=!dateFilter||(r.plannedISO===dateFilter)||(r.actualISO===dateFilter)
  const matchDoer=doerFilter==='all'||r.assignee===doerFilter
  return matchQ&&matchStatus&&matchDate&&matchDoer
 }),[rows,q,statusFilter,dateFilter,doerFilter])

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

 return <>
  <PageHeader title="History" subtitle="Submitted task history with planned date, actual date and final status."
   action={<button className="secondary-btn" onClick={load}><RefreshCw size={15}/> Refresh</button>}/>

  {/* Stats row */}
  <div className="history-stats">
   <div className="hstat hstat-done"><span>{stats.done}</span><small>Done</small></div>
   <div className="hstat hstat-delay"><span>{stats.delay}</span><small>Delayed</small></div>
   <div className="hstat hstat-overdue"><span>{stats.overdue}</span><small>Overdue</small></div>
   <div className="hstat hstat-total"><span>{rows.length}</span><small>Total</small></div>
  </div>

  <div className="toolbar history-toolbar">
   <div className="search-box">
    <Search size={16}/>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search task, doer or status..."/>
   </div>

   <label className="filter-field">
    <Users size={14}/>
    <select value={doerFilter} onChange={e=>setDoerFilter(e.target.value)}>
     <option value="all">All Doers</option>
     {doers.map(d=><option key={d}>{d}</option>)}
    </select>
   </label>

   <label className="filter-field">
    <CalendarDays size={14}/>
    <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} title="Filter by date"/>
   </label>

   <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
    <option value="all">All Status</option>
    <option value="done">Done</option>
    <option value="delay">Delay</option>
    <option value="overdue">Overdue</option>
   </select>

   <button className="secondary-btn" onClick={()=>{setQ('');setStatusFilter('all');setDateFilter('');setDoerFilter('all')}}>
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
        <th>Planned</th>
        <th>Actual Date &amp; Time</th>
        <th>Status</th>
        <th>Type</th>
       </tr>
      </thead>
      <tbody>
       {filtered.map(r=>(
        <tr className={`history-row ${statusClass(r.status)}`} key={`${r.type}-${r.id}-${r.row}`}>
         <td><span className="history-id">{r.id}</span></td>
         <td>
          <b>{r.title}</b>
          {r.givenBy&&<small>Given by {r.givenBy}</small>}
         </td>
         <td>{r.assignee||'—'}</td>
         <td>{r.planned||'—'}</td>
         <td>{r.actual||r.actualDate||'—'}{r.actual?'':(r.actualTime?` ${r.actualTime}`:'')}</td>
         <td><span className={`status ${cls(r.status)}`}>{r.status}</span></td>
         <td><span className={`history-type-badge ${String(r.type||'').toLowerCase()}`}>{r.type}</span></td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>:
    <div className="empty-box"><HistoryIcon size={18}/> No submitted history found.</div>}
  </div>
 </>
}
