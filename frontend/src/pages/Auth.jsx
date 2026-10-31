import React,{useState} from "react";
import { api } from "../api";

const emptyForm = { name:"", phone:"", email:"", password:"" };

export default function Auth({onAuth,onBack}){
  const [mode,setMode]=useState("login");
  const [form,setForm]=useState({...emptyForm});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  const switchMode=()=>{
    const nextMode=mode==="login"?"register":"login";
    setMode(nextMode);
    setForm({...emptyForm});
    setError("");
  };

  const submit=async e=>{
    e.preventDefault();
    setError("");
    setBusy(true);
    try{
      const data=await api(`/auth/${mode}`,{
        method:"POST",
        body:JSON.stringify(form)
      });
      sessionStorage.setItem("token",data.token);
      onAuth(data.user);
    }catch(e){setError(e.message)}
    finally{setBusy(false)}
  };

  return (
    <div className="ac-auth ac-auth-fullscreen">
      <div className="ac-auth-background" aria-hidden="true"></div>

      <header className="ac-auth-header">
        <div className="ac-auth-brand">
          <span aria-hidden="true"></span>
          <div>
            <b>AutoCare</b>
            <small>VEHICLE SERVICE MANAGEMENT</small>
          </div>
        </div>
      </header>

      <main className="ac-auth-main">
        <section className="ac-auth-form-side">
          <div className="ac-login-card">
            <button type="button" className="ac-auth-back" onClick={onBack} aria-label="Go back to the welcome page">
              <span aria-hidden="true">←</span> Back
            </button>

            <div className="ac-login-card-heading">
              <h2>{mode==="login"?"Welcome Back":"Create Your Account"}</h2>
              <p>{mode==="login"?"Sign in to your AutoCare account.":"Register to book services and manage your own vehicles."}</p>
            </div>

            {error&&<div className="ac-error"><b>!</b>{error}</div>}

            <form onSubmit={submit} autoComplete="off">
              {mode==="register"&&(
                <>
                  <label>Full name
                    <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoComplete="name" placeholder="Enter your full name" required/>
                  </label>
                  <label>Phone number
                    <input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} autoComplete="tel" maxLength={25} placeholder="Enter your phone number" required/>
                  </label>
                </>
              )}
              <label>Email address
                <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="off" placeholder="Enter your email address" required/>
              </label>
              <label>Password
                <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} autoComplete="off" minLength={6} placeholder="Enter your password" required/>
              </label>

              {mode==="login"&&<div className="ac-login-row">
                <a href="#" onClick={e=>e.preventDefault()}>Forgot password?</a>
              </div>}

              <button className="ac-primary ac-login-button" disabled={busy}>
                {busy?"Please wait...":mode==="login"?"Sign In":"Create Account"} <span aria-hidden="true">→</span>
              </button>
            </form>

            <div className="ac-switch">
              {mode==="login"?"New to AutoCare? ":"Already registered? "}
              <a href="#" onClick={e=>{e.preventDefault();switchMode()}}>
                {mode==="login"?"Create an account":"Sign in"}
              </a>
            </div>

          </div>
        </section>
      </main>

      <footer className="ac-auth-benefits" aria-label="AutoCare features">
        <div className="ac-auth-benefit">
          <span className="ac-auth-benefit-icon" aria-hidden="true">◷</span>
          <div><b>Easy Appointments</b><small>Book services in minutes</small></div>
        </div>
        <div className="ac-auth-benefit">
          <span className="ac-auth-benefit-icon" aria-hidden="true">⚙</span>
          <div><b>Expert Technicians</b><small>Quality care for your vehicle</small></div>
        </div>
        <div className="ac-auth-benefit">
          <span className="ac-auth-benefit-icon" aria-hidden="true">▤</span>
          <div><b>Service History</b><small>Keep records in one place</small></div>
        </div>
        <div className="ac-auth-benefit">
          <span className="ac-auth-benefit-icon" aria-hidden="true">♡</span>
          <div><b>Better Vehicle Health</b><small>Stay on top of maintenance</small></div>
        </div>
      </footer>
    </div>
  );
}
