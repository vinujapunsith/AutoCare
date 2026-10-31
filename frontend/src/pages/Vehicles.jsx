import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Modal, PageHead, Status, money } from "../components/Common";
import TableControls from "../components/TableControls";

export default function Vehicles({ user }) {
  const isAdmin = user?.role === "Admin";
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [history, setHistory] = useState(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("registration-asc");
  const [error, setError] = useState("");

  const load = () => {
    if (isAdmin) return Promise.all([api("/vehicles"), api("/customers")]).then(([v, c]) => { setRows(v); setCustomers(c); });
    return api("/vehicles").then(setRows);
  };
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const save = async e => {
    e.preventDefault();
    setError("");
    const f = Object.fromEntries(new FormData(e.target));
    const payload = { ...f, year: f.year ? Number(f.year) : "" };
    try {
      await api(`/vehicles${edit ? "/" + edit._id : ""}`, { method: edit ? "PUT" : "POST", body: JSON.stringify(payload) });
      setOpen(false); setEdit(null); await load();
    } catch (e) { setError(e.message); }
  };

  const remove = async vehicle => {
    if (!confirm(`Delete vehicle ${vehicle.registration}? Vehicles with appointments or service records cannot be deleted.`)) return;
    setError("");
    try { await api(`/vehicles/${vehicle._id}`, { method: "DELETE" }); await load(); }
    catch (e) { setError(e.message); }
  };

  const showHistory = async x => {
    try { setHistory({ vehicle: x, rows: await api(`/vehicles/${x._id}/history`) }); }
    catch (e) { setError(e.message); }
  };

  const filtered = rows.filter(x => {
    const matchesSearch = [x.registration, x.brand, x.model, x.year, x.type, x.customer?.name].some(value => String(value || "").toLowerCase().includes(q.toLowerCase()));
    return matchesSearch && (typeFilter === "all" || x.type === typeFilter);
  }).sort((a, b) => {
    if (sortBy === "registration-desc") return String(b.registration || "").localeCompare(String(a.registration || ""));
    if (sortBy === "year-newest") return Number(b.year || 0) - Number(a.year || 0);
    if (sortBy === "year-oldest") return Number(a.year || 0) - Number(b.year || 0);
    if (sortBy === "brand-asc") return String(a.brand || "").localeCompare(String(b.brand || ""));
    return String(a.registration || "").localeCompare(String(b.registration || ""));
  });

  return <>
    <PageHead title={isAdmin ? "Vehicles" : "My Vehicles"} button="Add Vehicle" onClick={() => { setEdit(null); setError(""); setOpen(true); }} />
    {error && <div className="ac-error" role="alert">{error}</div>}
    <div className="panel">
      <TableControls
        search={q} onSearch={setQ} searchPlaceholder="Search registration, brand, model or customer..."
        filters={[{ label: "Type", value: typeFilter, onChange: setTypeFilter, options: ["Car", "SUV", "Van", "Truck", "Motorcycle"] }]}
        sortValue={sortBy} onSort={setSortBy}
        sortOptions={[{ value: "registration-asc", label: "Registration (A–Z)" }, { value: "registration-desc", label: "Registration (Z–A)" }, { value: "year-newest", label: "Year (newest)" }, { value: "year-oldest", label: "Year (oldest)" }, { value: "brand-asc", label: "Brand (A–Z)" }]}
        shown={filtered.length} total={rows.length} recordLabel="vehicles"
      />
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Registration</th><th>Brand</th><th>Model</th><th>Year</th><th>Type</th>{isAdmin && <th>Customer</th>}<th>Actions</th></tr></thead>
        <tbody>{filtered.map(x => <tr key={x._id}>
          <td><b>{x.registration}</b></td><td>{x.brand}</td><td>{x.model}</td><td>{x.year || "—"}</td><td>{x.type || "—"}</td>{isAdmin && <td>{x.customer?.name || "—"}</td>}
          <td className="actions">
            <button className="small-btn" onClick={() => showHistory(x)}>History</button>
            <button className="small-btn" onClick={() => { setEdit(x); setError(""); setOpen(true); }}>Edit</button>
            <button className="small-btn danger" onClick={() => remove(x)}>Delete</button>
          </td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <div className="empty">{rows.length ? "No vehicles match your search or filters." : "No vehicles registered yet. Add a vehicle to get started."}</div>}
      </div>
    </div>

    <Modal open={open} title={`${edit ? "Edit" : "Add"} Vehicle`} onClose={() => setOpen(false)}>
      <form onSubmit={save}><div className="form-grid">
        <label>Registration<input name="registration" defaultValue={edit?.registration || ""} required maxLength="20" /></label>
        <label>Brand<input name="brand" defaultValue={edit?.brand || ""} required maxLength="60" /></label>
        <label>Model<input name="model" defaultValue={edit?.model || ""} required maxLength="60" /></label>
        <label>Year<input name="year" type="number" min="1900" max={new Date().getFullYear() + 1} defaultValue={edit?.year || new Date().getFullYear()} /></label>
        <label>Type<select name="type" defaultValue={edit?.type || "Car"}><option>Car</option><option>SUV</option><option>Van</option><option>Truck</option><option>Motorcycle</option></select></label>
        {isAdmin && <label>Customer<select name="customer" defaultValue={edit?.customer?._id || customers[0]?._id || ""} required>{customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>}
      </div><button className="primary full" disabled={isAdmin && !customers.length}>Save Vehicle</button></form>
    </Modal>

    <Modal open={!!history} title={`${history?.vehicle?.registration || ""} - Service History`} onClose={() => setHistory(null)}>
      <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Service</th><th>Mechanic</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>{history?.rows?.map(x => <tr key={x._id}><td>{x.date}</td><td>{x.service?.name}</td><td>{x.mechanic?.name || "-"}</td><td>{money(x.total)}</td><td><Status value={x.status} /></td></tr>)}</tbody></table>
      {!history?.rows?.length && <div className="empty">No service history found.</div>}</div>
    </Modal>
  </>;
}
