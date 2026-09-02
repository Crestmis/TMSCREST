import {useEffect,useMemo,useState} from 'react'
import {ChevronLeft,ChevronRight,RefreshCw,X,CheckSquare,Users,Clock,CalendarCheck,Lock,PartyPopper} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {fetchChecklist,fetchDelegation,fetchTaskHistory,visibleToUser} from '../services/tasks'
import {localISO,displayDateTime,normalize} from '../services/sheets'
import {getWorkingDates,occurrences,getHolidays,holidayMap} from '../services/calendar'

const VIEW_KEY='crest_calendar_view_v1'
function readView(){try{return {past:true,future:true,...JSON.parse(localStorage.getItem(VIEW_KEY)||'{}')}}catch{return {past:true,future:true}}}
function writeView(v){try{localStorage.setItem(VIEW_KEY,JSON.stringify(v))}catch{}}

export default function Calendar({session,refresh}){
 const canPast=session?.isAdmin||session?.calendarPast!==false
 const canFuture=session?.isAdmin||session?.calendarFuture!==false
 const canFilterDoer=session?.isAdmin||['Editor','Full Access'].includes(session?.access?.['Calendar'])

 const [tasks,setTasks]=useState([])
 const [history,setHistory]=useState([])
 const [working,setWorking]=useState([])
 const [holidays,setHolidays]=useState([])
 const [month,setMonth]=useState(new Date())
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [selected,setSelected]=useState(null)
 const [doer,setDoer]=useState('all')
 const [view,setView]=useState(()=>{const v=readView();return {past:v.past&&canPast,future:v.future&&canFuture}})

 const setViewFlag=(k,val)=>setView(v=>{const next={...v,[k]:val};writeView(next);return next})

 const load=async()=>{
  setLoading(true);setError('')
  try{
   const [c,d,w,h,hol]=await Promise.all([fetchChecklist(),fetchDelegation(),getWorkingDates(),fetchTaskHistory().catch(()=>[]),getHolidays().catch(()=>[])])
   setTasks(visibleToUser([...c,...d],session))
   setHistory(h)
   setWorking(w)
   setHolidays(hol)
  }catch(e){setError(e.message)}
  finally{setLoading(false)}
 }

 useEffect(()=>{load()},[refresh,session.username])

 const range=useMemo(()=>({
  start:new Date(month.getFullYear(),month.getMonth(),1),
  end:new Date(month.getFullYear(),month.getMonth()+1,0)
 }),[month])

 const today=localISO()
 const holMap=useMemo(()=>holidayMap(holidays),[holidays])

 // Occurrences: recurrences expanded, Sundays + marked holidays skipped and pushed to the next working day.
 const allEvents=useMemo(()=>occurrences(tasks,range.start,range.end,working,holidays),[tasks,range,working,holidays])

 const doers=useMemo(()=>[...new Set(tasks.map(t=>t.assignee).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),[tasks])

 const events=useMemo(()=>allEvents.filter(e=>{
  if(canFilterDoer&&doer!=='all'&&normalize(e.assignee)!==normalize(doer)) return false
  const d=e.occurrenceDate
  if(d<today) return view.past
  if(d>today) return view.future
  return true
 }),[allEvents,view.past,view.future,today,canFilterDoer,doer])

 const historyMap=useMemo(()=>{
  const m={}
  history.forEach(h=>{if(h.id)m[String(h.id)]={actualDate:h.actualDate||'',actualTime:h.actualTime||'',actual:h.actual||'',status:h.status||h.liveStatus||''}})
  return m
 },[history])

 const counts=useMemo(()=>events.reduce((m,e)=>{
  const k=e.occurrenceDate;(m[k]??=[]).push(e);return m
 },{}),[events])

 const first=(range.start.getDay()+6)%7
 const days=Array.from({length:first+range.end.getDate()},(_,i)=>i<first?null:i-first+1)
 const key=d=>`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

 const enrichEvent=e=>{
  const h=historyMap[String(e.id)]||{}
  return {...e,actualDate:h.actualDate||e.actualDate||'',actualTime:h.actualTime||e.actualTime||'',actual:h.actual||e.actual||'',...(h.status?{status:h.status}:{})}
 }

 return <>
  <PageHeader title="Calendar" subtitle="Every scheduled task, with recurring frequencies. Sundays and marked holidays are skipped — those tasks move to the next working day."
   action={<div className="calendar-controls">
    <button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={16}/></button>
    <b>{month.toLocaleString('en-US',{month:'long',year:'numeric'})}</b>
    <button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={16}/></button>
    <button className="secondary-btn calendar-refresh" onClick={load}><RefreshCw size={14}/></button>
   </div>}/>

  {error&&<div className="error-box page-error">{error}</div>}

  <div className="calendar-view-toggles">
   <label className={`cal-toggle ${!canPast?'disabled':''}`} title={canPast?'':'Not permitted for your account'}>
    <input type="checkbox" checked={view.past} disabled={!canPast} onChange={e=>setViewFlag('past',e.target.checked)}/>
    <span>Show Past Tasks{!canPast&&<Lock size={11}/>}</span>
   </label>
   <label className={`cal-toggle ${!canFuture?'disabled':''}`} title={canFuture?'':'Not permitted for your account'}>
    <input type="checkbox" checked={view.future} disabled={!canFuture} onChange={e=>setViewFlag('future',e.target.checked)}/>
    <span>Show Future Tasks{!canFuture&&<Lock size={11}/>}</span>
   </label>
   {canFilterDoer&&<label className="filter-field cal-doer-filter">
    <Users size={14}/>
    <select value={doer} onChange={e=>setDoer(e.target.value)} title="Filter by doer">
     <option value="all">All Doers</option>
     {doers.map(x=><option key={x}>{x}</option>)}
    </select>
   </label>}
   <small>{events.length} of {allEvents.length} occurrences shown</small>
  </div>

  <div className="panel calendar-panel">
   <div className="calendar-legend">
    <span><i className="legend-check"/> Checklist</span>
    <span><i className="legend-delegation"/> Delegation</span>
    <span><i className="legend-today"/> Today</span>
    <span><i className="legend-festival"/> Festival holiday</span>
    <span><i className="legend-holiday"/> Sunday</span>
    <span><i className="legend-done"/> Done</span>
    <span><i className="legend-delay"/> Delay</span>
   </div>
   <div className="weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><b key={x}>{x}</b>)}</div>
   <div className="calendar-grid">
    {days.map((d,i)=>{
     if(d===null)return <div key={`blank-${i}`} className="day-cell blank"/>
     const dk=key(d)
     const isToday=dk===today
     const isSunday=new Date(range.start.getFullYear(),range.start.getMonth(),d).getDay()===0
     const occasion=holMap[dk]
     const items=counts[dk]||[]
     return <button key={d}
      className={`day-cell calendar-day ${isToday?'today':''} ${isSunday?'holiday':''} ${occasion?'festival':''}`}
      onClick={()=>setSelected({date:dk,items:items.map(enrichEvent),occasion})}>
      <span className="cal-daynum">{d}{isToday&&<em className="cal-today-tag">Today</em>}</span>
      {occasion&&<span className="cal-festival-tag" title={occasion}><PartyPopper size={9}/> {occasion}</span>}
      <div className="calendar-stack">
       {items.slice(0,3).map((x,j)=>{
        const e=enrichEvent(x)
        const st=String(e.status||e.liveStatus||'pending').toLowerCase()
        return <span key={j} className={`calendar-task-chip ${x.type.toLowerCase()} ${st}`} title={x.title}>{x.title}</span>
       })}
       {items.length>3&&<em>+{items.length-3} more</em>}
      </div>
     </button>
    })}
   </div>
  </div>

  {loading?<div className="loading-box">Loading calendar…</div>:
   <div className="panel calendar-summary">
    <div><h2>{events.length} planned occurrences</h2><p>Recurring tasks repeat by frequency and skip Sundays &amp; holidays.</p></div>
    <button className="secondary-btn" onClick={()=>setSelected({date:today,items:(counts[today]||[]).map(enrichEvent),occasion:holMap[today]})}>Today</button>
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
    {selected.occasion&&<div className="holiday-banner"><PartyPopper size={15}/> <b>{selected.occasion}</b> — holiday. Tasks scheduled for today are moved to the next working day.</div>}
    <div className="calendar-card-stack">
     {selected.items.length?selected.items.map((x,i)=>{
      const st=String(x.status||x.liveStatus||'pending').toLowerCase()
      const isDoneOrDelay=st==='done'||st==='delay'
      const actualText=x.actual||displayDateTime(x.actualDate,x.actualTime)
      return <div className={`calendar-detail-card ${x.type.toLowerCase()} ${st}`} key={i}>
       <div className="calendar-card-icon">{x.type==='Checklist'?<CheckSquare size={16}/>:<Users size={16}/>}</div>
       <div className="calendar-card-info">
        <b>{x.title}</b>
        <span>{x.type} · {x.assignee||'Unassigned'} · {x.frequency}</span>
        {isDoneOrDelay&&actualText&&(
         <span className="calendar-actual-date">
          <CalendarCheck size={13}/> Actual: {actualText}
         </span>
        )}
       </div>
       <div className="calendar-card-right">
        <strong className={`cal-status-badge ${st}`}>{x.status||x.liveStatus}</strong>
        {x.plannedTime&&<span className="cal-time"><Clock size={11}/> {x.plannedTime}</span>}
       </div>
      </div>
     }):<div className="empty-box">{selected.occasion?'Holiday — no tasks scheduled.':'No tasks on this date.'}</div>}
    </div>
   </section>
  </div>}
 </>
}
