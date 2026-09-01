import {useState} from 'react'
import {Send,CheckCircle2,AlertCircle,ChevronRight,User,Tag,AlignLeft,Flag,LifeBuoy} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {submitSupport} from '../services/tasks'

const TYPES=['Suggestion','Problem / Bug','Question','Other']
const PRIORITIES=[
 {label:'Normal',color:'#6b7280',desc:'General feedback or improvement idea'},
 {label:'High',color:'#f59e0b',desc:'Needs attention soon'},
 {label:'Urgent',color:'#ef4444',desc:'Critical issue affecting work'},
]

export default function HelpSupport({session}){
 const [form,setForm]=useState({type:'Suggestion',subject:'',message:'',priority:'Normal'})
 const [busy,setBusy]=useState(false)
 const [done,setDone]=useState(false)
 const [error,setError]=useState('')
 const update=(k,v)=>setForm(f=>({...f,[k]:v}))

 const submit=async e=>{
  e.preventDefault();setBusy(true);setError('')
  try{
   await submitSupport({...form,doerName:session.username,username:session.username,department:session.department,submittedAt:new Date().toISOString()})
   setDone(true)
   setForm({type:'Suggestion',subject:'',message:'',priority:'Normal'})
  }catch(err){setError(err.message||'Unable to submit.')}
  finally{setBusy(false)}
 }

 if(done) return <>
  <PageHeader title="Help & Support" subtitle="Submit a suggestion, problem or support request."/>
  <div className="gform-wrap">
   <div className="gform-success">
    <div className="gform-success-icon"><CheckCircle2 size={48}/></div>
    <h2>Your response has been recorded</h2>
    <p>Thank you, <strong>{session.username}</strong>! We've received your submission and will look into it shortly.</p>
    <button className="primary-btn gform-again-btn" onClick={()=>setDone(false)}>Submit another response</button>
   </div>
  </div>
 </>

 return <>
  <PageHeader title="Help & Support" subtitle="Submit a suggestion, problem or support request."/>
  <div className="gform-wrap">

   {/* Form Header Card */}
   <div className="gform-header-card">
    <div className="gform-header-accent"/>
    <div className="gform-header-body">
     <div className="gform-header-icon"><LifeBuoy size={28}/></div>
     <div>
      <h1 className="gform-title">Help & Support Request</h1>
      <p className="gform-subtitle">Use this form to report a problem, share a suggestion, or ask a question. Your Doer Name is recorded automatically.</p>
     </div>
    </div>
    <div className="gform-required-note"><span className="gform-required-star">*</span> Indicates required question</div>
   </div>

   {error&&<div className="gform-error-banner"><AlertCircle size={16}/> {error}</div>}

   <form onSubmit={submit} className="gform-body">

    {/* Section 1: Your Identity */}
    <div className="gform-section">
     <div className="gform-section-label"><User size={15}/> Your Information</div>
     <div className="gform-field-row">
      <div className="gform-field gform-field-readonly">
       <label className="gform-label">Doer Name</label>
       <div className="gform-readonly-value">{session.username}</div>
       <span className="gform-readonly-badge">Auto-filled</span>
      </div>
      <div className="gform-field gform-field-readonly">
       <label className="gform-label">Department</label>
       <div className="gform-readonly-value">{session.department||'—'}</div>
       <span className="gform-readonly-badge">Auto-filled</span>
      </div>
     </div>
    </div>

    {/* Section 2: Request Type */}
    <div className="gform-section">
     <div className="gform-section-label"><Tag size={15}/> Request Details</div>
     <div className="gform-field">
      <label className="gform-label">Request Type <span className="gform-required-star">*</span></label>
      <p className="gform-field-hint">What kind of feedback are you submitting?</p>
      <div className="gform-radio-group">
       {TYPES.map(t=>(
        <label key={t} className={`gform-radio-option ${form.type===t?'selected':''}`}>
         <input type="radio" name="type" value={t} checked={form.type===t} onChange={()=>update('type',t)}/>
         <span className="gform-radio-dot"/>
         <span>{t}</span>
        </label>
       ))}
      </div>
     </div>
    </div>

    {/* Section 3: Priority */}
    <div className="gform-section">
     <div className="gform-section-label"><Flag size={15}/> Priority Level</div>
     <div className="gform-field">
      <label className="gform-label">Priority <span className="gform-required-star">*</span></label>
      <p className="gform-field-hint">How urgent is this request?</p>
      <div className="gform-priority-group">
       {PRIORITIES.map(p=>(
        <label key={p.label} className={`gform-priority-option ${form.priority===p.label?'selected':''}`} style={form.priority===p.label?{'--accent':p.color}:{}}>
         <input type="radio" name="priority" value={p.label} checked={form.priority===p.label} onChange={()=>update('priority',p.label)}/>
         <span className="gform-priority-dot" style={{background:p.color}}/>
         <span className="gform-priority-content">
          <b style={{color:form.priority===p.label?p.color:undefined}}>{p.label}</b>
          <small>{p.desc}</small>
         </span>
         {form.priority===p.label&&<ChevronRight size={16} style={{color:p.color,marginLeft:'auto'}}/>}
        </label>
       ))}
      </div>
     </div>
    </div>

    {/* Section 4: Subject & Details */}
    <div className="gform-section">
     <div className="gform-section-label"><AlignLeft size={15}/> Your Message</div>
     <div className="gform-field">
      <label className="gform-label">Subject <span className="gform-required-star">*</span></label>
      <p className="gform-field-hint">A brief summary of your request.</p>
      <input
       className="gform-input"
       value={form.subject}
       onChange={e=>update('subject',e.target.value)}
       placeholder="e.g. Task submission not saving correctly"
       required
      />
     </div>
     <div className="gform-field">
      <label className="gform-label">Details <span className="gform-required-star">*</span></label>
      <p className="gform-field-hint">Please describe your suggestion or problem in detail. Include steps to reproduce if it's a bug.</p>
      <textarea
       className="gform-textarea"
       value={form.message}
       onChange={e=>update('message',e.target.value)}
       placeholder="Describe the issue or suggestion in detail..."
       required
       rows={6}
      />
      <div className="gform-char-count">{form.message.length} characters</div>
     </div>
    </div>

    {/* Submit */}
    <div className="gform-submit-row">
     <button className="gform-submit-btn" disabled={busy}>
      <Send size={16}/>
      {busy?'Submitting…':'Submit'}
     </button>
     <p className="gform-submit-note">Never submit passwords or sensitive information through this form.</p>
    </div>

   </form>
  </div>
 </>
}
