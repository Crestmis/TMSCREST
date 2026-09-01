import {CheckCircle2,ArrowUpRight,Paperclip,CheckSquare,Square} from 'lucide-react'
export default function TaskRow({task,onComplete,onSelect,selected=false,selectable=true}){
 const displayStatus=task.liveStatus||task.status||'Pending';const statusClass=String(displayStatus).toLowerCase().replace(/\s+/g,'-');const done=statusClass==='done'
 return <div className={`task-row ${selected?'selected':''}`}>
   <div className="task-check">{done?<CheckCircle2 size={20}/>:selectable&&onSelect?<button title={selected?'Unselect task':'Select task'} onClick={()=>onSelect?.(task)} className="row-checkbox">{selected?<CheckSquare size={20}/>:<Square size={20}/>}</button>:onComplete?<button title="Complete task" onClick={()=>onComplete?.(task)} className="circle-check"/>:<span className="task-dot"/>}</div>
   <div className="task-main"><b>{task.title}</b><div className="task-meta"><span className={`type-pill ${task.type.toLowerCase()}`}>{task.type}</span><span>{task.frequency}</span><span>{task.planned||'No date'}{task.plannedTime?` · ${task.plannedTime}`:''}</span>{task.assignee&&<span>{task.assignee}</span>}{task.requireAttachment&&<span><Paperclip size={11}/> Attachment required</span>}</div></div>
   <div className={`status ${statusClass}`}>{displayStatus}</div><button className="row-action" title="Open completion" onClick={()=>onComplete?.(task)} disabled={done||!onComplete}><ArrowUpRight size={17}/></button>
 </div>
}
