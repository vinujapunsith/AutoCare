import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Modal, PageHead, Status } from "../components/Common";
import TableControls from "../components/TableControls";

export default function Appointments({ user }) {
  const isAdmin = user?.role === "Admin";
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-newest");
  const [error, setError] = useState("");

  const load = () => Promise.all([
    api("/appointments"), api("/vehicles"), api("/services"), isAdmin ? api("/mechanics") : Promise.resolve([])
  ]).then(([a, v, s, m]) => { setRows(a); setVehicles(v); setServices(s); setMechanics(m); });
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const save = async e => {
    e.preventDefault();
    setError("");
    try {
      await api("/appointments", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      setOpen(false);
      await load();
    } catch (e) { setError(e.message); }
  };

  const setStatus = async (id, status) => {
    setError("");
    try { await api(`/appointments/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }); await load(); }
    catch (e) { setError(e.message); }
  };

  const cancel = async id => {
    setError("");
    try { await api(`/appointments/${id}/cancel`, { method: "PUT", body: JSON.stringify({}) }); await load(); }
    catch (e) { setError(e.message); }
  };

  const remove = async appointment => {
    if (!confirm(`Delete the appointment for ${appointment.vehicle?.registration || "this vehicle"} on ${appointment.date} at ${appointment.time}? This cannot be undone.`)) return;
    setError("");
    try { await api(`/appointments/${appointment._id}`, { method: "DELETE" }); await load(); }
    catch (e) { setError(e.message); }
  };

  const filtered = rows.filter(x => {
    const matchesSearch = [x.date, x.time, x.vehicle?.registration, x.vehicle?.customer?.name, x.service?.name, x.mechanic?.name, x.status, x.notes]
      .some(value => String(value || "").toLowerCase().includes(q.toLowerCase()));
    return matchesSearch && (statusFilter === "all" || x.status === statusFilter);
  }).sort((a, b) => {
    const aDate = `${a.date || ""} ${a.time || ""}`;
    const bDate = `${b.date || ""} ${b.time || ""}`;
    if (sortBy === "date-oldest") return aDate.localeCompare(bDate);
    if (sortBy === "vehicle-asc") return String(a.vehicle?.registration || "").localeCompare(String(b.vehicle?.registration || ""));
    if (sortBy === "status-asc") return String(a.status || "").localeCompare(String(b.status || ""));
    return bDate.localeCompare(aDate);
  });

  return <>
    <PageHead title={isAdmin ? "Appointments" : "My Appointments"} button="Book Appointment" onClick={() => { setError(""); setOpen(true); }} />
    {error && <div className="ac-error" role="alert">{error}</div>}
    <div className="panel">
      <TableControls
        search={q} onSearch={setQ} searchPlaceholder="Search date, vehicle, customer or service..."
        filters={[{ label: "Status", value: statusFilter, onChange: setStatusFilter, options: ["Pending", "Confirmed", "Completed", "Cancelled"] }]}
        sortValue={sortBy} onSort={setSortBy}
        sortOptions={[{ value: "date-newest", label: "Date (newest first)" }, { value: "date-oldest", label: "Date (oldest first)" }, { value: "vehicle-asc", label: "Vehicle registration" }, { value: "status-asc", label: "Status" }]}
        shown={filtered.length} total={rows.length} recordLabel="appointments"
      />
      <div className="table-wrap"><table className="table"><thead><tr>
        <th>Date &amp; Time</th>{isAdmin && <th>Customer</th>}<th>Vehicle</th><th>Service</th>{isAdmin && <th>Mechanic</th>}<th>Status</th>{isAdmin ? <th>Actions</th> : <th>Action</th>}
      </tr></thead>
      <tbody>{filtered.map(x => <tr key={x._id}>
        <td>{x.date}<br />{x.time}</td>{isAdmin && <td>{x.vehicle?.customer?.name || "—"}</td>}<td>{x.vehicle?.registration || "—"}</td><td>{x.service?.name || "-"}</td>{isAdmin && <td>{x.mechanic?.name || "-"}</td>}<td><Status value={x.status} /></td>
        <td>{isAdmin ? <div className="actions"><select aria-label={`Status for appointment ${x.date}`} value={x.status} onChange={e => setStatus(x._id, e.target.value)}><option>Pending</option><option>Confirmed</option><option>Completed</option><option>Cancelled</option></select><button className="small-btn danger" onClick={() => remove(x)}>Delete</button></div> : x.status === "Pending" ? <button className="small-btn" onClick={() => cancel(x._id)}>Cancel booking</button> : <span>—</span>}</td>
      </tr>)}</tbody></table>
      {!filtered.length && <div className="empty">{rows.length ? "No appointments match your search or filters." : (isAdmin ? "No appointments yet." : "You have no appointments yet. Book your first service to get started.")}</div>}
      </div>
    </div>

    <Modal open={open} title="Book Appointment" onClose={() => setOpen(false)}>
      <form onSubmit={save}><div className="form-grid">
        <label>Vehicle<select name="vehicle" required defaultValue=""><option value="" disabled>{!vehicles.length ? "Add a vehicle first" : "Select a vehicle"}</option>{vehicles.map(v => <option key={v._id} value={v._id}>{v.registration}{isAdmin ? ` - ${v.customer?.name || "Customer"}` : ` - ${v.brand} ${v.model}`}</option>)}</select></label>
        <label>Service<select name="service" required defaultValue=""><option value="" disabled>Select a service</option>{services.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></label>
        {isAdmin && <label>Mechanic<select name="mechanic"><option value="">Not assigned</option>{mechanics.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select></label>}
        <label>Date<input name="date" type="date" min={new Date().toISOString().slice(0, 10)} required /></label>
        <label>Time<input name="time" type="time" required /></label>
        <label className="full-row">Notes<textarea name="notes" maxLength="1000" /></label>
      </div><button className="primary full" disabled={!vehicles.length || !services.length}>Book Appointment</button>
      {!vehicles.length && <p className="muted">Add your vehicle before booking an appointment.</p>}</form>
    </Modal>
  </>;
}
