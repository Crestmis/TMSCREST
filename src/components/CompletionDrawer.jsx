import {CheckCircle2,X,LoaderCircle,AlertTriangle,Clock} from 'lucide-react'
import {useMemo,useState} from 'react'
import {completeTask} from '../services/tasks'

function todayISO(){
 // Use local date (not UTC) to avoid timezone issues
 const d=new Date()
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function pretty(v){
 if(!v)return '—'
 const d=new Date(`${v}T12:00:00`)
 return Number.isNaN(d.getTime())?v:`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
}

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
 const actual=todayISO()
 const [remarks,setRemarks]=useState('')
 const [confirmed,setConfirmed]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [stage,setStage]=useState('idle')

 const evaluations=useMemo(()=>list.map(t=>({...t,...classify(t,actual),dateRelation:dateRelation(t.plannedISO,actual)})),[list,actual])
 const blocked=evaluations.filter(t=>!t.eligible)
 const valid=evaluations.filter(t=>t.eligible)
 const early=evaluations.filter(t=>t.eligible&&t.early)
 const nonToday=evaluations.filter(t=>t.eligible&&t.dateRelation!=='today'&&t.dateRelation!=='no-date')

 const submit=async()=>{
  if(!confirmed||busy||!valid.length)return
  setBusy(true);setStage('processing');setError('')
  try{
   for(const item of valid){
    await completeTask(item,{
     status:item.status,
     remarks,
     actualDate:actual,
     completionType:item.early?'EARLY':item.status==='Delay'?'LATE':'ON_TIME',
     responsibilityConfirmed:true
    })
   }
   setStage('submitted')
   setTimeout(()=>onDone?.(valid),1100)
  }catch(e){setStage('idle');setError(e.message||'Unable to submit completion.')}
  finally{setBusy(false)}
 }

 if(!list.length)return null

 return <div className="modal-backdrop" role="presentation" onClick={onClose}>
  <section className="completion-modal" role="dialog" aria-modal="true" aria-labelledby="completion-title" onClick={e=>e.stopPropagation()}>
   <div className="modal-head">
    <div><h2 id="completion-title">Confirm Submission</h2><p>Today: <strong>{pretty(actual)}</strong> — Review entries before submitting.</p></div>
    <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18}/></button>
   </div>

   {stage!=='idle'?<div className={`submission-state ${stage}`}>
    {stage==='processing'?<><div className="processing-orbit"><LoaderCircle size={34}/></div><h3>Processing Submission</h3><p>Saving your completion and updating task status…</p></>
    :<><div className="submitted-orbit"><CheckCircle2 size={38}/></div><h3>Submitted Successfully</h3><p>{valid.length} task{valid.length>1?'s':''} updated. Tasks List and Calendar are now refreshed.</p></>}
   </div>:<div className="modal-body">

    <div className="confirm-table-wrap">
     <table className="confirm-table">
      <thead>
       <tr><th>Task Name</th><th>Planned Date</th><th>Actual (Today)</th><th>Status</th><th>Timing</th></tr>
      </thead>
      <tbody>
       {evaluations.map(t=><tr key={`${t.type}-${t.id}`} className={`confirm-row-${t.dateRelation}`}>
        <td title={t.title}>{t.title}</td>
        <td>{t.planned||'—'}</td>
        <td>{pretty(actual)}</td>
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

    {/* Non-today warning */}
    {nonToday.length>0&&<div className="notice-box warning">
     <AlertTriangle size={15}/>
     <span><b>{nonToday.length} task{nonToday.length>1?'s are':' is'} not scheduled for today.</b> {nonToday.map(t=>`"${t.title}" is for ${t.planned||'unknown date'}`).join('; ')}. These will be recorded with today's actual date.</span>
    </div>}

    {blocked.length>0&&<div className="notice-box warning">
     <AlertTriangle size={15}/>
     <b>{blocked.length} task{blocked.length>1?'s':''} cannot be submitted.</b> {blocked.map(t=>`${t.title}: ${t.reason}`).join(' ')}
    </div>}

    {early.length>0&&<div className="notice-box">
     <Clock size={16}/>
     <span>{early.length} task{early.length>1?'s':''} are being completed early (before planned date).</span>
    </div>}

    <label className="modal-field">Remarks<textarea value={remarks} onChange={e=>setRemarks(e.target.value)} placeholder="Optional remarks"/></label>
    <label className="responsibility-check">
     <input type="checkbox" checked={confirmed} onChange={e=>{setConfirmed(e.target.checked);setError('')}}/>
     <span>I confirm the above entries are correct and I am responsible for these {valid.length} submission{valid.length>1?'s':''}.</span>
    </label>
    {error&&<div className="error-box">{error}</div>}
   </div>}

   {stage==='idle'&&<div className="modal-actions">
    <button className="secondary-btn" onClick={onClose} disabled={busy}>Cancel</button>
    <button className="primary-btn" disabled={busy||!confirmed||!valid.length} onClick={submit}>
     {busy?'Submitting…':`Submit ${valid.length} Task${valid.length>1?'s':''}`}
    </button>
   </div>}
  </section>
 </div>
}
