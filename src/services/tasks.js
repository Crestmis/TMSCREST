import {CONFIG} from '../config'
import {readRows,normalize,displayDate,isoDate,parseDate,postAppsScript,localISO,displayDateTime} from './sheets'

function pick(row,names,fallback=''){
  for(const n of names){if(row[n]!==undefined&&row[n]!=='')return row[n]}
  for(const k of Object.keys(row)){if(names.some(n=>normalize(n)===normalize(k)))return row[k]}
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
    assignee:String(pick(row,['Name','Doer','Assigned To','Username'],'')),
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
function mapHistoryRow(r){const planned=pick(r,['Planned Date','Task Start Date','Planned'],'');const actual=pick(r,['Actual Date','Actual'],'');const actualTime=String(pick(r,['Actual Time'],'')||'');const status=String(pick(r,['Status','Task Status'],'Done'))||'Done';return {id:String(pick(r,['Task ID','TaskId','TaskID'],r._row)),title:String(pick(r,['Task Description','Task','Description'],'Untitled task')),type:String(pick(r,['Task Type','Type'],'Checklist')),department:String(pick(r,['Department'],'')),givenBy:String(pick(r,['Given By'],'')),assignee:String(pick(r,['Doer','Name','Assignee'],'')),plannedRaw:planned,planned:displayDate(isoDate(planned)||planned),plannedISO:isoDate(planned)||'',plannedTime:String(pick(r,['Planned Time','Set Time','Time'],'')),frequency:String(pick(r,['Frequency','Freq'],'One-Time')),status,liveStatus:status,actualRaw:actual,actualISO:isoDate(actual)||'',actualTime,actualDate:displayDate(actual),actual:displayDateTime(actual,actualTime),completionType:String(pick(r,['Completion Type'],'')),remarks:String(pick(r,['Remarks'],'')),row:r._row,raw:r}}
export async function fetchDelegationHistory(){return (await readRows(CONFIG.SHEETS.DELEGATION_DONE)).filter(r=>Object.values(r).some(v=>String(v).trim())).map(r=>mapTask(r,'Delegation')).map(t=>({...t,status:String(pick(t.raw,['Status','Task Status'],'Done'))||'Done'}))}
export function visibleToUser(tasks,session){if(!session||session.isAdmin)return tasks;const u=normalize(session.username);const visibility=String(session.taskVisibility||session.access?.['Task Visibility']||'Own Tasks').toLowerCase();if(['all tasks','all','full'].includes(visibility))return tasks;return tasks.filter(t=>normalize(t.assignee)===u)}

export async function submitSupport(fields){return postAppsScript({action:'support',...fields})}
export async function createUser(fields){return postAppsScript({action:'createUser',...fields})}
export async function updateUser(fields){return postAppsScript({action:'updateUser',...fields})}
export async function deleteUser(username){return postAppsScript({action:'deleteUser',username})}
export async function fetchAllTasks(){const [c,d]=await Promise.all([fetchChecklist(),fetchDelegation()]);return [...c,...d]}
export async function updateTask({taskId,taskType='checklist',taskTitle,assignee,department,givenBy,plannedDate,plannedTime,frequency,status,remarks}){
  const safeDate=plannedDate!==undefined?nextNonSunday(plannedDate):undefined
  return postAppsScript({action:'updateTask',taskId,taskType,taskTitle,assignee,department,givenBy,plannedDate:safeDate,plannedTime,frequency,status,remarks,sheetName:String(taskType).toLowerCase()==='checklist'?CONFIG.SHEETS.CHECKLIST:CONFIG.SHEETS.DELEGATION})
}
export async function deleteTask({taskId,taskType='checklist'}){
  return postAppsScript({action:'deleteTask',taskId,taskType,sheetName:String(taskType).toLowerCase()==='checklist'?CONFIG.SHEETS.CHECKLIST:CONFIG.SHEETS.DELEGATION})
}

export async function createTask({taskType='delegation',taskTitle,department,givenBy,assignee,plannedDate,plannedTime='',frequency='One-Time',reminders=false,requireAttachment=false,remarks='' }){
  const safeDate=nextNonSunday(plannedDate)
  return postAppsScript({action:'insert',taskType,taskTitle,department,givenBy,assignee,plannedDate:safeDate,plannedTime,frequency,reminders,requireAttachment,remarks,sheetName:taskType==='checklist'?CONFIG.SHEETS.CHECKLIST:CONFIG.SHEETS.DELEGATION})
}
export async function completeTask(task,{status='Done',remarks='',nextTargetDate='',attachmentUrl='',actualDate='',actualTime='',completionType='',responsibilityConfirmed=false}={}){
  const isChecklist=String(task.type||'').toLowerCase()==='checklist'
  return postAppsScript({action:'complete',task,status,remarks,nextTargetDate,attachmentUrl,actualDate,actualTime,completionType,responsibilityConfirmed,sheetName:isChecklist?CONFIG.SHEETS.CHECKLIST:CONFIG.SHEETS.DELEGATION})
}
