/** CREST Task Management - Google Apps Script backend. */
function doGet(e){try{var p=e&&e.parameter||{};var action=String(p.action||'health');if(action==='health')return json_({success:true,message:'CREST backend is running',time:new Date().toISOString()});if(action==='fetch'){var name=String(p.sheet||'');if(!name)throw new Error('sheet is required');return json_(readSheet_(name));}throw new Error('Unsupported GET action: '+action);}catch(err){return json_({success:false,error:String(err.message||err)});}}
function doPost(e){try{var p=e&&e.parameter||{};var action=String(p.action||'');if(action==='insert')return json_(insertTask_(p));if(action==='complete')return json_(completeTask_(p));if(action==='saveAccess')return json_(saveAccess_(p));if(action==='createUser')return json_(createUser_(p));if(action==='updateUser')return json_(updateUser_(p));if(action==='deleteUser')return json_(deleteUser_(p));if(action==='updateTask')return json_(updateTask_(p));if(action==='deleteTask')return json_(deleteTask_(p));if(action==='saveHoliday')return json_(saveHoliday_(p));if(action==='deleteHoliday')return json_(deleteHoliday_(p));if(action==='allAdd')return json_(allAdd_(p));if(action==='allUpdate')return json_(allUpdate_(p));if(action==='allDelete')return json_(allDelete_(p));if(action==='support')return json_(support_(p));throw new Error('Unsupported POST action: '+action);}catch(err){return json_({success:false,error:String(err.message||err)});}}
function shiftSunday_(s){var d=new Date(String(s||'')+'T12:00:00');if(isNaN(d.getTime()))return s;while(d.getDay()===0)d.setDate(d.getDate()+1);return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');}
function insertTask_(p){var taskType=String(p.taskType||'delegation').toLowerCase();var sheetName=taskType==='checklist'?'Checklist':'DELEGATION';var sheet=getSheet_(sheetName);var headers=getHeaders_(sheet);var id=String(p.taskId||nextId_(sheet,taskType));var safeDate=shiftSunday_(p.plannedDate||'');var map={'task id':id,'task description':p.taskTitle||'','task':p.taskTitle||'','department':p.department||'','firm':p.department||'','given by':p.givenBy||'','name':p.assignee||'','doer':p.assignee||'','assigned to':p.assignee||'','task start date':safeDate,'planned date':safeDate,'task start time':p.plannedTime||'','planned time':p.plannedTime||'','set time':p.plannedTime||'','freq':p.frequency||'One-Time','frequency':p.frequency||'One-Time','status':'Pending','enable reminders':String(p.reminders)==='true'?'Yes':'No','require attachment':String(p.requireAttachment)==='true'?'Yes':'No','remarks':p.remarks||'','timestamp':new Date()};appendMapped_(sheet,headers,map);return {success:true,sheet:sheetName,taskId:id};}
function completeTask_(p){var task=JSON.parse(p.task||'{}');var type=String(task.type||'Delegation');var sheet=getSheet_(type.toLowerCase()==='checklist'?'Checklist':'DELEGATION');var headers=getHeaders_(sheet);var id=String(task.id||'');if(!id)throw new Error('Task ID is required');if(String(p.responsibilityConfirmed).toLowerCase()!=='true')throw new Error('Responsibility confirmation is required.');var actual=p.actualDate?new Date(p.actualDate+'T12:00:00'):new Date();var actualKey=Utilities.formatDate(actual,Session.getScriptTimeZone(),'yyyy-MM-dd');var actualTime=String(p.actualTime||Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'HH:mm'));var plannedRaw=task.plannedISO||task.plannedRaw||'';var planned=plannedRaw?new Date(String(plannedRaw).slice(0,10)+'T12:00:00'):null;var freq=String(task.frequency||'One-Time').trim().toLowerCase();if(freq==='daily'&&planned&&!isNaN(planned.getTime())&&actualKey<Utilities.formatDate(planned,Session.getScriptTimeZone(),'yyyy-MM-dd'))throw new Error('Daily task cannot be completed before its planned date.');var idCol=findHeader_(headers,['task id','taskid']);if(idCol<0)throw new Error('Task ID column not found in '+sheet.getName());var values=sheet.getDataRange().getDisplayValues(),rowIndex=-1;for(var r=1;r<values.length;r++){if(String(values[r][idCol]).trim()===id){rowIndex=r+1;break;}}if(rowIndex<0)throw new Error('Task '+id+' not found in '+sheet.getName());var status=String(p.status||'Done');var statusCol=findHeader_(headers,['status','task status']);var currentStatus=statusCol>=0?String(values[rowIndex-1][statusCol]||'').toLowerCase():'';if(currentStatus==='done')throw new Error('Task '+id+' is already completed.');setByHeader_(sheet,headers,rowIndex,['status','task status'],status);setByHeader_(sheet,headers,rowIndex,['actual date','actual'],actualKey);setByHeader_(sheet,headers,rowIndex,['actual time'],actualTime);setByHeader_(sheet,headers,rowIndex,['completion type'],p.completionType||'ON_TIME');setByHeader_(sheet,headers,rowIndex,['responsibility confirmed'],'Yes');setByHeader_(sheet,headers,rowIndex,['confirmed at'],new Date());setByHeader_(sheet,headers,rowIndex,['remarks'],p.remarks||'');var hist=getOrCreateSheet_('TASK HISTORY',['Task ID','Task Description','Task Type','Doer','Given By','Department','Planned Date','Planned Time','Actual Date','Actual Time','Status','Completion Type','Remarks','Submitted Date']);appendMapped_(hist,getHeaders_(hist),{'task id':id,'task description':task.title||'','task type':type,'doer':task.assignee||'','given by':task.givenBy||'','department':task.department||'','planned date':plannedRaw,'planned time':task.plannedTime||'','actual date':actualKey,'actual time':actualTime,'status':status,'completion type':p.completionType||'ON_TIME','remarks':p.remarks||'','submitted date':new Date()});if(type.toLowerCase()!=='checklist'){var done=getOrCreateSheet_('DELEGATION DONE',['Timestamp','Task ID','Status','Completion Type','Next Target Date','Remarks','Attachment','Submitted Date','Actual Date','Actual Time','Responsibility Confirmed','Doer','Task','Given By','Department']);appendMapped_(done,getHeaders_(done),{'timestamp':new Date(),'task id':id,'status':status,'completion type':p.completionType||'ON_TIME','next target date':p.nextTargetDate||'','remarks':p.remarks||'','attachment':p.attachmentUrl||'','submitted date':new Date(),'actual date':actualKey,'actual time':actualTime,'responsibility confirmed':'Yes','doer':task.assignee||'','task':task.title||'','given by':task.givenBy||'','department':task.department||''});}return {success:true,taskId:id,status:status,completionType:p.completionType||'ON_TIME',actualDate:actualKey,actualTime:actualTime};}
function getOrCreateAccessSheet_(){return getOrCreateSheet_('ACCESS CONTROL',['Username','Page','Access']);}
function saveAccess_(p){var username=String(p.username||'').trim();if(!username)throw new Error('Username is required.');var permissions=JSON.parse(p.permissions||'{}'),s=getOrCreateAccessSheet_(),vals=s.getDataRange().getDisplayValues(),keep=[vals[0]||['Username','Page','Access']];for(var r=1;r<vals.length;r++)if(String(vals[r][0]).trim().toLowerCase()!==username.toLowerCase())keep.push(vals[r]);s.clearContents();s.getRange(1,1,keep.length,3).setValues(keep.map(function(row){return [row[0]||'',row[1]||'',row[2]||''];}));Object.keys(permissions).forEach(function(page){s.appendRow([username,page,String(permissions[page]||'Viewer')]);});return {success:true,username:username};}
function createUser_(p){var username=String(p.username||'').trim().toLowerCase(),password=String(p.password||'').trim(),department=String(p.department||'').trim(),role=String(p.role||'user').trim().toLowerCase();if(!username||!password)throw new Error('Username and password are required.');var s=getSheet_('master'),headers=getHeaders_(s),uCol=findHeader_(headers,['username','user name','login','userid']),passCol=findHeader_(headers,['password','pass']),roleCol=findHeader_(headers,['role','user role']),deptCol=findHeader_(headers,['department','dept']);var values=s.getDataRange().getDisplayValues();for(var r=1;r<values.length;r++)if(uCol>=0&&String(values[r][uCol]).trim().toLowerCase()===username)throw new Error('Username already exists.');var row=headers.map(function(h){var k=normalize_(h);if(k==='username'||k==='login'||k==='userid')return username;if(k==='password'||k==='pass')return password;if(k==='role'||k==='userrole')return role;if(k==='department'||k==='dept')return department;return '';});s.appendRow(row);return {success:true,username:username};}
function support_(p){var s=getOrCreateSheet_('HELP & SUPPORT',['Timestamp','Doer Name','Username','Department','Request Type','Priority','Subject','Details']);appendMapped_(s,getHeaders_(s),{'timestamp':new Date(),'doer name':p.doerName||p.username||'','username':p.username||'','department':p.department||'','request type':p.type||'Suggestion','priority':p.priority||'Normal','subject':p.subject||'','details':p.message||''});return {success:true};}

function updateUser_(p){
 var cur=String(p.username||'').trim().toLowerCase();
 var next=String(p.newUsername||p.username||'').trim().toLowerCase();
 if(!cur)throw new Error('Username is required.');
 if(cur==='admin'&&next!=='admin')throw new Error('The default admin account cannot be renamed.');
 var s=getSheet_('master'),headers=getHeaders_(s),values=s.getDataRange().getDisplayValues();
 var uCol=findHeader_(headers,['username','user name','login','userid']),pCol=findHeader_(headers,['password','pass']),rCol=findHeader_(headers,['role','user role']),dCol=findHeader_(headers,['department','dept']);
 if(uCol<0)throw new Error('Username column not found in master.');
 var rowIndex=-1;for(var r=1;r<values.length;r++){if(String(values[r][uCol]).trim().toLowerCase()===cur){rowIndex=r+1;break;}}
 if(rowIndex<0)throw new Error('User '+cur+' not found.');
 if(next!==cur){for(var r2=1;r2<values.length;r2++){if(String(values[r2][uCol]).trim().toLowerCase()===next)throw new Error('That username already exists.');}}
 s.getRange(rowIndex,uCol+1).setValue(next);
 if(pCol>=0&&p.password)s.getRange(rowIndex,pCol+1).setValue(String(p.password));
 if(rCol>=0&&p.role!==undefined&&p.role!=='')s.getRange(rowIndex,rCol+1).setValue(String(p.role));
 if(dCol>=0&&p.department!==undefined)s.getRange(rowIndex,dCol+1).setValue(String(p.department));
 if(next!==cur){
  var ac=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACCESS CONTROL');
  if(ac){var av=ac.getDataRange().getDisplayValues();for(var a=1;a<av.length;a++){if(String(av[a][0]).trim().toLowerCase()===cur)ac.getRange(a+1,1).setValue(next);}}
  ['Checklist','DELEGATION'].forEach(function(name){
   var ts=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);if(!ts)return;
   var th=getHeaders_(ts),nCol=findHeader_(th,['name','doer','assigned to']),gCol=findHeader_(th,['given by']),tv=ts.getDataRange().getDisplayValues();
   for(var t=1;t<tv.length;t++){
    if(nCol>=0&&String(tv[t][nCol]).trim().toLowerCase()===cur)ts.getRange(t+1,nCol+1).setValue(next);
    if(gCol>=0&&String(tv[t][gCol]).trim().toLowerCase()===cur)ts.getRange(t+1,gCol+1).setValue(next);
   }
  });
 }
 return {success:true,username:next};
}
function deleteUser_(p){
 var u=String(p.username||'').trim().toLowerCase();
 if(!u)throw new Error('Username is required.');
 if(u==='admin')throw new Error('The default admin account cannot be deleted.');
 var s=getSheet_('master'),headers=getHeaders_(s),values=s.getDataRange().getDisplayValues();
 var uCol=findHeader_(headers,['username','user name','login','userid']);
 if(uCol<0)throw new Error('Username column not found in master.');
 var rowIndex=-1;for(var r=1;r<values.length;r++){if(String(values[r][uCol]).trim().toLowerCase()===u){rowIndex=r+1;break;}}
 if(rowIndex<0)throw new Error('User '+u+' not found.');
 s.deleteRow(rowIndex);
 var ac=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACCESS CONTROL');
 if(ac){var av=ac.getDataRange().getDisplayValues(),keep=[av[0]||['Username','Page','Access']];for(var a=1;a<av.length;a++){if(String(av[a][0]).trim().toLowerCase()!==u)keep.push(av[a]);}ac.clearContents();ac.getRange(1,1,keep.length,keep[0].length).setValues(keep);}
 return {success:true};
}
function taskSheetFor_(p){var t=String(p.taskType||'checklist').toLowerCase();return getSheet_(t==='checklist'?'Checklist':'DELEGATION');}
function findTaskRow_(sheet,id){var headers=getHeaders_(sheet),idCol=findHeader_(headers,['task id','taskid']);if(idCol<0)throw new Error('Task ID column not found in '+sheet.getName());var values=sheet.getDataRange().getDisplayValues();for(var r=1;r<values.length;r++){if(String(values[r][idCol]).trim()===String(id))return {rowIndex:r+1,headers:headers};}return {rowIndex:-1,headers:headers};}
function updateTask_(p){
 var id=String(p.taskId||'');if(!id)throw new Error('Task ID is required.');
 var sheet=taskSheetFor_(p),loc=findTaskRow_(sheet,id);
 if(loc.rowIndex<0)throw new Error('Task '+id+' not found in '+sheet.getName());
 var h=loc.headers,row=loc.rowIndex;
 if(p.taskTitle!==undefined&&p.taskTitle!=='')setByHeader_(sheet,h,row,['task description','task','description'],p.taskTitle);
 if(p.assignee!==undefined&&p.assignee!=='')setByHeader_(sheet,h,row,['name','doer','assigned to'],p.assignee);
 if(p.department!==undefined)setByHeader_(sheet,h,row,['department','firm'],p.department);
 if(p.givenBy!==undefined&&p.givenBy!=='')setByHeader_(sheet,h,row,['given by'],p.givenBy);
 if(p.plannedDate!==undefined&&p.plannedDate!=='')setByHeader_(sheet,h,row,['task start date','planned date'],shiftSunday_(p.plannedDate));
 if(p.plannedTime!==undefined)setByHeader_(sheet,h,row,['task start time','planned time','set time'],p.plannedTime);
 if(p.frequency!==undefined&&p.frequency!=='')setByHeader_(sheet,h,row,['freq','frequency'],p.frequency);
 if(p.status!==undefined&&p.status!=='')setByHeader_(sheet,h,row,['status','task status'],p.status);
 if(p.remarks!==undefined)setByHeader_(sheet,h,row,['remarks'],p.remarks);
 
 return {success:true,taskId:id};
}
function deleteTask_(p){
 var id=String(p.taskId||'');if(!id)throw new Error('Task ID is required.');
 var sheet=taskSheetFor_(p),loc=findTaskRow_(sheet,id);
 if(loc.rowIndex<0)throw new Error('Task '+id+' not found in '+sheet.getName());
 sheet.deleteRow(loc.rowIndex);
 
 return {success:true};
}
function isoKey_(v){try{return Utilities.formatDate(new Date(String(v).slice(0,10)+'T12:00:00'),Session.getScriptTimeZone(),'yyyy-MM-dd');}catch(e){return String(v);}}
function saveHoliday_(p){
 var date=String(p.date||'').trim();if(!date)throw new Error('A holiday date is required.');
 var iso=isoKey_(date);
 var s=getOrCreateSheet_('HOLIDAYS',['Date','Occasion']);
 var headers=getHeaders_(s),dCol=findHeader_(headers,['date','holiday date','day']),vals=s.getDataRange().getDisplayValues();
 var rowIndex=-1;for(var r=1;r<vals.length;r++){var cell=dCol>=0?vals[r][dCol]:vals[r][0];if(isoKey_(cell)===iso){rowIndex=r+1;break;}}
 if(rowIndex>0){setByHeader_(s,headers,rowIndex,['date','holiday date','day'],iso);setByHeader_(s,headers,rowIndex,['occasion','reason','festival','name'],p.occasion||'Holiday');}
 else appendMapped_(s,headers,{'date':iso,'occasion':p.occasion||'Holiday','reason':p.occasion||'Holiday','festival':p.occasion||'Holiday','name':p.occasion||'Holiday'});
 return {success:true,date:iso};
}
function deleteHoliday_(p){
 var s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('HOLIDAYS');
 if(!s)return {success:true};
 var iso=isoKey_(String(p.date||'').trim());
 var headers=getHeaders_(s),dCol=findHeader_(headers,['date','holiday date','day']),vals=s.getDataRange().getDisplayValues();
 for(var r=vals.length-1;r>=1;r--){var cell=dCol>=0?vals[r][dCol]:vals[r][0];if(isoKey_(cell)===iso)s.deleteRow(r+1);}
 return {success:true};
}

function ensureDefaultAdmin_(){var ss=SpreadsheetApp.getActiveSpreadsheet(),s=ss.getSheetByName('master');if(!s)return;var headers=getHeaders_(s),uCol=findHeader_(headers,['username','user name','login','userid']),pCol=findHeader_(headers,['password','pass']),rCol=findHeader_(headers,['role','user role']),dCol=findHeader_(headers,['department','dept']);if(uCol<0||pCol<0||rCol<0)return;var vals=s.getDataRange().getDisplayValues(),found=false;for(var i=1;i<vals.length;i++)if(String(vals[i][uCol]).trim().toLowerCase()==='admin'){found=true;break;}if(!found){var row=headers.map(function(h){var k=normalize_(h);if(k==='username'||k==='username')return 'admin';if(k==='password')return 'admin123';if(k==='role')return 'admin';if(k==='department')return 'Administration';return '';});s.appendRow(row);}}
function getOrCreateSheet_(name,headers){var ss=SpreadsheetApp.getActiveSpreadsheet(),s=ss.getSheetByName(name);if(!s){s=ss.insertSheet(name);s.appendRow(headers);}else if(s.getLastRow()===0&&headers)s.appendRow(headers);return s;}
function readSheet_(name){if(String(name).toLowerCase()==='master')ensureDefaultAdmin_();if(String(name).toUpperCase()==='HOLIDAYS')getOrCreateSheet_('HOLIDAYS',['Date','Occasion']);if(String(name).toLowerCase()===ALL_TASKS_SHEET.toLowerCase())allSheet_();var s=getSheet_(name),values=s.getDataRange().getDisplayValues();return {success:true,headers:values.length?values[0]:[],values:values.length?values.slice(1):[]};}

/* =====================================================================
 * ALL TASKS LIST  —  a standalone, fully manual tab.
 * Columns: Name | Task Description | Freq | Remarks   (no Task ID)
 * Rows are typed by hand (in the sheet or on the frontend page) and
 * are addressed by their sheet row number. Nothing here is linked to
 * Checklist / DELEGATION or to task completion.
 * The frontend passes expectName / expectTitle so a stale edit after a
 * sheet change is refused instead of hitting the wrong row.
 * ===================================================================== */
var ALL_TASKS_SHEET='AllTasksList';
var ALL_HEADERS=['Name','Task Description','Freq','Remarks'];
function allSheet_(){return getOrCreateSheet_(ALL_TASKS_SHEET,ALL_HEADERS);}
function allCheckRow_(s,h,row,p){
 var r=Number(row);
 if(!(r>=2&&r<=s.getLastRow()))throw new Error('AllTasksList row not found. Refresh and try again.');
 if(p.expectName!==undefined&&String(p.expectName)!==''){
  var nCol=findHeader_(h,['name','doer','assigned to']);
  if(nCol>=0&&String(s.getRange(r,nCol+1).getDisplayValue()).trim()!==String(p.expectName).trim())throw new Error('That row changed in the sheet. Refresh and try again.');
 }
 if(p.expectTitle!==undefined&&String(p.expectTitle)!==''){
  var tCol=findHeader_(h,['task description','task','description']);
  if(tCol>=0&&String(s.getRange(r,tCol+1).getDisplayValue()).trim()!==String(p.expectTitle).trim())throw new Error('That row changed in the sheet. Refresh and try again.');
 }
 return r;
}
function allAdd_(p){
 var s=allSheet_();var h=getHeaders_(s);
 appendMapped_(s,h,{'name':p.name||'','task description':p.taskDescription||p.taskTitle||'','freq':p.freq||p.frequency||'One-Time','remarks':p.remarks||''});
 return {success:true};
}
function allUpdate_(p){
 var s=allSheet_();var h=getHeaders_(s);var row=allCheckRow_(s,h,p.row,p);
 if(p.name!==undefined)setByHeader_(s,h,row,['name','doer','assigned to'],p.name);
 if(p.taskDescription!==undefined||p.taskTitle!==undefined)setByHeader_(s,h,row,['task description','task','description'],p.taskDescription!==undefined?p.taskDescription:p.taskTitle);
 if(p.freq!==undefined||p.frequency!==undefined)setByHeader_(s,h,row,['freq','frequency'],p.freq!==undefined?p.freq:p.frequency);
 if(p.remarks!==undefined)setByHeader_(s,h,row,['remarks'],p.remarks);
 return {success:true};
}
function allDelete_(p){
 var s=allSheet_();var h=getHeaders_(s);var row=allCheckRow_(s,h,p.row,p);
 s.deleteRow(row);
 return {success:true};
}
function getSheet_(name){var s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);if(!s)throw new Error('Sheet not found: '+name);return s;}
function getHeaders_(s){var n=Math.max(1,s.getLastColumn());return s.getRange(1,1,1,n).getDisplayValues()[0];}
function appendMapped_(sheet,headers,map){var norm={};Object.keys(map).forEach(function(kk){norm[normalize_(kk)]=map[kk];});var row=headers.map(function(h){var k=normalize_(h);return norm[k]!==undefined?norm[k]:'';});sheet.appendRow(row);}
function setByHeader_(sheet,headers,row,aliases,value){var idx=findHeader_(headers,aliases);if(idx>=0)sheet.getRange(row,idx+1).setValue(value);}
function findHeader_(headers,aliases){for(var i=0;i<headers.length;i++){var k=normalize_(headers[i]);for(var j=0;j<aliases.length;j++)if(k===normalize_(aliases[j]))return i;}return -1;}
function nextId_(sheet,type){var headers=getHeaders_(sheet),idx=findHeader_(headers,['task id','taskid']);if(idx<0)return (type==='checklist'?'C-':'D-')+Date.now();var last=sheet.getLastRow();var vals=last>1?sheet.getRange(2,idx+1,last-1,1).getDisplayValues().flat():[];var max=1000;vals.forEach(function(v){var m=String(v).match(/^[CD]-(\d+)$/i);if(m)max=Math.max(max,Number(m[1]));});return (type==='checklist'?'C-':'D-')+(max+1);}
function normalize_(v){return String(v==null?'':v).trim().toLowerCase().replace(/[^a-z0-9]/g,'');}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}

/* =====================================================================
 * ONE-TIME SETUP
 * Run setupSheets() once from the Apps Script editor (pick it in the
 * function dropdown, click Run). It creates every tab CREST needs with
 * the correct headers and a default admin login. Safe to re-run: it
 * never overwrites existing rows or headers.
 * ===================================================================== */
function setupSheets(){
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss)throw new Error('Open this script from inside the spreadsheet: Extensions > Apps Script.');
  var TASK_HEADERS=['Task ID','Task Description','Department','Given By','Name','Task Start Date','Task Start Time','Freq','Status','Require Attachment','Enable Reminders','Remarks','Actual Date','Actual Time','Completion Type','Responsibility Confirmed','Confirmed At'];
  var defs={
    'master':['Department','Name','Username','Password','Role'],
    'Checklist':TASK_HEADERS,
    'DELEGATION':TASK_HEADERS,
    'ACCESS CONTROL':['Username','Page','Access'],
    'AllTasksList':ALL_HEADERS,
    'HOLIDAYS':['Date','Occasion'],
    'Working Day Calendar':['Working Date'],
    'UNIQUE':['Value'],
    'TASK HISTORY':['Task ID','Task Description','Task Type','Doer','Given By','Department','Planned Date','Planned Time','Actual Date','Actual Time','Status','Completion Type','Remarks','Submitted Date'],
    'DELEGATION DONE':['Timestamp','Task ID','Status','Completion Type','Next Target Date','Remarks','Attachment','Submitted Date','Actual Date','Actual Time','Responsibility Confirmed','Doer','Task','Given By','Department'],
    'HELP & SUPPORT':['Timestamp','Doer Name','Username','Department','Request Type','Priority','Subject','Details']
  };
  var made=[];
  Object.keys(defs).forEach(function(name){
    var s=ss.getSheetByName(name);
    if(!s){s=ss.insertSheet(name);made.push(name);}
    if(s.getLastRow()===0){
      var h=defs[name];
      s.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold');
      s.setFrozenRows(1);
    }
  });
  // Default admin login in `master`
  var m=ss.getSheetByName('master'),mv=m.getDataRange().getDisplayValues(),hasAdmin=false;
  for(var i=1;i<mv.length;i++)if(String(mv[i][2]).trim().toLowerCase()==='admin')hasAdmin=true;
  if(!hasAdmin)m.appendRow(['Administration','Administrator','admin','admin123','admin']);
  // Admin rows in `ACCESS CONTROL` (admins bypass this at login; kept so the matrix shows ticks)
  var ac=ss.getSheetByName('ACCESS CONTROL'),acv=ac.getDataRange().getDisplayValues(),acHasAdmin=false;
  for(var j=1;j<acv.length;j++)if(String(acv[j][0]).trim().toLowerCase()==='admin')acHasAdmin=true;
  if(!acHasAdmin){
    ['Dashboard','Checklist','Delegation','Calendar','Holidays','Reports & Score','Assign Task','Settings','History','Help & Support','Live Score','Admin Access','All TasksList']
      .forEach(function(p){ac.appendRow(['admin',p,'Full Access']);});
    ac.appendRow(['admin','Task Visibility','All Tasks']);
    ac.appendRow(['admin','Calendar Past','Allowed']);
    ac.appendRow(['admin','Calendar Future','Allowed']);
  }
  
  // Remove the empty default "Sheet1" if it's still there
  var blank=ss.getSheetByName('Sheet1');
  if(blank&&blank.getLastRow()===0&&ss.getSheets().length>1)ss.deleteSheet(blank);
  var msg='Setup complete. New tabs: '+(made.length?made.join(', '):'none (all already existed)')+'.';
  try{ss.toast(msg,'CREST',6);}catch(e){}
  return msg;
}
