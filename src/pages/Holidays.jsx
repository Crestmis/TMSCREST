import {useEffect,useMemo,useState} from 'react'
import {PartyPopper,Plus,Trash2,RefreshCw,CheckCircle2,Lock} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {getHolidays,saveHoliday,deleteHoliday} from '../services/calendar'
import {displayDate,localISO} from '../services/sheets'

export default function Holidays({session}){
 const canEdit=session?.isAdmin||['Editor','Full Access'].includes(session?.access?.['Holidays'])
 const [rows,setRows]=useState([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [ok,setOk]=useState('')
 const [busy,setBusy]=useState(false)
 const [form,setForm]=useState({date:'',occasion:''})

 const load=async()=>{
  setLoading(true);setError('')
  try{
   const h=await getHolidays()
   setRows([...h].sort((a,b)=>a.iso.localeCompare(b.iso)))
  }catch(e){setError(e.message||'Unable to load holidays.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[session.username])

 const today=localISO()
 const {upcoming,past}=useMemo(()=>({
  upcoming:rows.filter(r=>r.iso>=today),
  past:rows.filter(r=>r.iso<today)
 }),[rows,today])

 const add=async e=>{
  e.preventDefault();setError('');setOk('')
  if(!form.date){return}
  setBusy(true)
  try{
   await saveHoliday(form.date,form.occasion||'Holiday')
   setOk(`Saved ${form.occasion||'holiday'} on ${displayDate(form.date)}.`)
   setForm({date:'',occasion:''})
   await load()
  }catch(err){setError(err.message||'Unable to save holiday.')}
  finally{setBusy(false)}
 }
 const remove=async iso=>{
  setError('');setOk('');setBusy(true)
  try{await deleteHoliday(iso);await load()}
  catch(err){setError(err.message||'Unable to delete holiday.')}
  finally{setBusy(false)}
 }

 const weekday=iso=>new Date(iso+'T12:00:00').toLocaleDateString('en-IN',{weekday:'long'})

 const Row=({r,isPast})=>(
  <div className={`holiday-row ${isPast?'past':''}`}>
   <PartyPopper size={14}/>
   <b>{r.occasion}</b>
   <span className="hp-date">{displayDate(r.iso)} · {weekday(r.iso)}</span>
   {canEdit&&<button className="secondary-btn icon-only danger" title="Remove holiday" disabled={busy} onClick={()=>remove(r.iso)}><Trash2 size={12}/></button>}
  </div>
 )

 return <>
  <PageHeader title="Holidays" subtitle="Festival and public holidays. The Calendar skips these dates and moves each task to the next working day (Sundays too)."
   action={<button className="secondary-btn" onClick={load}><RefreshCw size={15}/> Refresh</button>}/>

  {error&&<div className="error-box page-error">{error}</div>}
  {ok&&<div className="success-box page-error"><CheckCircle2 size={16}/> {ok}</div>}

  <div className="admin-banner">
   <PartyPopper size={20}/>
   <div><b>Holiday calendar</b><span>{rows.length} holiday(s) defined{canEdit?' · linked to the HOLIDAYS sheet':' · view only for your account'}.</span></div>
  </div>

  <div className="panel holiday-page-panel">
   {canEdit?(
    <form className="holiday-form" onSubmit={add}>
     <label className="filter-field"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required/></label>
     <input className="holiday-occasion" value={form.occasion} onChange={e=>setForm(f=>({...f,occasion:e.target.value}))} placeholder="Occasion (e.g. Diwali, Holi, Independence Day)"/>
     <button className="primary-btn" disabled={busy||!form.date}><Plus size={14}/> {busy?'Saving…':'Add Holiday'}</button>
    </form>
   ):(
    <div className="notice-box"><Lock size={13}/> Only administrators or Calendar editors can add or remove holidays. Ask an admin to grant you access from <b>Admin Access → Holidays</b>.</div>
   )}

   {loading?<div className="loading-box">Loading holidays…</div>:<>
    <div className="hp-section-title">Upcoming ({upcoming.length})</div>
    <div className="holiday-list">
     {upcoming.length?upcoming.map(r=><Row key={r.iso} r={r} isPast={false}/>):<div className="holiday-empty">No upcoming holidays.</div>}
    </div>
    {past.length>0&&<>
     <div className="hp-section-title">Past ({past.length})</div>
     <div className="holiday-list">
      {past.map(r=><Row key={r.iso} r={r} isPast/>)}
     </div>
    </>}
   </>}
  </div>
 </>
}
