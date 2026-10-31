import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Modal, PageHead } from "../components/Common";
import TableControls from "../components/TableControls";

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [error, setError] = useState("");

  const load = () => api("/customers").then(setRows);
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const save = async e => {
    e.preventDefault();
    setError("");
    const form = Object.fromEntries(new FormData(e.target));
    try {
      await api(`/customers${edit ? "/" + edit._id : ""}`, {
        method: edit ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setOpen(false);
      setEdit(null);
      await load();
    } catch (e) { setError(e.message); }
  };

  const remove = async id => {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    setError("");
    try {
      await api("/customers/" + id, { method: "DELETE" });
      await load();
    } catch (e) { setError(e.message); }
  };

  const filtered = rows.filter(x => {
    const matchesSearch = [x.code, x.name, x.phone, x.email, x.address].some(value => String(value || "").toLowerCase().includes(q.toLowerCase()));
    const matchesVehicles = vehicleFilter === "all" || (vehicleFilter === "with-vehicles" ? Number(x.vehicleCount) > 0 : Number(x.vehicleCount) === 0);
    return matchesSearch && matchesVehicles;
  }).sort((a, b) => {
    if (sortBy === "name-desc") return String(b.name || "").localeCompare(String(a.name || ""));
    if (sortBy === "vehicles-desc") return Number(b.vehicleCount || 0) - Number(a.vehicleCount || 0);
    if (sortBy === "code-asc") return String(a.code || "").localeCompare(String(b.code || ""));
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return <>
    <PageHead title="Customers" button="Add Customer" onClick={() => { setEdit(null); setError(""); setOpen(true); }} />
    {error && <div className="ac-error" role="alert">{error}</div>}
    <div className="panel">
      <TableControls
        search={q} onSearch={setQ} searchPlaceholder="Search name, ID, phone or email..."
        filters={[{ label: "Vehicles", value: vehicleFilter, onChange: setVehicleFilter, allLabel: "All customers", options: [{ value: "with-vehicles", label: "Has vehicles" }, { value: "no-vehicles", label: "No vehicles" }] }]}
        sortValue={sortBy} onSort={setSortBy}
        sortOptions={[{ value: "name-asc", label: "Name (A–Z)" }, { value: "name-desc", label: "Name (Z–A)" }, { value: "vehicles-desc", label: "Most vehicles" }, { value: "code-asc", label: "Customer ID" }]}
        shown={filtered.length} total={rows.length} recordLabel="customers"
      />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Email</th><th>Vehicles</th><th>Actions</th></tr></thead>
          <tbody>{filtered.map(x => <tr key={x._id}>
            <td>{x.code}</td><td>{x.name}</td><td>{x.phone || "—"}</td><td>{x.email || "—"}</td><td>{x.vehicleCount}</td>
            <td className="actions">
              <button className="small-btn" onClick={() => { setEdit(x); setError(""); setOpen(true); }}>Edit</button>
              <button className="small-btn danger" onClick={() => remove(x._id)}>Delete</button>
            </td>
          </tr>)}</tbody>
        </table>
        {!filtered.length && <div className="empty">{rows.length ? "No customers match your search or filters." : "No customers found."}</div>}
      </div>
    </div>

    <Modal open={open} title={`${edit ? "Edit" : "Add"} Customer`} onClose={() => setOpen(false)}>
      <form onSubmit={save}>
        <div className="form-grid">
          <label>Full Name<input name="name" defaultValue={edit?.name || ""} required maxLength="100" /></label>
          <label>Phone<input name="phone" defaultValue={edit?.phone || ""} maxLength="25" /></label>
          <label>Email<input name="email" type="email" defaultValue={edit?.email || ""} maxLength="254" /></label>
          <label>Address<input name="address" defaultValue={edit?.address || ""} maxLength="250" /></label>
        </div>
        <button className="primary full">Save Customer</button>
      </form>
    </Modal>
  </>;
}
