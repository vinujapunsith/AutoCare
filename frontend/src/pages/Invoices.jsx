import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Modal, PageHead, money } from "../components/Common";
import TableControls from "../components/TableControls";

export default function Invoices() {
  const [rows, setRows] = useState([]);
  const [requests, setRequests] = useState([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-newest");
  const [error, setError] = useState("");
  const load = () => api("/invoices").then(setRows);
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const openForm = async () => {
    setError("");
    try { setRequests(await api("/service-requests")); setOpen(true); }
    catch (e) { setError(e.message); }
  };

  const save = async e => {
    e.preventDefault(); setError("");
    const f = Object.fromEntries(new FormData(e.target));
    try {
      await api("/invoices", { method: "POST", body: JSON.stringify({ ...f, total: Number(f.total) }) });
      setOpen(false); await load();
    } catch (e) { setError(e.message); }
  };

  const setStatus = async (id, status) => {
    setError("");
    try { await api(`/invoices/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }); await load(); }
    catch (e) { setError(e.message); }
  };

  const remove = async invoice => {
    if (!confirm(`Delete invoice ${invoice.code}? This cannot be undone.`)) return;
    setError("");
    try { await api(`/invoices/${invoice._id}`, { method: "DELETE" }); await load(); }
    catch (e) { setError(e.message); }
  };

  const filtered = rows.filter(x => {
    const matchesSearch = [x.code, x.date, x.status, x.serviceRequest?.code, x.serviceRequest?.vehicle?.registration, x.serviceRequest?.vehicle?.customer?.name, x.total]
      .some(value => String(value ?? "").toLowerCase().includes(q.toLowerCase()));
    return matchesSearch && (statusFilter === "all" || x.status === statusFilter);
  }).sort((a, b) => {
    if (sortBy === "date-oldest") return String(a.date || "").localeCompare(String(b.date || ""));
    if (sortBy === "total-high") return Number(b.total || 0) - Number(a.total || 0);
    if (sortBy === "total-low") return Number(a.total || 0) - Number(b.total || 0);
    return String(b.date || "").localeCompare(String(a.date || ""));
  });

  return <>
    <PageHead title="Invoices & Payments" button="Create Invoice" onClick={openForm} />
    {error && <div className="ac-error" role="alert">{error}</div>}
    <div className="panel">
      <TableControls
        search={q} onSearch={setQ} searchPlaceholder="Search invoice, customer, vehicle or request..."
        filters={[{ label: "Status", value: statusFilter, onChange: setStatusFilter, options: ["Paid", "Unpaid", "Partially Paid"] }]}
        sortValue={sortBy} onSort={setSortBy}
        sortOptions={[{ value: "date-newest", label: "Date (newest first)" }, { value: "date-oldest", label: "Date (oldest first)" }, { value: "total-high", label: "Total (high–low)" }, { value: "total-low", label: "Total (low–high)" }]}
        shown={filtered.length} total={rows.length} recordLabel="invoices"
      />
      <div className="table-wrap"><table className="table"><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Vehicle</th><th>Service Request</th><th>Total</th><th>Status</th><th style={{ textAlign: "center", width: "100px" }}>Actions</th></tr></thead>
        <tbody>{filtered.map(x => <tr key={x._id}><td>{x.code}</td><td>{x.date}</td><td>{x.serviceRequest?.vehicle?.customer?.name || "—"}</td><td>{x.serviceRequest?.vehicle?.registration || "—"}</td><td>{x.serviceRequest?.code || "—"}</td><td>{money(x.total)}</td><td><select aria-label={`Status for invoice ${x.code}`} value={x.status} onChange={e => setStatus(x._id, e.target.value)}><option>Paid</option><option>Unpaid</option><option>Partially Paid</option></select></td><td style={{ textAlign: "center", verticalAlign: "middle", width: "100px" }}><button className="small-btn danger" onClick={() => remove(x)}>Delete</button></td></tr>)}</tbody>
      </table>{!filtered.length && <div className="empty">{rows.length ? "No invoices match your search or filters." : "No invoices created yet."}</div>}</div>
    </div>
    <Modal open={open} title="Create Invoice" onClose={() => setOpen(false)}><form onSubmit={save}>
      <label>Service Request<select name="serviceRequest" required defaultValue=""><option value="" disabled>Select a service request</option>{requests.map(r => <option value={r._id} key={r._id}>{r.code} - {r.vehicle?.registration}</option>)}</select></label>
      <div className="form-grid"><label>Date<input name="date" type="date" required /></label><label>Total<input name="total" type="number" min="0" step="0.01" required /></label></div>
      <button className="primary full" disabled={!requests.length}>Create Invoice</button>{!requests.length && <p className="muted">Create a service request before creating an invoice.</p>}
    </form></Modal>
  </>;
}
