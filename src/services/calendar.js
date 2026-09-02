import { CONFIG } from '../config'
import { readRows, parseDate, normalize, isoDate, postAppsScript } from './sheets'

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
const dkey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

export async function getWorkingDates() {
  const rows = await readRows(CONFIG.SHEETS.WORKING_DAYS)
  const out=[]
  rows.forEach(r=>Object.values(r).forEach(v=>{const d=parseDate(v); if(d) out.push(new Date(d.getFullYear(),d.getMonth(),d.getDate()))}))
  return out
}

// Reads the HOLIDAYS sheet: rows of { Date, Occasion }. Returns [{iso, occasion}].
export async function getHolidays() {
  let rows=[]
  try{ rows = await readRows(CONFIG.SHEETS.HOLIDAYS) }catch{ return [] }
  return rows.map(r=>{
    const dateVal=r['Date']??r['Holiday Date']??r['Day']??Object.values(r).find(v=>parseDate(v))
    const iso=isoDate(dateVal)
    if(!iso) return null
    const occasion=String(r['Occasion']??r['Reason']??r['Festival']??r['Name']??r['Notes']??'Holiday').trim()||'Holiday'
    return {iso,occasion}
  }).filter(Boolean)
}

export function holidayMap(holidays=[]){
  const m={}
  holidays.forEach(h=>{if(h&&h.iso)m[h.iso]=h.occasion||'Holiday'})
  return m
}

// Push a date forward past Sundays and any listed holiday, until it lands on a working day.
function toWorkingDay(d, holidaySet){
  let guard=0
  while(guard++<90){
    if(d.getDay()===0){ d.setDate(d.getDate()+1); continue }        // Sunday
    if(holidaySet && holidaySet.has(dkey(d))){ d.setDate(d.getDate()+1); continue }  // Festival holiday
    break
  }
  return d
}

export function occurrences(tasks, from, to, workingDates=[], holidays=[]) {
  const result=[]
  const start=new Date(from); start.setHours(0,0,0,0)
  const end=new Date(to); end.setHours(23,59,59,999)
  const holidaySet=new Set((holidays||[]).map(h=>h&&h.iso).filter(Boolean))
  tasks.forEach(task=>{
    let d=parseDate(task.plannedRaw)
    if(!d) return
    d=toWorkingDay(new Date(d.getFullYear(),d.getMonth(),d.getDate()), holidaySet)
    const type=freq(task.frequency)
    let guard=0
    while(d<=end && guard++<370){
      if(d>=start){
        const blocked=d.getDay()===0 || holidaySet.has(dkey(d))
        const allowed=!blocked && (!workingDates.length || workingDates.some(w=>sameDay(w,d)))
        if(allowed) result.push({...task,date:new Date(d),occurrenceDate:dkey(d)})
      }
      if(type==='one-time') break
      if(type==='daily') d.setDate(d.getDate()+1)
      else if(type==='fortnightly') d.setDate(d.getDate()+14)
      else if(type==='weekly') d.setDate(d.getDate()+7)
      else if(type==='monthly') d=addMonths(d,1)
      else if(type==='quarterly') d=addMonths(d,3)
      else if(type==='half-yearly') d=addMonths(d,6)
      else if(type==='yearly') d=addMonths(d,12)
      d=toWorkingDay(d, holidaySet)
    }
  })
  return result
}

export async function saveHoliday(date,occasion){return postAppsScript({action:'saveHoliday',date,occasion})}
export async function deleteHoliday(date){return postAppsScript({action:'deleteHoliday',date})}
