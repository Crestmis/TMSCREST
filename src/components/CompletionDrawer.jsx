import {CheckCircle2,X,LoaderCircle,AlertTriangle,Clock} from 'lucide-react'
import {useMemo,useState} from 'react'
import {completeTask} from '../services/tasks'
import {localISO,localTime} from '../services/sheets'

function pretty(v){
 if(!v)return '—'
 const d=new Date(`${v}T12:00:00`)
 return Number.isNaN(d.getTime())?v:`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function prettyDateTime(dateISO,timeHM){
 const d=pretty(dateISO)
 return timeHM?`${d} ${timeHM}`:d
}
function plural(n){return n===1?'':'s'}

function frequencyOf(t){return String(t.frequency||'One-Time').trim().toLowerCase()}

function classify(t,actual){
 const planned=t.plannedISO||''
 if(!planned)return {status:'Done',early:false,eligible:true}
 const daily=frequencyOf(t)==='daily'
 if(daily&&actual<planned)return {status:'Pending',early:false,eligible:false,reason:`Daily task is only available on ${pretty(planned)}.`}
 if(actual<planned)return {status:'Done',early:true,eligible:true}
 if(actual===planned)return {status:'Done',early:false,eligible:true}
 return {status:'Delay',early:false,eligible:true}
}

function dateRelation(plannedISO,actual){
 if(!plannedISO)return 'no-date'
 if(plannedISO===actual)return 'today'
 if(plannedISO<actual)return 'past'
 return 'future'
}

export default function CompletionDrawer({task,tasks,onClose,onDone}){
 const list=tasks?.length?tasks:(task?[task]:[])
 // Captured once when the modal mounts so the clock does not tick during review.
 const [stamp]=useState(()=>({date:localISO(),time:localTime()}))
 const actual=stamp.date
 const actualClock=stamp.time
 const [remarks,setRemarks]=useState('')
 const [confirmed,setConfirmed]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [done,setDone]=useState([])
 const [stage,setStage]=useState('idle')

 const evaluations=useMemo(()=>list.map(t=>({...t,...classify(t,actual),dateRelation:dateRelation(t.plannedISO,actual)})),[list,actual])
 const blocked=evaluations.filter(t=>!t.eligible)
 const valid=evaluations.filter(t=>t.eligible)
 const early=evaluations.filter(t=>t.eligible&&t.early)
 const nonToday=evaluations.filter(t=>t.eligible&&t.dateRelation!=='today'&&t.dateRelation!=='no-date')

 const submit=async()=>{
  if(!confirmed||busy||!valid.length)return
  setBusy(true);setStage('processing');setError('')
  const okList=[]
  try{
   for(const item of valid){
    await completeTask(item,{
     status:item.status,
     remarks,
     actualDate:actual,
     actualTime:actualClock,
     completionType:item.early?'EARLY':item.status==='Delay'?'LATE':'ON_TIME',
     responsibilityConfirmed:true
    })
    okList.push(item)
   }
   setDone(okList)
   setStage('submitted')
   setTimeout(()=>onDone?.(okList),1100)
  }catch(e){
   setDone(okList)
   setStage('idle')
   const left=valid.length-okList.length
   setError(`${e.message||'Unable to submit completion.'}${okList.length?` (${okList.length} of ${valid.length} saved, ${left} not saved)`:''}`)
  }
  finally{setBusy(false)}
 }

 if(!list.length)return null

 return <div className="modal-backdrop" role="presentation" onClick={onClose}>
  <section className="completion-modal" role="dialog" aria-modal="true" aria-labelledby="completion-title" onClick={e=>e.stopPropagation()}>
   <div className="modal-head">
    <div><h2 id="completion-title">Confirm Submission</h2><p>Actual date &amp; time: <strong>{prettyDateTime(actual,actualClock)}</strong> — Review entries before submitting.</p></div>
    <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18}/></button>
   </div>

   {stage!=='idle'?<div className={`submission-state ${stage}`}>
    {stage==='processing'?<><div className="processing-orbit"><LoaderCircle size={34}/></div><h3>Processing Submission</h3><p>Saving your completion and updating task status…</p></>
    :<><div className="submitted-orbit"><CheckCircle2 size={38}/></div><h3>Submitted Successfully</h3><p>{done.length} task{plural(done.length)} updated with actual date {pretty(actual)} at {actualClock}. Checklist / Delegation and Calendar are now refreshed.</p></>}
   </div>:<div className="modal-body">

    <div className="confirm-table-wrap">
     <table className="confirm-table">
      <thead>
       <tr><th>Task Name</th><th>Planned Date</th><th>Actual Date &amp; Time</th><th>Status</th><th>Timing</th></tr>
      </thead>
      <tbody>
       {evaluations.map(t=><tr key={`${t.type}-${t.id}`} className={`confirm-row-${t.dateRelation}`}>
        <td title={t.title}>{t.title}</td>
        <td>{prettyDateTime(t.plannedISO,t.plannedTime)}</td>
        <td>{prettyDateTime(actual,actualClock)}</td>
        <td><span className={`status ${String(t.status).toLowerCase().replace(/\s+/g,'-')}`}>{t.eligible?t.status:'Blocked'}</span></td>
        <td>
         {t.dateRelation==='today'&&<span className="timing-badge today">Today ✓</span>}
         {t.dateRelation==='past'&&<span className="timing-badge past">Past</span>}
         {t.dateRelation==='future'&&<span className="timing-badge future">Future</span>}
         {t.dateRelation==='no-date'&&<span className="timing-badge nodate">No Date</span>}
        </td>
       </tr>)}
      </tbody>
     </table>
    </div>

    {nonToday.length>0&&<div className="notice-box warning">
     <AlertTriangle size={15}/>
     <span><b>{nonToday.length} task{nonToday.length>1?'s are':' is'} not scheduled for today.</b> {nonToday.map(t=>`"${t.title}" is for ${t.planned||'unknown date'}`).join('; ')}. These will be recorded with today's actual date and time.</span>
    </div>}

    {blocked.length>0&&<div className="notice-box warning">
     <AlertTriangle size={15}/>
     <b>{blocked.length} task{plural(blocked.length)} cannot be submitted.</b> {blocked.map(t=>`${t.title}: ${t.reason}`).join(' ')}
    </div>}

    {early.length>0&&<div className="notice-box">
     <Clock size={16}/>
     <span>{early.length} task{plural(early.length)} {early.length===1?'is':'are'} being completed early (before planned date).</span>
    </div>}

    <label className="modal-field">Remarks<textarea value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Optional remarks"/></label>
    <label className="responsibility-check">
     <input type="checkbox" checked={confirmed} onChange={e=>{setConfirmed(e.target.checked);setError('')}}/>
     <span>I confirm the above entries are correct and I am responsible for {valid.length===1?'this submission':`these ${valid.length} submissions`}.</span>
    </label>
    {error&&<div className="error-box">{error}</div>}
   </div>}

   {stage==='idle'&&<div className="modal-actions">
    <button className="secondary-btn" onClick={onClose} disabled={busy}>Cancel</button>
    <button className="primary-btn" disabled={busy||!confirmed||!valid.length} onClick={submit}>
     {busy?'Submitting…':`Submit ${valid.length} Task${plural(valid.length)}`}
    </button>
   </div>}
  </section>
 </div>
}
