import { CONFIG } from '../config'
import { getDemoSheet, insertDemoTask, completeDemoTask, demoAccessRows, saveDemoAccess, submitDemoSupport, createDemoUser, updateDemoUser, deleteDemoUser, updateDemoTask, deleteDemoTask, saveDemoHoliday, deleteDemoHoliday, allListAddDemo, allListUpdateDemo, allListDeleteDemo, planAddDemo, planUpdateDemo, planDeleteDemo, generatePlannedMonthDemo } from '../data/demoStore'
function demoRowsToResult(rows){if(!rows.length)return {headers:[],values:[],raw:null};const headers=[...new Set(rows.flatMap(r=>Object.keys(r)))];return {headers,values:rows.map(r=>headers.map(h=>r[h]??'')),raw:null}}
export async function readSheet(sheetName){
 if(CONFIG.DEMO_MODE)return demoRowsToResult(getDemoSheet(sheetName))
 if(!CONFIG.APPS_SCRIPT_URL)throw new Error('VITE_APPS_SCRIPT_URL is not configured.')
 const apiUrl=`${CONFIG.APPS_SCRIPT_URL}?action=fetch&sheet=${encodeURIComponent(sheetName)}`
 const res=await fetch(apiUrl,{cache:'no-store'}); const text=await res.text(); let data={}; try{data=JSON.parse(text)}catch{throw new Error('Invalid Apps Script response: '+text.slice(0,120))}
 if(!res.ok||data.success===false)throw new Error(data.error||`Unable to read ${sheetName}`)
 return {headers:data.headers||[],values:data.values||[],raw:data}
}
export async function readRows(sheetName){const {headers,values}=await readSheet(sheetName);return values.map((row,index)=>{const obj={_row:index+2};headers.forEach((h,i)=>obj[h||`Column ${i+1}`]=row[i]??'');return obj})}
export async function postAppsScript(fields){
 if(CONFIG.DEMO_MODE){
   if(fields.action==='insert'&&fields.taskType){return insertDemoTask(fields)}
   if(fields.action==='support'){return submitDemoSupport(fields)}
   if(fields.action==='createUser'){return createDemoUser(fields)}
   if(fields.action==='updateUser'){return updateDemoUser(fields)}
   if(fields.action==='deleteUser'){return deleteDemoUser(fields)}
   if(fields.action==='updateTask'){return updateDemoTask(fields)}
   if(fields.action==='deleteTask'){return deleteDemoTask(fields)}
   if(fields.action==='saveHoliday'){return saveDemoHoliday(fields)}
   if(fields.action==='deleteHoliday'){return deleteDemoHoliday(fields)}
   if(fields.action==='allAdd'){return allListAddDemo(fields)}
   if(fields.action==='allUpdate'){return allListUpdateDemo(fields)}
   if(fields.action==='allDelete'){return allListDeleteDemo(fields)}
   if(fields.action==='planAdd'){return planAddDemo(fields)}
   if(fields.action==='planUpdate'){return planUpdateDemo(fields)}
   if(fields.action==='planDelete'){return planDeleteDemo(fields)}
   if(fields.action==='planGenerate'){return generatePlannedMonthDemo(fields)}
   if(fields.action==='complete'){return completeDemoTask(fields.task,{status:fields.status,remarks:fields.remarks,nextTargetDate:fields.nextTargetDate,attachmentUrl:fields.attachmentUrl,actualDate:fields.actualDate,actualTime:fields.actualTime,completionType:fields.completionType,responsibilityConfirmed:fields.responsibilityConfirmed})}
   return {success:true,demo:true}
 }
 if(!CONFIG.APPS_SCRIPT_URL)throw new Error('VITE_APPS_SCRIPT_URL is not configured.')
 const form=new URLSearchParams(); Object.entries(fields).forEach(([k,v])=>{if(v!==undefined&&v!==null)form.append(k,typeof v==='object'?JSON.stringify(v):String(v))})
 const res=await fetch(CONFIG.APPS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:form.toString()})
 const text=await res.text(); let data={};try{data=JSON.parse(text)}catch{throw new Error('Invalid Apps Script response: '+text.slice(0,160))}
 if(!res.ok||data.success===false)throw new Error(data.error||`Apps Script request failed (${res.status})`)
 return data
}
export function normalize(v){return String(v??'').trim().toLowerCase()}
export function parseDate(value){if(!value)return null;if(value instanceof Date)return value;const s=String(value).trim();const dmy=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(dmy)return new Date(+dmy[3],+dmy[2]-1,+dmy[1]);const d=new Date(s);return Number.isNaN(d.getTime())?null:d}
export function isoDate(value){const d=parseDate(value);if(!d)return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function displayDate(value){const d=parseDate(value);if(!d)return String(value??'');return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}

// Local-timezone helpers. Never use toISOString().slice(0,10) for "today" — it is UTC
// and shifts the date by a day for users east/west of UTC (e.g. IST +5:30).
export function localISO(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function localTime(d=new Date()){return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
export function localDateTime(d=new Date()){return `${localISO(d)} ${localTime(d)}`}
export function displayDateTime(dateValue,timeValue){const dd=displayDate(dateValue);if(!dd)return '';const t=String(timeValue||'').trim();return t?`${dd} ${t}`:dd}

// F1: tolerate whitespace / header-casing in the ACCESS CONTROL sheet. Rows are
// normalised to canonical {Username, Page, Access} keys and matched case/space-insensitively.
export async function fetchAccess(username=''){
 const want=String(username||'').trim().toLowerCase()
 if(CONFIG.DEMO_MODE)return demoAccessRows(username)
 try{
  const raw=await readRows('ACCESS CONTROL')
  const field=(r,names)=>{for(const k of Object.keys(r)){if(names.includes(String(k).trim().toLowerCase()))return r[k]}return ''}
  const norm=raw.map(r=>({
   Username:String(field(r,['username','user name','user','login','userid'])).trim(),
   Page:String(field(r,['page','page name','screen','module'])).trim(),
   Access:String(field(r,['access','level','right','rights','permission'])).trim()
  })).filter(r=>r.Username||r.Page)
  return norm.filter(r=>!want||r.Username.toLowerCase()===want)
 }catch{return []}
}
export async function saveAccess(username,permissions){return postAppsScript({action:'saveAccess',username,permissions})}
