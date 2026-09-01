import {useEffect,useMemo,useState} from 'react'
import {ChevronLeft,ChevronRight,RefreshCw,X,CheckSquare,Users,Clock,CalendarCheck} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {fetchChecklist,fetchDelegation,fetchTaskHistory,visibleToUser} from '../services/tasks'
import {getWorkingDates,occurrences} from '../services/calendar'

export default function Calendar({session,refresh}){
 const [tasks,setTasks]=useState([])
 const [history,setHistory]=useState([])
 const [working,setWorking]=useState([])
 const [month,setMonth]=useState(new Date())
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [selected,setSelected]=useState(null)

 const load=async()=>{
  setLoading(true);setError('')
  try{
   const [c,d,w,h]=await Promise.all([fetchChecklist(),fetchDelegation(),getWorkingDates(),fetchTaskHistory().catch(()=>[])])
   setTasks(visibleToUser([...c,...d],session))
   setHistory(h)
   setWorking(w)
  }catch(e){setError(e.message)}
  finally{setLoading(false)}
 }

 useEffect(()=>{load()},[refresh,session.username])

 const range=useMemo(()=>({
  start:new Date(month.getFullYear(),month.getMonth(),1),
  end:new Date(month.getFullYear(),month.getMonth()+1,0)
 }),[month])

 const events=useMemo(()=>occurrences(tasks,range.start,range.end,working),[tasks,range,working])

 // Build a history lookup map by task ID for quick actual date retrieval
 const historyMap=useMemo(()=>{
  const m={}
  history.forEach(h=>{if(h.id)m[String(h.id)]={actualDate:h.actual||h.actualDate||'',status:h.status||h.liveStatus||''}})
  return m
 },[history])

 const counts=useMemo(()=>events.reduce((m,e)=>{
  const k=e.date.toISOString().slice(0,10);(m[k]??=[]).push(e);return m
 },{}),[events])

 const first=(range.start.getDay()+6)%7
 const days=Array.from({length:first+range.end.getDate()},(_,i)=>i<first?null:i-first+1)
 const key=d=>`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
 const today=new Date().toISOString().slice(0,10)

 // Enrich event with actual date from history
 const enrichEvent=e=>({...e,...(historyMap[String(e.id)]||{})})

 function pretty(v){
  if(!v)return null
  const d=new Date(`${v}T12:00:00`)
  if(Number.isNaN(d.getTime()))return v
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
 }

 return <>
  <PageHeader title="Calendar" subtitle="Checklist and delegation tasks, including recurring frequencies. Sundays are holidays."
   action={<div className="calendar-controls">
    <button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={16}/></button>
    <b>{month.toLocaleString('en-US',{month:'long',year:'numeric'})}</b>
    <button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={16}/></button>
    <button className="secondary-btn calendar-refresh" onClick={load}><RefreshCw size={14}/></button>
   </div>}/>

  {error&&<div className="error-box page-error">{error}</div>}

  <div className="panel calendar-panel">
   <div className="calendar-legend">
    <span><i className="legend-check"/> Checklist</span>
    <span><i className="legend-delegation"/> Delegation</span>
    <span><i className="legend-holiday"/> Sunday Holiday</span>
    <span><i className="legend-done"/> Done</span>
    <span><i className="legend-delay"/> Delay</span>
   </div>
   <div className="weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><b key={x}>{x}</b>)}</div>
   <div className="calendar-grid">
    {days.map((d,i)=>d===null?<div key={`blank-${i}`} className="day-cell blank"/>:
     <button key={d} className={`day-cell calendar-day ${key(d)===today?'today':''} ${new Date(range.start.getFullYear(),range.start.getMonth(),d).getDay()===0?'holiday':''}`}
      onClick={()=>setSelected({date:key(d),items:(counts[key(d)]||[]).map(enrichEvent)})}>
      <span>{d}</span>
      <div className="calendar-stack">
       {(counts[key(d)]||[]).slice(0,3).map((x,j)=>{
        const e=enrichEvent(x)
        const st=String(e.liveStatus||e.status||'pending').toLowerCase()
        return <span key={j} className={`calendar-task-chip ${x.type.toLowerCase()} ${st}`} title={x.title}>{x.title}</span>
       })}
       {(counts[key(d)]||[]).length>3&&<em>+{counts[key(d)].length-3} more</em>}
      </div>
     </button>
    )}
   </div>
  </div>

  {loading?<div className="loading-box">Loading calendar…</div>:
   <div className="panel calendar-summary">
    <div><h2>{events.length} planned occurrences</h2><p>Recurring tasks repeat by frequency and skip Sundays.</p></div>
    <button className="secondary-btn" onClick={()=>setSelected({date:today,items:(counts[today]||[]).map(enrichEvent)})}>Today</button>
   </div>}

  {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}>
   <section className="calendar-modal" onClick={e=>e.stopPropagation()}>
    <div className="modal-head">
     <div>
      <h2>{new Date(selected.date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'short',year:'numeric'})}</h2>
      <p>{selected.items.length} task(s)</p>
     </div>
     <button className="icon-btn" onClick={()=>setSelected(null)}><X size={18}/></button>
    </div>
    <div className="calendar-card-stack">
     {selected.items.length?selected.items.map((x,i)=>{
      const st=String(x.liveStatus||x.status||'pending').toLowerCase()
      const isDoneOrDelay=st==='done'||st==='delay'
      return <div className={`calendar-detail-card ${x.type.toLowerCase()} ${st}`} key={i}>
       <div className="calendar-card-icon">{x.type==='Checklist'?<CheckSquare size={16}/>:<Users size={16}/>}</div>
       <div className="calendar-card-info">
        <b>{x.title}</b>
        <span>{x.type} · {x.assignee||'Unassigned'} · {x.frequency}</span>
        {isDoneOrDelay&&x.actualDate&&(
         <span className="calendar-actual-date">
          <CalendarCheck size={13}/> Actual: {pretty(x.actualDate)||x.actualDate}
         </span>
        )}
       </div>
       <div className="calendar-card-right">
        <strong className={`cal-status-badge ${st}`}>{x.liveStatus||x.status}</strong>
        {x.plannedTime&&<span className="cal-time"><Clock size={11}/> {x.plannedTime}</span>}
       </div>
      </div>
     }):<div className="empty-box">No tasks on this date.</div>}
    </div>
   </section>
  </div>}
 </>
}
