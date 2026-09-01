const KEY = 'crest_demo_store_v3'

function localISO(offset=0){ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const initial = {
  users:[
    {department:'Administration',username:'admin',password:'admin123',role:'admin'},
    {department:'Operations',username:'rahul',password:'1234',role:'user'},
    {department:'Sales',username:'amit',password:'1234',role:'user'},
  ],
  'ACCESS CONTROL':[
    {'Username':'admin','Page':'Dashboard','Access':'Full Access'},{'Username':'admin','Page':'Tasks List','Access':'Full Access'},{'Username':'admin','Page':'Delegation','Access':'Full Access'},{'Username':'admin','Page':'Calendar','Access':'Full Access'},{'Username':'admin','Page':'Reports & Score','Access':'Full Access'},{'Username':'admin','Page':'Assign Task','Access':'Full Access'},{'Username':'admin','Page':'Settings','Access':'Full Access'},{'Username':'admin','Page':'History','Access':'Full Access'},{'Username':'admin','Page':'Help & Support','Access':'Full Access'},{'Username':'admin','Page':'Live Score','Access':'Full Access'},{'Username':'admin','Page':'Admin Access','Access':'Full Access'},{'Username':'admin','Page':'Task Visibility','Access':'All Tasks'},
    {'Username':'rahul','Page':'Dashboard','Access':'Viewer'},{'Username':'rahul','Page':'Tasks List','Access':'Editor'},{'Username':'rahul','Page':'Delegation','Access':'Editor'},{'Username':'rahul','Page':'Calendar','Access':'Viewer'},{'Username':'rahul','Page':'Reports & Score','Access':'Viewer'},{'Username':'rahul','Page':'Assign Task','Access':'Viewer'},{'Username':'rahul','Page':'Settings','Access':'Viewer'},{'Username':'rahul','Page':'History','Access':'Viewer'},{'Username':'rahul','Page':'Help & Support','Access':'Viewer'},{'Username':'rahul','Page':'Live Score','Access':'Viewer'},{'Username':'rahul','Page':'Admin Access','Access':'Viewer'},
    {'Username':'amit','Page':'Dashboard','Access':'Full Access'},{'Username':'amit','Page':'Tasks List','Access':'Editor'},{'Username':'amit','Page':'Delegation','Access':'Editor'},{'Username':'amit','Page':'Calendar','Access':'Viewer'},{'Username':'amit','Page':'Reports & Score','Access':'Viewer'},{'Username':'amit','Page':'Assign Task','Access':'Viewer'},{'Username':'amit','Page':'Settings','Access':'Viewer'},{'Username':'amit','Page':'History','Access':'Viewer'},{'Username':'amit','Page':'Help & Support','Access':'Viewer'},{'Username':'amit','Page':'Live Score','Access':'Viewer'},{'Username':'amit','Page':'Admin Access','Access':'Viewer'},{'Username':'amit','Page':'Task Visibility','Access':'Own Tasks'}
  ],
  Checklist:[
    {'Task ID':'C-1001','Task Description':'Submit Daily Report','Department':'Operations','Given By':'rahul','Name':'rahul','Task Start Date':localISO(),'Task Start Time':'09:00','Freq':'Daily','Status':'Pending','Require Attachment':'No','Enable Reminders':'Yes'},
    {'Task ID':'C-1002','Task Description':'Stock Verification','Department':'Operations','Given By':'rahul','Name':'rahul','Task Start Date':localISO(),'Task Start Time':'09:00','Freq':'Daily','Status':'Done','Require Attachment':'No','Enable Reminders':'No'},
    {'Task ID':'C-1003','Task Description':'Safety Inspection','Department':'Operations','Given By':'rahul','Name':'rahul','Task Start Date':localISO(2),'Task Start Time':'10:30','Freq':'Monthly','Status':'Pending','Require Attachment':'No','Enable Reminders':'No'},
  ],
  DELEGATION:[
    {'Task ID':'D-1001','Task Description':'Client Proposal Review','Department':'Operations','Given By':'rahul','Name':'rahul','Task Start Date':localISO(),'Task Start Time':'09:00','Freq':'One-Time','Status':'Pending','Require Attachment':'No','Enable Reminders':'No'},
    {'Task ID':'D-1002','Task Description':'Weekly Team Follow-up','Department':'Sales','Given By':'rahul','Name':'amit','Task Start Date':localISO(1),'Task Start Time':'11:00','Freq':'Weekly','Status':'Pending','Require Attachment':'No','Enable Reminders':'Yes'},
  ],
  'TASK HISTORY':[],
  'HELP & SUPPORT':[],
  'DELEGATION DONE':[
    {'Timestamp':new Date().toISOString(),'Task ID':'D-0999','Status':'Done','Next Target Date':'','Remarks':'Demo completion','Attachment':'','Submitted Date':new Date().toISOString(),'Doer':'rahul','Task':'Completed Sample Task','Given By':'rahul','Department':'Operations'}
  ],
  'Working Day Calendar':[]
}
function clone(v){return JSON.parse(JSON.stringify(v))}
function seed(){localStorage.setItem(KEY,JSON.stringify(initial));return clone(initial)}
export function getStore(){const raw=localStorage.getItem(KEY);if(!raw)return seed();try{const store=JSON.parse(raw);if(!store['ACCESS CONTROL']){store['ACCESS CONTROL']=clone(initial['ACCESS CONTROL']);saveStore(store)}return store}catch{return seed()}}
export function saveStore(store){localStorage.setItem(KEY,JSON.stringify(store));return store}
export function resetDemoStore(){return seed()}
export function getDemoSheet(name){return clone(getStore()[name]||[])}
export function demoLoginUsers(){return clone(getStore().users)}
export function demoAccessRows(username=''){return clone(getStore()['ACCESS CONTROL']||[]).filter(r=>!username||String(r.Username||'').toLowerCase()===String(username).toLowerCase())}
export function submitDemoSupport(fields){const store=getStore();store['HELP & SUPPORT']=store['HELP & SUPPORT']||[];store['HELP & SUPPORT'].push({'Timestamp':new Date().toISOString(),'Doer Name':fields.doerName||fields.username||'','Department':fields.department||'','Request Type':fields.type||'Suggestion','Priority':fields.priority||'Normal','Subject':fields.subject||'','Details':fields.message||''});saveStore(store);return {success:true,demo:true}}
export function createDemoUser({username,password,department='',role='user'}){const store=getStore();const u=String(username||'').trim().toLowerCase();if(!u||!password)throw new Error('Username and password are required.');if((store.users||[]).some(x=>String(x.username).toLowerCase()===u))throw new Error('Username already exists.');store.users=store.users||[];store.users.push({username:u,password:String(password),department:String(department||''),role:String(role||'user').toLowerCase()});store['ACCESS CONTROL']=store['ACCESS CONTROL']||[];['Dashboard','Tasks List','Delegation','Calendar','Reports & Score','Assign Task','Settings','History','Help & Support','Live Score'].forEach(Page=>store['ACCESS CONTROL'].push({Username:u,Page,Access:'Viewer'}));store['ACCESS CONTROL'].push({Username:u,Page:'Admin Access',Access:'None'},{Username:u,Page:'Task Visibility',Access:'Own Tasks'});saveStore(store);return {success:true,demo:true,username:u}}
export function saveDemoAccess(username,permissions){const store=getStore();const rows=(store['ACCESS CONTROL']||[]).filter(r=>String(r.Username||'').toLowerCase()!==String(username||'').toLowerCase());Object.entries(permissions||{}).forEach(([Page,Access])=>rows.push({Username:username,Page,Access}));store['ACCESS CONTROL']=rows;saveStore(store);return {success:true,demo:true}}
export function nextTaskId(type){const prefix=type==='checklist'?'C':'D';const rows=[...(getStore().Checklist||[]),...(getStore().DELEGATION||[])];const nums=rows.map(r=>String(r['Task ID']||'').match(/^(?:C|D)-(\d+)$/i)).filter(Boolean).map(m=>Number(m[1]));return `${prefix}-${String(Math.max(1000,...nums)+1)}`}
export function insertDemoTask({taskType,taskTitle,department,givenBy,assignee,plannedDate,plannedTime='',frequency,reminders,requireAttachment,remarks}){
 const store=getStore(); const sheet=taskType==='checklist'?'Checklist':'DELEGATION'; const id=nextTaskId(taskType);
 const row={'Task ID':id,'Task Description':taskTitle,'Department':department||'','Given By':givenBy||'','Name':assignee||'','Task Start Date':plannedDate||'','Task Start Time':plannedTime||'','Freq':frequency||'One-Time','Status':'Pending','Require Attachment':requireAttachment?'Yes':'No','Enable Reminders':reminders?'Yes':'No','Remarks':remarks||''};
 store[sheet]=store[sheet]||[];store[sheet].push(row);saveStore(store);return {success:true,demo:true,taskId:id,row}
}
export function completeDemoTask(task,{status='Done',remarks='',nextTargetDate='',attachmentUrl='',actualDate='',completionType='',responsibilityConfirmed=false}={}){
 const store=getStore(); const sheet=task.type==='checklist'?'Checklist':'DELEGATION'; const rows=store[sheet]||[]; const idx=rows.findIndex(r=>String(r['Task ID'])===String(task.id));
 if(idx<0)throw new Error('Task not found in demo data.');
 if(!responsibilityConfirmed)throw new Error('Responsibility confirmation is required.');
 const planned=String(task.plannedISO||''); const actual=actualDate||new Date().toISOString().slice(0,10); const freq=String(task.frequency||'One-Time').trim().toLowerCase();
 if(freq==='daily'&&planned&&actual<planned)throw new Error(`Daily task cannot be completed before ${task.planned||planned}.`);
 if(String(rows[idx].Status||'').toLowerCase()==='done')throw new Error('Task is already completed.');
 rows[idx].Status=status; rows[idx]['Actual Date']=actual; rows[idx]['Completion Type']=completionType; rows[idx].Remarks=remarks; rows[idx]['Responsibility Confirmed']='Yes'; rows[idx]['Confirmed At']=new Date().toISOString();
 store['TASK HISTORY']=store['TASK HISTORY']||[]; store['TASK HISTORY'].push({'Task ID':task.id,'Task Description':task.title,'Task Type':task.type,'Doer':task.assignee,'Given By':task.givenBy,'Department':task.department,'Planned Date':task.plannedISO||'','Planned Time':task.plannedTime||'','Actual Date':actual,'Status':status,'Completion Type':completionType,'Remarks':remarks,'Submitted Date':new Date().toISOString()});
 if(task.type==='Delegation'){
   store['DELEGATION DONE']=store['DELEGATION DONE']||[];
   store['DELEGATION DONE'].push({'Timestamp':new Date().toISOString(),'Task ID':task.id,'Status':status,'Completion Type':completionType,'Next Target Date':nextTargetDate,'Remarks':remarks,'Attachment':attachmentUrl,'Submitted Date':new Date().toISOString(),'Actual Date':actual,'Responsibility Confirmed':'Yes','Doer':task.assignee,'Task':task.title,'Given By':task.givenBy,'Department':task.department});
 }
 saveStore(store);return {success:true,demo:true}
}
