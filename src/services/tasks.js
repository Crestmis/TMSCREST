import {CONFIG} from '../config'
import {readRows,normalize,displayDate,isoDate,parseDate,postAppsScript,localISO,displayDateTime} from './sheets'

function pick(row,names,fallback=''){
  for(const n of names){if(row[n]!==undefined&&row[n]!=='')return row[n]}
  for(const k of Object.keys(row)){if(names.some(n=>normalize(n)===normalize(k))){const v=row[k];if(v!==undefined&&String(v).trim()!=='')return v}}
  return fallback
}

export function nextNonSunday(dateISO){
  if(!dateISO)return ''
  const d=parseDate(dateISO); if(!d)return dateISO
  while(d.getDay()===0)d.setDate(d.getDate()+1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function getTaskStatus(task, now=new Date()){
  const stored=String(task.status||'').trim().toLowerCase()
  if(stored==='done') return 'Done'
  if(stored==='delay') return 'Delay'
  const planned=task.plannedISO
  if(!planned)return 'Pending'
  const date=nextNonSunday(planned)
  const time=task.plannedTime||'23:59'
  const [hh,mm]=String(time).split(':').map(Number)
  const due=new Date(`${date}T${String(hh||0).padStart(2,'0')}:${String(mm||0).padStart(2,'0')}:00`)
  const diff=now.getTime()-due.getTime()
  return diff>24*60*60*1000?'Overdue':'Pending'
}

// A task can only be worked on once its planned date has arrived. Anything dated
// after today is "future" — hidden from the Checklist / Delegation completion
// lists and rejected by the completion popup and the backend.
export function isFuturePlanned(task,todayISO=localISO()){
  const p=String(task?.plannedISO||'').slice(0,10)
  return !!p && p>todayISO
}

export function mapTask(row,type){
  const plannedRaw=pick(row,['Task Start Date','Start Date','Planned Date','Date','Planned'],'')
  const normalizedPlanned=nextNonSunday(isoDate(plannedRaw))
  const plannedTime=String(pick(row,['Task Start Time','Planned Time','Set Time','Time'],'')||'')
  const rawStatus=String(pick(row,['Status','Task Status'],'Pending'))||'Pending'
  const actualRaw=pick(row,['Actual Date','Actual'],'')
  const actualTime=String(pick(row,['Actual Time'],'')||'')
  const task={
    id:String(pick(row,['Task ID','TaskId','TaskID'],row._row)),
    title:String(pick(row,['Task Description','Task','Description','Task Title'],'Untitled task')),
    type,department:String(pick(row,['Department','Firm','Location'],'')),
    givenBy:String(pick(row,['Given By','GivenBy','Assigned By'],'')),
    assignee:String(pick(row,['Name','Doer','Doer Name','Assignee','Assigned To','Assigned','Employee','Employee Name','Staff','Staff Name','Emp Name','Person','Username'],'')),
    plannedRaw,planned:displayDate(normalizedPlanned||plannedRaw),plannedISO:normalizedPlanned||isoDate(plannedRaw),
    plannedTime,frequency:String(pick(row,['Freq','Frequency'],'One-Time')),
    status:rawStatus,requireAttachment:normalize(pick(row,['Require Attachment'],''))==='yes',
    reminders:String(pick(row,['Enable Reminders'],'')),remarks:String(pick(row,['Remarks'],'')||''),
    actualRaw,actualISO:isoDate(actualRaw),actualTime,
    actualDate:displayDate(actualRaw),actual:displayDateTime(actualRaw,actualTime),
    completionType:String(pick(row,['Completion Type'],'')||''),
    row:row._row,raw:row
  }
  task.liveStatus=getTaskStatus(task)
  return task
}

export async function fetchChecklist(){return (await readRows(CONFIG.SHEETS.CHECKLIST)).filter(r=>Object.values(r).some(v=>String(v).trim())).map(r=>mapTask(r,'Checklist'))}
export async function fetchDelegation(){return (await readRows(CONFIG.SHEETS.DELEGATION)).filter(r=>Object.values(r).some(v=>String(v).trim())).map(r=>mapTask(r,'Delegation'))}
export async function fetchTaskHistory(){try{return (await readRows('TASK HISTORY')).filter(r=>Object.values(r).some(v=>String(v).trim())).map(r=>mapHistoryRow(r))}catch{return []}}
function mapHistoryRow(r){const planned=pick(r,['Planned Date','Task Start Date','Planned'],'');const actual=pick(r,['Actual Date','Actual'],'');const actualTime=String(pick(r,['Actual Time'],'')||'');const status=String(pick(r,['Status','Task Status'],'Done'))||'Done';return {id:String(pick(r,['Task ID','TaskId','TaskID'],r._row)),title:String(pick(r,['Task Description','Task','Description'],'Untitled task')),type:String(pick(r,['Task Type','Type'],'Checklist')),department:String(pick(r,['Department'],'')),givenBy:String(pick(r,['Given By'],'')),assignee:String(pick(r,['Doer','Doer Name','Name','Assignee','Assigned To','Employee','Staff','Staff Name'],'')),plannedRaw:planned,planned:displayDate(isoDate(planned)||planned),plannedISO:isoDate(planned)||'',plannedTime:String(pick(r,['Planned Time','Set Time','Time'],'')),frequency:String(pick(r,['Frequency','Freq'],'One-Time')),status,liveStatus:status,actualRaw:actual,actualISO:isoDate(actual)||'',actualTime,actualDate:displayDate(actual),actual:displayDateTime(actual,actualTime),completionType:String(pick(r,['Completion Type'],'')),remarks:String(pick(r,['Remarks'],'')),row:r._row,raw:r}}
export async function fetchDelegationHistory(){try{return (await readRows(CONFIG.SHEETS.DELEGATION_DONE)).filter(r=>Object.values(r).some(v=>String(v).trim())).map(r=>mapTask(r,'Delegation')).map(t=>({...t,status:String(pick(t.raw,['Status','Task Status'],'Done'))||'Done'}))}catch{return []}}

// ---- History helpers ---------------------------------------------------------
const isDoneStatus=s=>['done','delay'].includes(String(s||'').toLowerCase())
function histKey(t){return `${String(t.type||'').toLowerCase()}|${t.id}|${t.actualISO||t.plannedISO||''}`}
function mergeHistory(...lists){
  const out=new Map()
  lists.flat().forEach(t=>{const k=histKey(t);const cur=out.get(k);if(!cur||(!cur.actualISO&&t.actualISO))out.set(k,t)})
  return [...out.values()].sort((a,b)=>String(b.actualISO||b.plannedISO||'').localeCompare(String(a.actualISO||a.plannedISO||'')))
}
// Completed CHECKLIST work: rows written to TASK HISTORY on submit, merged with any
// Done/Delay rows still sitting on the Checklist sheet (deduped by task + actual date).
export async function fetchChecklistHistory(){
  const [hist,live]=await Promise.all([fetchTaskHistory(),fetchChecklist().catch(()=>[])])
  const cHist=hist.filter(t=>String(t.type||'').toLowerCase()==='checklist')
  const cDone=live.filter(t=>isDoneStatus(t.liveStatus||t.status))
  return mergeHistory(cHist,cDone)
}
// Everything ever submitted, both task types — powers the standalone History page.
export async function fetchAllHistory(){
  const [hist,c,d]=await Promise.all([fetchTaskHistory(),fetchChecklist().catch(()=>[]),fetchDelegation().catch(()=>[])])
  const done=[...c,...d].filter(t=>isDoneStatus(t.liveStatus||t.status))
  return mergeHistory(hist,done)
}
export function visibleToUser(tasks,session){if(!session||session.isAdmin)return tasks;const u=normalize(session.username);const visibility=String(session.taskVisibility||session.access?.['Task Visibility']||'Own Tasks').toLowerCase();if(['all tasks','all','full'].includes(visibility))return tasks;return tasks.filter(t=>normalize(t.assignee)===u)}

export async function submitSupport(fields){return postAppsScript({action:'support',...fields})}
export async function createUser(fields){return postAppsScript({action:'createUser',...fields})}
export async function updateUser(fields){return postAppsScript({action:'updateUser',...fields})}
export async function deleteUser(username){return postAppsScript({action:'deleteUser',username})}
export async function fetchAllTasks(){const [c,d]=await Promise.all([fetchChecklist(),fetchDelegation()]);return [...c,...d]}

// AllTasksList — a standalone, fully manual sheet (Name | Task Description | Freq | Remarks).
// No Task ID: rows are addressed by their sheet row number. Callers pass the row's
// current Name/Description so the backend can refuse a stale edit after a refresh.
export async function fetchAllTasksList(){
  const rows=await readRows(CONFIG.SHEETS.ALL_TASKS)
  return rows.filter(r=>Object.values(r).some(v=>String(v).trim())).map(r=>({
    row:r._row,
    assignee:String(pick(r,['Name','Doer','Assigned To'],'')),
    title:String(pick(r,['Task Description','Task','Description'],'')),
    frequency:String(pick(r,['Freq','Frequency'],'One-Time'))||'One-Time',
    remarks:String(pick(r,['Remarks'],'')||''),
    raw:r
  }))
}
export async function allListAdd({name,taskDescription,freq,remarks}){return postAppsScript({action:'allAdd',name,taskDescription,freq,remarks})}
export async function allListUpdate({row,name,taskDescription,freq,remarks,expectName,expectTitle}){return postAppsScript({action:'allUpdate',row,name,taskDescription,freq,remarks,expectName,expectTitle})}
export async function allListDelete({row,expectName,expectTitle}){return postAppsScript({action:'allDelete',row,expectName,expectTitle})}
export async function updateTask({taskId,taskType='checklist',taskTitle,assignee,department,givenBy,plannedDate,plannedTime,frequency,status,remarks}){
  const safeDate=plannedDate!==undefined?nextNonSunday(plannedDate):undefined
  return postAppsScript({action:'updateTask',taskId,taskType,taskTitle,assignee,department,givenBy,plannedDate:safeDate,plannedTime,frequency,status,remarks,sheetName:String(taskType).toLowerCase()==='checklist'?CONFIG.SHEETS.CHECKLIST:CONFIG.SHEETS.DELEGATION})
}
export async function deleteTask({taskId,taskType='checklist'}){
  return postAppsScript({action:'deleteTask',taskId,taskType,sheetName:String(taskType).toLowerCase()==='checklist'?CONFIG.SHEETS.CHECKLIST:CONFIG.SHEETS.DELEGATION})
}

// ---- Recurring plans (Task_Planned_CL / Task_Planned_DL) --------------------
// One row per recurring rule. The monthly Apps Script trigger (PlannedMonthly.gs)
// materialises each active plan's occurrences into Checklist / DELEGATION as
// One-Time Pending rows on the 1st of the month. This page manages the rules.
export function mapPlan(r,scope){
  return {
    row:r._row,
    planId:String(pick(r,['Plan ID','PlanId','PlanID','ID'],'')),
    scope, // 'CL' | 'DL'
    title:String(pick(r,['Task Description','Task','Description'],'')),
    department:String(pick(r,['Department','Firm'],'')),
    givenBy:String(pick(r,['Given By','GivenBy'],'')),
    assignee:String(pick(r,['Name','Doer','Assigned To'],'')),
    startDate:isoDate(pick(r,['Start Date','Task Start Date','Planned Date','Date'],'')),
    time:String(pick(r,['Time','Task Start Time','Planned Time','Set Time'],'')||''),
    frequency:String(pick(r,['Freq','Frequency'],'Daily'))||'Daily',
    endDate:isoDate(pick(r,['End Date','Until'],'')),
    requireAttachment:normalize(pick(r,['Require Attachment'],''))==='yes',
    reminders:normalize(pick(r,['Enable Reminders','Reminders'],''))==='yes',
    remarks:String(pick(r,['Remarks'],'')||''),
    active:!['no','n','false','0','inactive','off'].includes(normalize(pick(r,['Active','Enabled'],'yes'))),
    raw:r
  }
}
export async function fetchPlans(scope){
  const sheet=String(scope||'').toUpperCase()==='DL'?CONFIG.SHEETS.PLANNED_DL:CONFIG.SHEETS.PLANNED_CL
  const rows=await readRows(sheet).catch(()=>[])
  return rows.filter(r=>Object.values(r).some(v=>String(v).trim())).map(r=>mapPlan(r,String(scope||'CL').toUpperCase()))
}
export async function planAdd(scope,fields){return postAppsScript({action:'planAdd',scope,...fields})}
export async function planUpdate(scope,fields){return postAppsScript({action:'planUpdate',scope,...fields})}
export async function planDelete(scope,{planId}){return postAppsScript({action:'planDelete',scope,planId})}
export async function generatePlannedMonth(target='current'){return postAppsScript({action:'planGenerate',target})}
// Archive completed instances (dated before today) out of Checklist / DELEGATION
// into TASK HISTORY, and drop past-due generated Pending rows as "Missed".
export async function planSweep(){return postAppsScript({action:'planSweep'})}

export async function createTask({taskType='delegation',taskTitle,department,givenBy,assignee,plannedDate,plannedTime='',frequency='One-Time',reminders=false,requireAttachment=false,remarks='' }){
  const safeDate=nextNonSunday(plannedDate)
  return postAppsScript({action:'insert',taskType,taskTitle,department,givenBy,assignee,plannedDate:safeDate,plannedTime,frequency,reminders,requireAttachment,remarks,sheetName:taskType==='checklist'?CONFIG.SHEETS.CHECKLIST:CONFIG.SHEETS.DELEGATION})
}
export async function completeTask(task,{status='Done',remarks='',nextTargetDate='',attachmentUrl='',actualDate='',actualTime='',completionType='',responsibilityConfirmed=false}={}){
  const isChecklist=String(task.type||'').toLowerCase()==='checklist'
  return postAppsScript({action:'complete',task,status,remarks,nextTargetDate,attachmentUrl,actualDate,actualTime,completionType,responsibilityConfirmed,sheetName:isChecklist?CONFIG.SHEETS.CHECKLIST:CONFIG.SHEETS.DELEGATION})
}
