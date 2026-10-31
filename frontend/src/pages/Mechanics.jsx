import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Modal, PageHead, Status } from "../components/Common";
import TableControls from "../components/TableControls";

export default function Mechanics() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [error, setError] = useState("");

  const load = () => api("/mechanics").then(setRows);
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const openForm = mechanic => {
    setEdit(mechanic || null);
    setError("");
    setOpen(true);
  };

  const save = async e => {
    e.preventDefault();
    setError("");
    const form = Object.fromEntries(new FormData(e.target));
    try {
      await api(`/mechanics${edit ? "/" + edit._id : ""}`, {
        method: edit ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setOpen(false);
      setEdit(null);
      await load();
    } catch (e) { setError(e.message); }
  };

  const remove = async mechanic => {
    if (!confirm(`Delete mechanic "${mechanic.name}"? Mechanics assigned to appointments or service requests cannot be deleted.`)) return;
    setError("");
    try { await api(`/mechanics/${mechanic._id}`, { method: "DELETE" }); await load(); }
    catch (e) { setError(e.message); }
  };

  const filtered = rows.filter(x => {
    const matchesSearch = [x.code, x.name, x.phone, x.specialization, x.status].some(value => String(value || "").toLowerCase().includes(q.toLowerCase()));
    return matchesSearch && (statusFilter === "all" || x.status === statusFilter);
  }).sort((a, b) => {
    if (sortBy === "name-desc") return String(b.name || "").localeCompare(String(a.name || ""));
    if (sortBy === "status-asc") return String(a.status || "").localeCompare(String(b.status || ""));
    if (sortBy === "code-asc") return String(a.code || "").localeCompare(String(b.code || ""));
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return <>
    <PageHead title="Mechanics" button="Add Mechanic" onClick={() => openForm(null)} />
    {error && <div className="ac-error" role="alert">{error}</div>}
    <div className="panel">
      <TableControls
        search={q} onSearch={setQ} searchPlaceholder="Search name, ID, phone or specialization..."
        filters={[{ label: "Status", value: statusFilter, onChange: setStatusFilter, options: ["Available", "Busy", "Off Duty"] }]}
        sortValue={sortBy} onSort={setSortBy}
        sortOptions={[{ value: "name-asc", label: "Name (A–Z)" }, { value: "name-desc", label: "Name (Z–A)" }, { value: "status-asc", label: "Status" }, { value: "code-asc", label: "Mechanic ID" }]}
        shown={filtered.length} total={rows.length} recordLabel="mechanics"
      />
      <div className="table-wrap"><table className="table"><thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Specialization</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{filtered.map(x => <tr key={x._id}><td>{x.code}</td><td>{x.name}</td><td>{x.phone || "—"}</td><td>{x.specialization || "—"}</td><td><Status value={x.status} /></td><td className="actions"><button className="small-btn" onClick={() => openForm(x)}>Edit</button><button className="small-btn danger" onClick={() => remove(x)}>Delete</button></td></tr>)}</tbody>
      </table>{!filtered.length && <div className="empty">{rows.length ? "No mechanics match your search or filters." : "No mechanics added yet."}</div>}</div>
    </div>

    <Modal open={open} title={`${edit ? "Edit" : "Add"} Mechanic`} onClose={() => { setOpen(false); setEdit(null); }}><form onSubmit={save}><div className="form-grid">
      <label>Name<input name="name" defaultValue={edit?.name || ""} required maxLength="100" /></label>
      <label>Phone<input name="phone" defaultValue={edit?.phone || ""} maxLength="25" /></label>
      <label>Specialization<input name="specialization" defaultValue={edit?.specialization || ""} maxLength="100" /></label>
      <label>Status<select name="status" defaultValue={edit?.status || "Available"}><option>Available</option><option>Busy</option><option>Off Duty</option></select></label>
    </div><button className="primary full">{edit ? "Save Changes" : "Save Mechanic"}</button></form></Modal>
  </>;
}
