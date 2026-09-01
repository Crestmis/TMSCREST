import {useEffect,useState} from 'react'
import PageHeader from '../components/PageHeader'
import {Settings as SettingsIcon,User, Bell, Shield, SlidersHorizontal, Save, CheckCircle2} from 'lucide-react'

const KEY='crest_settings_v1'
const defaults={emailNotifications:true,reminders:true,denseMode:false,confirmBeforeSubmit:true,defaultTaskType:'delegation'}
function getSettings(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return defaults}}
export function Settings({session}){
 const [settings,setSettings]=useState(getSettings()),[section,setSection]=useState('profile'),[saved,setSaved]=useState(false)
 const save=()=>{localStorage.setItem(KEY,JSON.stringify(settings));setSaved(true);setTimeout(()=>setSaved(false),1800)}
 const update=(k,v)=>setSettings(s=>({...s,[k]:v}))
 return <><PageHeader title="Settings" subtitle="Manage your profile, notifications and task behavior." action={<button className="primary-btn" onClick={save}><Save size={15}/> Save Changes</button>}/>
  {saved&&<div className="success-box page-error"><CheckCircle2 size={16}/> Settings saved successfully.</div>}
  <div className="settings-layout"><aside className="settings-menu"><button className={section==='profile'?'active':''} onClick={()=>setSection('profile')}><User size={16}/> Profile</button><button className={section==='notifications'?'active':''} onClick={()=>setSection('notifications')}><Bell size={16}/> Notifications</button><button className={section==='task'?'active':''} onClick={()=>setSection('task')}><SlidersHorizontal size={16}/> Task Options</button><button className={section==='security'?'active':''} onClick={()=>setSection('security')}><Shield size={16}/> Security</button></aside>
  <section className="panel settings-content">
   {section==='profile'&&<><h2>Profile</h2><p>Current account information.</p><div className="settings-form"><label>Username<input value={session.username} readOnly/></label><label>Role<input value={session.role} readOnly/></label><label>Department<input value={session.department||'All'} readOnly/></label></div></>}
   {section==='notifications'&&<><h2>Notifications</h2><p>Choose how task updates are handled on this device.</p><SettingToggle label="Email notifications" text="Enable task notification preferences." checked={settings.emailNotifications} onChange={v=>update('emailNotifications',v)}/><SettingToggle label="Task reminders" text="Keep reminders enabled for planned tasks." checked={settings.reminders} onChange={v=>update('reminders',v)}/></>}
   {section==='task'&&<><h2>Task Options</h2><p>Simple defaults for task completion and creation.</p><SettingToggle label="Confirm before submit" text="Ask for confirmation before submitting selected tasks." checked={settings.confirmBeforeSubmit} onChange={v=>update('confirmBeforeSubmit',v)}/><SettingToggle label="Compact task list" text="Reduce row spacing on desktop and tablet." checked={settings.denseMode} onChange={v=>update('denseMode',v)}/><label className="settings-field">Default task type<select value={settings.defaultTaskType} onChange={e=>update('defaultTaskType',e.target.value)}><option value="delegation">Delegation</option><option value="checklist">Checklist</option></select></label></>}
   {section==='security'&&<><h2>Security</h2><p>Session information for the current sign-in.</p><div className="security-box"><Shield size={18}/><div><b>Signed in as {session.username}</b><span>Role: {session.role} · Department: {session.department||'All'}</span></div></div><div className="notice-box">Password and authorization are validated by the configured backend. This page does not expose credentials.</div></>}
  </section></div></>
}
function SettingToggle({label,text,checked,onChange}){return <label className="setting-toggle"><span><b>{label}</b><small>{text}</small></span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><i/></label>}
