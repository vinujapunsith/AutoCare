import React from "react";

export function PageHead({ title, button, onClick }) {
  return (
    <div className="ac-page-head">
      <div>
        <span className="ac-kicker">WORKSPACE</span>
        <h1>{title}</h1>
      </div>
      {button && (
        <button className="ac-primary" onClick={onClick}>
          <span>＋</span>{button}
        </button>
      )}
    </div>
  );
}

export function Status({ value }) {
  const cls=String(value||"").replaceAll(" ","-");
  return <span className={`ac-status ${cls}`}><i></i>{value}</span>;
}

export function Modal({ open, title, onClose, children }) {
  if(!open) return null;
  return (
    <div className="ac-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <div className="ac-modal">
        <div className="ac-modal-head">
          <div>
            <span className="ac-kicker">AUTOCARE</span>
            <h2>{title}</h2>
          </div>
          <button className="ac-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ac-modal-body">{children}</div>
      </div>
    </div>
  );
}

export const money = n => `LKR ${Number(n||0).toLocaleString("en-LK",{minimumFractionDigits:2})}`;

export function Empty({ text="No records found" }) {
  return (
    <div className="ac-empty">
      <div>○</div>
      <b>{text}</b>
      <span>Records will appear here when available.</span>
    </div>
  );
}
