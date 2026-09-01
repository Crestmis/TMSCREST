import { CONFIG } from '../config'
import { readRows, parseDate, normalize } from './sheets'
import { nextNonSunday } from './tasks'

const freq = f => {
  const s=normalize(f)
  if(s.startsWith('d')) return 'daily'
  if(s.startsWith('fort')) return 'fortnightly'
  if(s.startsWith('w')) return 'weekly'
  if(s.startsWith('q')) return 'quarterly'
  if(s.startsWith('half') || s.includes('halfyear')) return 'half-yearly'
  if(s.startsWith('m')) return 'monthly'
  if(s.startsWith('y')) return 'yearly'
  return 'one-time'
}
const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()
const addMonths=(d,n)=>{const x=new Date(d);x.setMonth(x.getMonth()+n);return x}

export async function getWorkingDates() {
  const rows = await readRows(CONFIG.SHEETS.WORKING_DAYS)
  const out=[]
  rows.forEach(r=>Object.values(r).forEach(v=>{const d=parseDate(v); if(d) out.push(new Date(d.getFullYear(),d.getMonth(),d.getDate()))}))
  return out
}

function sundayShift(d){while(d.getDay()===0)d.setDate(d.getDate()+1);return d}

export function occurrences(tasks, from, to, workingDates=[]) {
  const result=[]
  const start=new Date(from); start.setHours(0,0,0,0)
  const end=new Date(to); end.setHours(23,59,59,999)
  tasks.forEach(task=>{
    let d=parseDate(task.plannedRaw)
    if(!d) return
    d=sundayShift(new Date(d.getFullYear(),d.getMonth(),d.getDate()))
    const type=freq(task.frequency)
    let guard=0
    while(d<=end && guard++<370){
      if(d>=start){
        const sunday=d.getDay()===0
        const allowed=!sunday && (!workingDates.length || workingDates.some(w=>sameDay(w,d)))
        if(allowed) result.push({...task,date:new Date(d),occurrenceDate:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})
      }
      if(type==='one-time') break
      if(type==='daily') d.setDate(d.getDate()+1)
      else if(type==='fortnightly') d.setDate(d.getDate()+14)
      else if(type==='weekly') d.setDate(d.getDate()+7)
      else if(type==='monthly') d=addMonths(d,1)
      else if(type==='quarterly') d=addMonths(d,3)
      else if(type==='half-yearly') d=addMonths(d,6)
      else if(type==='yearly') d=addMonths(d,12)
      d=sundayShift(d)
    }
  })
  return result
}
