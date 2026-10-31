import React from "react";
import "../welcome.css";

export default function Welcome({ onSignIn }) {
  return (
    <main className="ac-welcome">
      <div className="ac-welcome-background" aria-hidden="true" />

      <header className="ac-welcome-header">
        <div className="ac-welcome-brand">
          <span aria-hidden="true" />
          <div>
            <b>AutoCare</b>
            <small>VEHICLE SERVICE MANAGEMENT</small>
          </div>
        </div>
      </header>

      <section className="ac-welcome-content">
        <div className="ac-welcome-copy">
          <span className="ac-welcome-eyebrow">DRIVE BETTER&nbsp; • &nbsp;STAY SAFER&nbsp; • &nbsp;WITH AUTOCARE</span>
          <h1>Your Vehicle Deserves<br />the <em>Best Care</em></h1>
          <p>Book services, track history, and keep your vehicle in top condition — all in one place.</p>
          <button type="button" className="ac-welcome-cta" onClick={onSignIn}>
            Sign In to Continue <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <footer className="ac-welcome-features" aria-label="AutoCare features">
        <div className="ac-welcome-feature">
          <span aria-hidden="true">◷</span>
          <div><b>Easy Appointments</b><small>Book services in minutes</small></div>
        </div>
        <div className="ac-welcome-feature">
          <span aria-hidden="true">⚙</span>
          <div><b>Expert Technicians</b><small>Quality care for your vehicle</small></div>
        </div>
        <div className="ac-welcome-feature">
          <span aria-hidden="true">▤</span>
          <div><b>Service History</b><small>Keep records in one place</small></div>
        </div>
        <div className="ac-welcome-feature">
          <span aria-hidden="true">♡</span>
          <div><b>Better Vehicle Health</b><small>Stay on top of maintenance</small></div>
        </div>
      </footer>
    </main>
  );
}
