'use client';
import {useEffect,useRef,useState} from 'react';
import {storePath,type StoreRegion} from '@/lib/stores';

export function SignupVerification({email,onCancel,region='us'}:{email:string;onCancel:()=>void;region?:StoreRegion}){
  const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[remaining,setRemaining]=useState(60);
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{input.current?.focus();},[]);
  useEffect(()=>{if(remaining<=0)return;const timer=setTimeout(()=>setRemaining(value=>value-1),1000);return()=>clearTimeout(timer);},[remaining]);
  async function request(action:'verify-signup'|'resend-signup'){
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/auth/'+action+'?region='+region,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,...(action==='verify-signup'?{token:code}:{})})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Please try again later.');
      if(result.redirect){try{sessionStorage.removeItem('eppix-signup-email');}catch{}location.assign(result.redirect);return;}
      setRemaining(60);setCode('');setMessage(result.message);input.current?.focus();
    }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }
  return <section className="clone-signup-verification" aria-label="Verify your email">
    <h2>Verify your email</h2>
    <p>Enter the verification code sent to <strong>{email}</strong> to finish creating your account.</p>
    <form onSubmit={event=>{event.preventDefault();void request('verify-signup');}}>
      <label htmlFor="signup-code">Email verification code</label>
      <input ref={input} id="signup-code" name="token" className="clone-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,''))} aria-describedby="signup-code-help"/>
      <p id="signup-code-help">Check your inbox and spam folder. Codes expire and can only be used once.</p>
      <button className="clone-primary" type="submit" disabled={busy||code.length<6}>{busy?'Please wait…':'Verify and create account'}</button>
    </form>
    {message&&<p role="status" className="clone-form-feedback">{message}</p>}
    <button className="clone-secondary" type="button" disabled={busy||remaining>0} onClick={()=>void request('resend-signup')}>{remaining>0?`Resend code in ${remaining}s`:'Resend code'}</button>
    <button className="clone-secondary" type="button" disabled={busy} onClick={onCancel}>Use a different email</button>
    <p>Already have an account? <a href={storePath('/login',region)}>Sign in</a>.</p>
  </section>;
}
