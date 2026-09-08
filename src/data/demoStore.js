const KEY = 'crest_demo_store_v10'

function localISO(offset=0){ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function localTimeNow(){ const d=new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
function todayLocalISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function firstOfMonthISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }
const initial = {
  users:[
    {department:'Administration',username:'admin',password:'admin123',role:'admin'},
    {department:'Operations',username:'rahul',password:'1234',role:'user'},
    {department:'Sales',username:'amit',password:'1234',role:'user'},
  ],
  'ACCESS CONTROL':[
    {'Username':'admin','Page':'Dashboard','Access':'Full Access'},{'Username':'admin','Page':'Checklist','Access':'Full Access'},{'Username':'admin','Page':'Delegation','Access':'Full Access'},{'Username':'admin','Page':'Calendar','Access':'Full Access'},{'Username':'admin','Page':'Holidays','Access':'Full Access'},{'Username':'admin','Page':'Reports & Score','Access':'Full Access'},{'Username':'admin','Page':'Assign Task','Access':'Full Access'},{'Username':'admin','Page':'Settings','Access':'Full Access'},{'Username':'admin','Page':'History','Access':'Full Access'},{'Username':'admin','Page':'Help & Support','Access':'Full Access'},{'Username':'admin','Page':'Live Score','Access':'Full Access'},{'Username':'admin','Page':'Admin Access','Access':'Full Access'},{'Username':'admin','Page':'Planned Tasks','Access':'Full Access'},{'Username':'admin','Page':'Task Visibility','Access':'All Tasks'},{'Username':'admin','Page':'Calendar Past','Access':'Allowed'},{'Username':'admin','Page':'Calendar Future','Access':'Allowed'},
    {'Username':'rahul','Page':'Dashboard','Access':'Viewer'},{'Username':'rahul','Page':'Checklist','Access':'Editor'},{'Username':'rahul','Page':'Delegation','Access':'Editor'},{'Username':'rahul','Page':'Calendar','Access':'Viewer'},{'Username':'rahul','Page':'Holidays','Access':'Viewer'},{'Username':'rahul','Page':'Reports & Score','Access':'Viewer'},{'Username':'rahul','Page':'Assign Task','Access':'Viewer'},{'Username':'rahul','Page':'Settings','Access':'Viewer'},{'Username':'rahul','Page':'History','Access':'Viewer'},{'Username':'rahul','Page':'Help & Support','Access':'Viewer'},{'Username':'rahul','Page':'Live Score','Access':'Viewer'},{'Username':'rahul','Page':'All TasksList','Access':'Editor'},{'Username':'rahul','Page':'Planned Tasks','Access':'Editor'},{'Username':'rahul','Page':'Admin Access','Access':'None'},{'Username':'rahul','Page':'Calendar Past','Access':'Allowed'},{'Username':'rahul','Page':'Calendar Future','Access':'Denied'},
    {'Username':'amit','Page':'Dashboard','Access':'Full Access'},{'Username':'amit','Page':'Checklist','Access':'Viewer'},{'Username':'amit','Page':'Delegation','Access':'Viewer'},{'Username':'amit','Page':'Calendar','Access':'Viewer'},{'Username':'amit','Page':'Holidays','Access':'Editor'},{'Username':'amit','Page':'Reports & Score','Access':'Viewer'},{'Username':'amit','Page':'Assign Task','Access':'Viewer'},{'Username':'amit','Page':'Settings','Access':'Viewer'},{'Username':'amit','Page':'History','Access':'Viewer'},{'Username':'amit','Page':'Help & Support','Access':'Viewer'},{'Username':'amit','Page':'Live Score','Access':'Viewer'},{'Username':'amit','Page':'All TasksList','Access':'Viewer'},{'Username':'amit','Page':'Planned Tasks','Access':'Viewer'},{'Username':'amit','Page':'Admin Access','Access':'None'},{'Username':'amit','Page':'Task Visibility','Access':'Own Tasks'},{'Username':'amit','Page':'Calendar Past','Access':'Allowed'},{'Username':'amit','Page':'Calendar Future','Access':'Allowed'}
  ],
  Checklist:[
    {'Task ID':'C-1001','Task Description':'Submit Daily Report','Department':'Operations','Given By':'rahul','Name':'rahul','Task Start Date':localISO(),'Task Start Time':'09:00','Freq':'Daily','Status':'Pending','Require Attachment':'No','Enable Reminders':'Yes'},
    {'Task ID':'C-1002','Task Description':'Stock Verification','Department':'Operations','Given By':'rahul','Name':'rahul','Task Start Date':localISO(),'Task Start Time':'09:00','Freq':'Daily','Status':'Done','Actual Date':localISO(),'Actual Time':'08:45','Completion Type':'ON_TIME','Require Attachment':'No','Enable Reminders':'No'},
    {'Task ID':'C-1003','Task Description':'Safety Inspection','Department':'Operations','Given By':'rahul','Name':'rahul','Task Start Date':localISO(2),'Task Start Time':'10:30','Freq':'Monthly','Status':'Pending','Require Attachment':'No','Enable Reminders':'No'},
  ],
  DELEGATION:[
    {'Task ID':'D-1001','Task Description':'Client Proposal Review','Department':'Operations','Given By':'rahul','Name':'rahul','Task Start Date':localISO(),'Task Start Time':'09:00','Freq':'One-Time','Status':'Pending','Require Attachment':'No','Enable Reminders':'No'},
    {'Task ID':'D-1002','Task Description':'Weekly Team Follow-up','Department':'Sales','Given By':'rahul','Name':'amit','Task Start Date':localISO(1),'Task Start Time':'11:00','Freq':'Weekly','Status':'Pending','Require Attachment':'No','Enable Reminders':'Yes'},
  ],
  'TASK HISTORY':[
    {'Task ID':'D-0999','Task Description':'Completed Sample Task','Task Type':'Delegation','Doer':'rahul','Given By':'rahul','Department':'Operations','Planned Date':localISO(-1),'Planned Time':'10:00','Actual Date':localISO(-1),'Actual Time':'09:40','Status':'Done','Completion Type':'ON_TIME','Remarks':'Demo completion','Submitted Date':new Date().toISOString()}
  ],
  'HELP & SUPPORT':[],
  'DELEGATION DONE':[
    {'Timestamp':new Date().toISOString(),'Task ID':'D-0999','Status':'Done','Completion Type':'ON_TIME','Next Target Date':'','Remarks':'Demo completion','Attachment':'','Submitted Date':new Date().toISOString(),'Actual Date':localISO(-1),'Actual Time':'09:40','Doer':'rahul','Task':'Completed Sample Task','Given By':'rahul','Department':'Operations'}
  ],
  'Working Day Calendar':[],
  'AllTasksList':[
    {'Name':'rahul','Task Description':'Monthly compliance review','Freq':'Monthly','Remarks':'Type entries here or on the All TasksList page'},
    {'Name':'amit','Task Description':'Client renewal follow-up','Freq':'Quarterly','Remarks':''},
  ],
  'HOLIDAYS':[
    {'Date':localISO(2),'Occasion':'Ganesh Chaturthi'},
    {'Date':localISO(8),'Occasion':'Milad-un-Nabi'},
  ],
  'Task_Planned_CL':[
    {'Plan ID':'PCL-1','Task Description':'Submit daily production report','Department':'Operations','Given By':'rahul','Name':'rahul','Start Date':firstOfMonthISO(),'Time':'18:00','Freq':'Daily','End Date':'','Require Attachment':'No','Enable Reminders':'Yes','Remarks':'','Active':'Yes'},
    {'Plan ID':'PCL-2','Task Description':'Weekly vendor reconciliation','Department':'Operations','Given By':'rahul','Name':'rahul','Start Date':firstOfMonthISO(),'Time':'16:00','Freq':'Weekly','End Date':'','Require Attachment':'No','Enable Reminders':'No','Remarks':'','Active':'Yes'},
  ],
  'Task_Planned_DL':[
    {'Plan ID':'PDL-1','Task Description':'Monthly client check-in','Department':'Sales','Given By':'rahul','Name':'amit','Start Date':firstOfMonthISO(),'Time':'12:00','Freq':'Monthly','End Date':'','Require Attachment':'No','Enable Reminders':'No','Remarks':'','Active':'Yes'},
  ]
}
function clone(v){return JSON.parse(JSON.stringify(v))}
function seed(){localStorage.setItem(KEY,JSON.stringify(initial));return clone(initial)}
export function getStore(){const raw=localStorage.getItem(KEY);if(!raw)return seed();try{const store=JSON.parse(raw);if(!store['ACCESS CONTROL']){store['ACCESS CONTROL']=clone(initial['ACCESS CONTROL']);saveStore(store)}return store}catch{return seed()}}
export function saveStore(store){localStorage.setItem(KEY,JSON.stringify(store));return store}
export function resetDemoStore(){return seed()}
export function getDemoSheet(name){return clone(getStore()[name]||[])}
function allListIdx_(rows,row,expectName,expectTitle){
 let idx=Number(row)-2
 if(idx<0||idx>=rows.length)throw new Error('AllTasksList row not found. Refresh and try again.')
 if(expectName!==undefined&&expectName!==''&&String(rows[idx]['Name']||'')!==String(expectName))throw new Error('That row changed in the sheet. Refresh and try again.')
 if(expectTitle!==undefined&&expectTitle!==''&&String(rows[idx]['Task Description']||'')!==String(expectTitle))throw new Error('That row changed in the sheet. Refresh and try again.')
 return idx
}
export function allListAddDemo({name,taskDescription,taskTitle,freq,frequency,remarks}){
 const store=getStore();store['AllTasksList']=store['AllTasksList']||[]
 store['AllTasksList'].push({'Name':name||'','Task Description':taskDescription||taskTitle||'','Freq':freq||frequency||'One-Time','Remarks':remarks||''})
 saveStore(store);return {success:true,demo:true}
}
export function allListUpdateDemo({row,name,taskDescription,taskTitle,freq,frequency,remarks,expectName,expectTitle}){
 const store=getStore();const rows=store['AllTasksList']||[]
 const idx=allListIdx_(rows,row,expectName,expectTitle)
 if(name!==undefined)rows[idx]['Name']=name
 if(taskDescription!==undefined||taskTitle!==undefined)rows[idx]['Task Description']=taskDescription!==undefined?taskDescription:taskTitle
 if(freq!==undefined||frequency!==undefined)rows[idx]['Freq']=freq!==undefined?freq:frequency
 if(remarks!==undefined)rows[idx]['Remarks']=remarks
 saveStore(store);return {success:true,demo:true}
}
export function allListDeleteDemo({row,expectName,expectTitle}){
 const store=getStore();const rows=store['AllTasksList']||[]
 const idx=allListIdx_(rows,row,expectName,expectTitle)
 rows.splice(idx,1);saveStore(store);return {success:true,demo:true}
}
export function demoLoginUsers(){return clone(getStore().users)}
export function demoAccessRows(username=''){const want=String(username||'').trim().toLowerCase();return clone(getStore()['ACCESS CONTROL']||[]).map(r=>({Username:String(r.Username||'').trim(),Page:String(r.Page||'').trim(),Access:String(r.Access||'').trim()})).filter(r=>!want||r.Username.toLowerCase()===want)}
export function submitDemoSupport(fields){const store=getStore();store['HELP & SUPPORT']=store['HELP & SUPPORT']||[];store['HELP & SUPPORT'].push({'Timestamp':new Date().toISOString(),'Doer Name':fields.doerName||fields.username||'','Department':fields.department||'','Request Type':fields.type||'Suggestion','Priority':fields.priority||'Normal','Subject':fields.subject||'','Details':fields.message||''});saveStore(store);return {success:true,demo:true}}
export function createDemoUser({username,password,department='',role='user'}){const store=getStore();const u=String(username||'').trim().toLowerCase();if(!u||!password)throw new Error('Username and password are required.');if((store.users||[]).some(x=>String(x.username).toLowerCase()===u))throw new Error('Username already exists.');store.users=store.users||[];store.users.push({username:u,password:String(password),department:String(department||''),role:String(role||'user').toLowerCase()});store['ACCESS CONTROL']=store['ACCESS CONTROL']||[];['Dashboard','Checklist','Delegation','Calendar','Holidays','Reports & Score','Assign Task','Settings','History','Help & Support','Live Score','All TasksList','Planned Tasks'].forEach(Page=>store['ACCESS CONTROL'].push({Username:u,Page,Access:'Viewer'}));store['ACCESS CONTROL'].push({Username:u,Page:'Admin Access',Access:'None'},{Username:u,Page:'Task Visibility',Access:'Own Tasks'},{Username:u,Page:'Calendar Past',Access:'Allowed'},{Username:u,Page:'Calendar Future',Access:'Allowed'});saveStore(store);return {success:true,demo:true,username:u}}
export function saveDemoAccess(username,permissions){const store=getStore();const rows=(store['ACCESS CONTROL']||[]).filter(r=>String(r.Username||'').toLowerCase()!==String(username||'').toLowerCase());Object.entries(permissions||{}).forEach(([Page,Access])=>rows.push({Username:username,Page,Access}));store['ACCESS CONTROL']=rows;saveStore(store);return {success:true,demo:true}}

export function updateDemoUser({username,newUsername,password,department,role}){
 const store=getStore(); const cur=String(username||'').trim().toLowerCase();
 const user=(store.users||[]).find(x=>String(x.username).toLowerCase()===cur);
 if(!user)throw new Error('User not found.');
 const nextName=String(newUsername||username).trim().toLowerCase();
 if(nextName!==cur&&(store.users||[]).some(x=>String(x.username).toLowerCase()===nextName))throw new Error('That username already exists.');
 if(cur==='admin'&&nextName!=='admin')throw new Error('The default admin account cannot be renamed.');
 user.username=nextName;
 if(password)user.password=String(password);
 if(department!==undefined)user.department=String(department||'');
 if(role!==undefined)user.role=String(role||'user').toLowerCase();
 if(nextName!==cur){
  (store['ACCESS CONTROL']||[]).forEach(r=>{if(String(r.Username||'').toLowerCase()===cur)r.Username=nextName});
  ['Checklist','DELEGATION'].forEach(s=>(store[s]||[]).forEach(r=>{
   if(String(r['Name']||'').toLowerCase()===cur)r['Name']=nextName;
   if(String(r['Given By']||'').toLowerCase()===cur)r['Given By']=nextName;
  }));
 }
 saveStore(store);return {success:true,demo:true,username:nextName}
}
export function deleteDemoUser({username}){
 const store=getStore(); const u=String(username||'').trim().toLowerCase();
 if(u==='admin')throw new Error('The default admin account cannot be deleted.');
 const before=(store.users||[]).length;
 store.users=(store.users||[]).filter(x=>String(x.username).toLowerCase()!==u);
 if(store.users.length===before)throw new Error('User not found.');
 store['ACCESS CONTROL']=(store['ACCESS CONTROL']||[]).filter(r=>String(r.Username||'').toLowerCase()!==u);
 saveStore(store);return {success:true,demo:true}
}
function findTaskSheet_(store,taskType,taskId){
 const s=String(taskType||'').toLowerCase()==='checklist'?'Checklist':'DELEGATION';
 const rows=store[s]||[]; const idx=rows.findIndex(r=>String(r['Task ID'])===String(taskId));
 return {sheet:s,rows,idx}
}
export function updateDemoTask({taskId,taskType,taskTitle,assignee,department,givenBy,plannedDate,plannedTime,frequency,status,remarks}){
 const store=getStore(); const {rows,idx}=findTaskSheet_(store,taskType,taskId);
 if(idx<0)throw new Error('Task not found in demo data.');
 const r=rows[idx];
 if(taskTitle!==undefined)r['Task Description']=taskTitle;
 if(assignee!==undefined)r['Name']=assignee;
 if(department!==undefined)r['Department']=department;
 if(givenBy!==undefined)r['Given By']=givenBy;
 if(plannedDate!==undefined)r['Task Start Date']=plannedDate;
 if(plannedTime!==undefined)r['Task Start Time']=plannedTime;
 if(frequency!==undefined)r['Freq']=frequency;
 if(status!==undefined)r['Status']=status;
 if(remarks!==undefined)r['Remarks']=remarks;
 saveStore(store);return {success:true,demo:true,taskId}
}
export function deleteDemoTask({taskId,taskType}){
 const store=getStore(); const {sheet,rows,idx}=findTaskSheet_(store,taskType,taskId);
 if(idx<0)throw new Error('Task not found in demo data.');
 rows.splice(idx,1); store[sheet]=rows; saveStore(store);return {success:true,demo:true}
}
export function saveDemoHoliday({date,occasion}){
 const store=getStore(); const iso=String(date||'').trim();
 if(!iso)throw new Error('A date is required.');
 store['HOLIDAYS']=store['HOLIDAYS']||[];
 const idx=store['HOLIDAYS'].findIndex(r=>String(r['Date']||'').trim()===iso);
 const row={'Date':iso,'Occasion':String(occasion||'Holiday').trim()||'Holiday'};
 if(idx>=0)store['HOLIDAYS'][idx]=row; else store['HOLIDAYS'].push(row);
 store['HOLIDAYS'].sort((a,b)=>String(a['Date']).localeCompare(String(b['Date'])));
 saveStore(store);return {success:true,demo:true}
}
export function deleteDemoHoliday({date}){
 const store=getStore(); const iso=String(date||'').trim();
 store['HOLIDAYS']=(store['HOLIDAYS']||[]).filter(r=>String(r['Date']||'').trim()!==iso);
 saveStore(store);return {success:true,demo:true}
}
export function nextTaskId(type){const prefix=type==='checklist'?'C':'D';const rows=[...(getStore().Checklist||[]),...(getStore().DELEGATION||[])];const nums=rows.map(r=>String(r['Task ID']||'').match(/^(?:C|D)-(\d+)$/i)).filter(Boolean).map(m=>Number(m[1]));return `${prefix}-${String(Math.max(1000,...nums)+1)}`}
export function insertDemoTask({taskType,taskTitle,department,givenBy,assignee,plannedDate,plannedTime='',frequency,reminders,requireAttachment,remarks}){
 const store=getStore(); const sheet=taskType==='checklist'?'Checklist':'DELEGATION'; const id=nextTaskId(taskType);
 const row={'Task ID':id,'Task Description':taskTitle,'Department':department||'','Given By':givenBy||'','Name':assignee||'','Task Start Date':plannedDate||'','Task Start Time':plannedTime||'','Freq':frequency||'One-Time','Status':'Pending','Require Attachment':requireAttachment?'Yes':'No','Enable Reminders':reminders?'Yes':'No','Remarks':remarks||''};
 store[sheet]=store[sheet]||[];store[sheet].push(row);saveStore(store);return {success:true,demo:true,taskId:id,row}
}
export function completeDemoTask(task,{status='Done',remarks='',nextTargetDate='',attachmentUrl='',actualDate='',actualTime='',completionType='',responsibilityConfirmed=false}={}){
 const store=getStore();
 const isChecklist=String(task.type||'').toLowerCase()==='checklist';
 const sheet=isChecklist?'Checklist':'DELEGATION';
 const rows=store[sheet]||[]; const idx=rows.findIndex(r=>String(r['Task ID'])===String(task.id));
 if(idx<0)throw new Error('Task not found in demo data.');
 if(!responsibilityConfirmed)throw new Error('Responsibility confirmation is required.');
 const planned=String(task.plannedISO||'').slice(0,10); const actual=actualDate||todayLocalISO(); const actualClock=actualTime||localTimeNow();
 if(planned&&actual<planned)throw new Error(`This task cannot be completed before ${task.planned||planned}.`);
 if(String(rows[idx].Status||'').toLowerCase()==='done')throw new Error('Task is already completed.');
 rows[idx].Status=status; rows[idx]['Actual Date']=actual; rows[idx]['Actual Time']=actualClock; rows[idx]['Completion Type']=completionType; rows[idx].Remarks=remarks; rows[idx]['Responsibility Confirmed']='Yes'; rows[idx]['Confirmed At']=new Date().toISOString();
 store['TASK HISTORY']=store['TASK HISTORY']||[]; store['TASK HISTORY'].push({'Task ID':task.id,'Task Description':task.title,'Task Type':task.type,'Doer':task.assignee,'Given By':task.givenBy,'Department':task.department,'Planned Date':task.plannedISO||'','Planned Time':task.plannedTime||'','Actual Date':actual,'Actual Time':actualClock,'Status':status,'Completion Type':completionType,'Remarks':remarks,'Submitted Date':new Date().toISOString()});
 if(!isChecklist){
   store['DELEGATION DONE']=store['DELEGATION DONE']||[];
   store['DELEGATION DONE'].push({'Timestamp':new Date().toISOString(),'Task ID':task.id,'Status':status,'Completion Type':completionType,'Next Target Date':nextTargetDate,'Remarks':remarks,'Attachment':attachmentUrl,'Submitted Date':new Date().toISOString(),'Actual Date':actual,'Actual Time':actualClock,'Responsibility Confirmed':'Yes','Doer':task.assignee,'Task':task.title,'Given By':task.givenBy,'Department':task.department});
 }
 saveStore(store);return {success:true,demo:true}
}

// ---- Recurring plans (Task_Planned_CL / Task_Planned_DL) --------------------
function planSheet_(scope){return String(scope||'').toUpperCase()==='DL'?'Task_Planned_DL':'Task_Planned_CL'}
function nextPlanId_(scope){
 const prefix=String(scope||'').toUpperCase()==='DL'?'PDL':'PCL'
 const rows=getStore()[planSheet_(scope)]||[]
 const nums=rows.map(r=>String(r['Plan ID']||'').match(/^P(?:CL|DL)-(\d+)$/i)).filter(Boolean).map(m=>Number(m[1]))
 return `${prefix}-${(nums.length?Math.max(...nums):0)+1}`
}
const planYesNo_=v=>(v===true||['yes','true','1','y'].includes(String(v).trim().toLowerCase()))?'Yes':'No'
const planActive_=v=>(v===undefined||v===null||v==='')?'Yes':((v===false||['no','n','false','0','inactive','off'].includes(String(v).trim().toLowerCase()))?'No':'Yes')

export function planAddDemo(f){
 const store=getStore();const s=planSheet_(f.scope);store[s]=store[s]||[]
 store[s].push({
  'Plan ID':String(f.planId||'').trim()||nextPlanId_(f.scope),
  'Task Description':f.taskDescription||f.title||'',
  'Department':f.department||'',
  'Given By':f.givenBy||'',
  'Name':f.name||f.assignee||'',
  'Start Date':f.startDate||'',
  'Time':f.time||'',
  'Freq':f.frequency||f.freq||'Daily',
  'End Date':f.endDate||'',
  'Require Attachment':planYesNo_(f.requireAttachment),
  'Enable Reminders':planYesNo_(f.reminders),
  'Remarks':f.remarks||'',
  'Active':planActive_(f.active)
 })
 saveStore(store);return {success:true,demo:true}
}
export function planUpdateDemo(f){
 const store=getStore();const rows=store[planSheet_(f.scope)]||[]
 const idx=rows.findIndex(r=>String(r['Plan ID'])===String(f.planId))
 if(idx<0)throw new Error('Plan not found. Refresh and try again.')
 const r=rows[idx]
 if(f.taskDescription!==undefined||f.title!==undefined)r['Task Description']=f.taskDescription!==undefined?f.taskDescription:f.title
 if(f.department!==undefined)r['Department']=f.department
 if(f.givenBy!==undefined)r['Given By']=f.givenBy
 if(f.name!==undefined||f.assignee!==undefined)r['Name']=f.name!==undefined?f.name:f.assignee
 if(f.startDate!==undefined)r['Start Date']=f.startDate
 if(f.time!==undefined)r['Time']=f.time
 if(f.frequency!==undefined||f.freq!==undefined)r['Freq']=f.frequency!==undefined?f.frequency:f.freq
 if(f.endDate!==undefined)r['End Date']=f.endDate
 if(f.requireAttachment!==undefined)r['Require Attachment']=planYesNo_(f.requireAttachment)
 if(f.reminders!==undefined)r['Enable Reminders']=planYesNo_(f.reminders)
 if(f.remarks!==undefined)r['Remarks']=f.remarks
 if(f.active!==undefined)r['Active']=planActive_(f.active)
 saveStore(store);return {success:true,demo:true}
}
export function planDeleteDemo(f){
 const store=getStore();const rows=store[planSheet_(f.scope)]||[]
 const idx=rows.findIndex(r=>String(r['Plan ID'])===String(f.planId))
 if(idx<0)throw new Error('Plan not found.')
 rows.splice(idx,1);saveStore(store);return {success:true,demo:true}
}

function demoFreq_(raw){
 const s=String(raw||'').trim().toLowerCase()
 if(s.startsWith('d'))return 'daily'
 if(s.startsWith('fort'))return 'fortnightly'
 if(s.startsWith('w'))return 'weekly'
 if(s.startsWith('q'))return 'quarterly'
 if(s.startsWith('half')||s.includes('halfyear'))return 'half-yearly'
 if(s.startsWith('m'))return 'monthly'
 if(s.startsWith('y'))return 'yearly'
 return 'one-time'
}
function demoStep_(d,freq){
 const x=new Date(d)
 if(freq==='daily')x.setDate(x.getDate()+1)
 else if(freq==='fortnightly')x.setDate(x.getDate()+14)
 else if(freq==='weekly')x.setDate(x.getDate()+7)
 else if(freq==='monthly')x.setMonth(x.getMonth()+1)
 else if(freq==='quarterly')x.setMonth(x.getMonth()+3)
 else if(freq==='half-yearly')x.setMonth(x.getMonth()+6)
 else if(freq==='yearly')x.setFullYear(x.getFullYear()+1)
 else return null
 return x
}
function demoKey_(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function demoWorkingDay_(d,holidaySet){let g=0;while(g++<90){if(d.getDay()===0){d.setDate(d.getDate()+1);continue}if(holidaySet.has(demoKey_(d))){d.setDate(d.getDate()+1);continue}break}return d}
function demoParse_(v){const s=String(v==null?'':v).trim();if(!s)return null;const dmy=s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);if(dmy)return new Date(+dmy[3],+dmy[2]-1,+dmy[1]);const ymd=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(ymd)return new Date(+ymd[1],+ymd[2]-1,+ymd[3]);const d=new Date(s);return isNaN(d.getTime())?null:new Date(d.getFullYear(),d.getMonth(),d.getDate())}

export function generatePlannedMonthDemo({target='current'}={}){
 const store=getStore()
 const now=new Date()
 const anchor=String(target)==='next'?new Date(now.getFullYear(),now.getMonth()+1,1):new Date(now.getFullYear(),now.getMonth(),1)
 const monthStart=new Date(anchor.getFullYear(),anchor.getMonth(),1)
 const monthEnd=new Date(anchor.getFullYear(),anchor.getMonth()+1,0)
 const todayKey=demoKey_(new Date(now.getFullYear(),now.getMonth(),now.getDate()))
 const holidaySet=new Set((store['HOLIDAYS']||[]).map(r=>{const d=demoParse_(r['Date']);return d?demoKey_(d):null}).filter(Boolean))
 let created=0,skipped=0,plans=0
 ;[['Task_Planned_CL','Checklist'],['Task_Planned_DL','DELEGATION']].forEach(([planSheetName,targetSheet])=>{
  const defs=store[planSheetName]||[]
  store[targetSheet]=store[targetSheet]||[]
  const existing=new Set((store[targetSheet]||[]).map(r=>String(r['Task ID']||'')))
  defs.forEach((p,i)=>{
   if(planActive_(p['Active'])==='No')return
   const start=demoParse_(p['Start Date']);if(!start)return
   plans++
   const freq=demoFreq_(p['Freq'])
   const end=demoParse_(p['End Date'])
   const planId=String(p['Plan ID']||'').trim()||((planSheetName==='Task_Planned_DL'?'PDL-':'PCL-')+(i+1))
   const seen=new Set()
   const emit=d=>{
    if(d<monthStart||d>monthEnd)return
    if(end&&d>end)return
    const k=demoKey_(d)
    if(seen.has(k))return; seen.add(k)
    if(k<todayKey)return
    const id=planId+'#'+k
    if(existing.has(id)){skipped++;return}
    existing.add(id)
    store[targetSheet].push({
     'Task ID':id,
     'Task Description':p['Task Description']||'',
     'Department':p['Department']||'',
     'Given By':p['Given By']||'',
     'Name':p['Name']||'',
     'Task Start Date':k,
     'Task Start Time':p['Time']||'',
     'Freq':'One-Time',
     'Status':'Pending',
     'Require Attachment':p['Require Attachment']||'No',
     'Enable Reminders':p['Enable Reminders']||'No',
     'Remarks':p['Remarks']||''
    })
    created++
   }
   let occ=demoWorkingDay_(new Date(start),holidaySet)
   if(freq==='one-time'){emit(occ);return}
   let guard=0
   while(occ<=monthEnd&&guard++<15000){
    emit(new Date(occ))
    const next=demoStep_(occ,freq)
    if(!next)break
    occ=demoWorkingDay_(next,holidaySet)
   }
  })
 })
 saveStore(store);return {success:true,demo:true,created,skipped,plans,month:demoKey_(monthStart).slice(0,7)}
}
