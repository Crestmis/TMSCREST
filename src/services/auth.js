import {CONFIG} from '../config'
import {readSheet,normalize} from './sheets'
import {demoLoginUsers} from '../data/demoStore'
import {fetchAccess} from './sheets'
export async function loadUsers(){
 if(CONFIG.DEMO_MODE){const users={};demoLoginUsers().forEach(u=>users[normalize(u.username)]={username:normalize(u.username),password:String(u.password),role:normalize(u.role),department:String(u.department||'')});return users}
 const {values}=await readSheet(CONFIG.SHEETS.MASTER); const users={}
 values.forEach(row=>{const department=row[0]??'',username=row[2]??'',password=row[3]??'',role=row[4]??'user';const u=normalize(username),r=normalize(role);if(!u||!String(password).trim())return;if(['inactive','in active','inactiv','in activ'].includes(r))return;users[u]={username:u,password:String(password).trim(),role:r,department:String(department||'').trim()}});return users
}
const NON_PAGE_KEYS=['Task Visibility','Calendar Past','Calendar Future']
export function calendarPastAllowed(access={},isAdmin=false){return isAdmin||String(access['Calendar Past']||'Allowed').trim().toLowerCase()!=='denied'}
export function calendarFutureAllowed(access={},isAdmin=false){return isAdmin||String(access['Calendar Future']||'Allowed').trim().toLowerCase()!=='denied'}
// The "Tasks List" page was renamed to "Checklist". Keep old ACCESS CONTROL rows working.
export function normalizeAccessAliases(access={}){
 if(access['Tasks List']!==undefined&&access['Checklist']===undefined)access['Checklist']=access['Tasks List']
 if(access['Checklist']!==undefined&&access['Tasks List']===undefined)access['Tasks List']=access['Checklist']
 return access
}
export async function login(username,password){const users=await loadUsers();const user=users[normalize(username)];if(!user||user.password!==String(password).trim())throw new Error('Username or password is incorrect.');const isAdmin=['admin','main admin'].includes(user.role);const rows=await fetchAccess(user.username);const access={};rows.forEach(r=>{const page=String(r.Page||'').trim();if(page)access[page]=String(r.Access||'Viewer').trim()}); const visibilityRow=rows.find(r=>String(r.Page||'').trim()==='Task Visibility'); const taskVisibility=String(visibilityRow?.Access||'Own Tasks').trim();if(!Object.keys(access).length&&!isAdmin){['Dashboard','Calendar','Reports & Score','Settings'].forEach(k=>access[k]='Viewer');['Checklist','Delegation'].forEach(k=>access[k]='Editor');access['Assign Task']='Viewer';}
 if(isAdmin)Object.keys(access).forEach(k=>{if(!NON_PAGE_KEYS.includes(k))access[k]='Full Access'});
 normalizeAccessAliases(access)
 const calendarPast=calendarPastAllowed(access,isAdmin), calendarFuture=calendarFutureAllowed(access,isAdmin);
 const session={username:user.username,role:user.role,department:isAdmin?(user.department||'all'):user.department,isAdmin,access,taskVisibility,calendarPast,calendarFuture};Object.entries(session).forEach(([k,v])=>sessionStorage.setItem(k,typeof v==='object'?JSON.stringify(v):String(v)));return session}
export function getSession(){const username=sessionStorage.getItem('username');if(!username)return null;let access={};try{access=JSON.parse(sessionStorage.getItem('access')||'{}')}catch{} normalizeAccessAliases(access); const isAdmin=sessionStorage.getItem('isAdmin')==='true';return {username,role:sessionStorage.getItem('role')||'user',department:sessionStorage.getItem('department')||'',isAdmin,access,taskVisibility:sessionStorage.getItem('taskVisibility')||access['Task Visibility']||'Own Tasks',calendarPast:sessionStorage.getItem('calendarPast')!==null?sessionStorage.getItem('calendarPast')==='true':calendarPastAllowed(access,isAdmin),calendarFuture:sessionStorage.getItem('calendarFuture')!==null?sessionStorage.getItem('calendarFuture')==='true':calendarFutureAllowed(access,isAdmin)}}
export function logout(){sessionStorage.clear();window.location.reload()}
