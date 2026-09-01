import {CONFIG} from '../config'
import {readSheet,normalize} from './sheets'
import {demoLoginUsers} from '../data/demoStore'
import {fetchAccess} from './sheets'
export async function loadUsers(){
 if(CONFIG.DEMO_MODE){const users={};demoLoginUsers().forEach(u=>users[normalize(u.username)]={username:normalize(u.username),password:String(u.password),role:normalize(u.role),department:String(u.department||'')});return users}
 const {values}=await readSheet(CONFIG.SHEETS.MASTER); const users={}
 values.forEach(row=>{const department=row[0]??'',username=row[2]??'',password=row[3]??'',role=row[4]??'user';const u=normalize(username),r=normalize(role);if(!u||!String(password).trim())return;if(['inactive','in active','inactiv','in activ'].includes(r))return;users[u]={username:u,password:String(password).trim(),role:r,department:String(department||'').trim()}});return users
}
export async function login(username,password){const users=await loadUsers();const user=users[normalize(username)];if(!user||user.password!==String(password).trim())throw new Error('Username or password is incorrect.');const isAdmin=['admin','main admin'].includes(user.role);const rows=await fetchAccess(user.username);const access={};rows.forEach(r=>{const page=String(r.Page||'').trim();if(page)access[page]=String(r.Access||'Viewer').trim()}); const visibilityRow=rows.find(r=>String(r.Page||'').trim()==='Task Visibility'); const taskVisibility=String(visibilityRow?.Access||'Own Tasks').trim();if(!Object.keys(access).length&&!isAdmin){['Dashboard','Calendar','Reports & Score','Settings'].forEach(k=>access[k]='Viewer');['Tasks List','Delegation'].forEach(k=>access[k]='Editor');access['Assign Task']='Viewer';}
 if(isAdmin)Object.keys(access).forEach(k=>access[k]='Full Access');const session={username:user.username,role:user.role,department:isAdmin?(user.department||'all'):user.department,isAdmin,access,taskVisibility};Object.entries(session).forEach(([k,v])=>sessionStorage.setItem(k,typeof v==='object'?JSON.stringify(v):String(v)));return session}
export function getSession(){const username=sessionStorage.getItem('username');if(!username)return null;let access={};try{access=JSON.parse(sessionStorage.getItem('access')||'{}')}catch{} return {username,role:sessionStorage.getItem('role')||'user',department:sessionStorage.getItem('department')||'',isAdmin:sessionStorage.getItem('isAdmin')==='true',access,taskVisibility:sessionStorage.getItem('taskVisibility')||access['Task Visibility']||'Own Tasks'}}
export function logout(){sessionStorage.clear();window.location.reload()}
