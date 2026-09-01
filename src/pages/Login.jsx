import {useEffect,useState} from 'react'
import {LogIn,ShieldCheck} from 'lucide-react'
import {login,getSession} from '../services/auth'

export default function Login({onLogin}){
  const [username,setUsername]=useState('')
  const [password,setPassword]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  useEffect(()=>{ setLoading(false); if(getSession()) onLogin() },[])
  const submit=async e=>{
    e.preventDefault(); setError(''); setBusy(true)
    try{const s=await login(username,password); sessionStorage.setItem('crest_session',JSON.stringify(s)); onLogin()}
    catch(err){setError(err.message||'Unable to sign in.')}
    finally{setBusy(false)}
  }
  return <div className="login-screen"><div className="login-card">
    <div className="login-brand"><div className="brand-mark large">C</div><div><b>CREST</b><small>Task Management</small></div></div>
    <div className="login-heading"><h1>Welcome back</h1><p>Sign in to manage your tasks and delegations.</p></div>
    <form onSubmit={submit} className="login-form">
      <label>Username<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter username" required/></label>
      <label>Password<input autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required/></label>
      {error&&<div className="error-box">{error}</div>}
      <button className="primary-btn wide" disabled={busy||loading}><LogIn size={16}/>{busy?'Signing in…':'Sign in'}</button>
    </form>
    <div className="login-note"><ShieldCheck size={15}/> Account access is controlled by the master sheet.</div>
  </div></div>
}
