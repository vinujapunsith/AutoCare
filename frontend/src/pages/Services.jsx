import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Modal, PageHead, money } from "../components/Common";
import TableControls from "../components/TableControls";

export default function Services({ user }) {
  const isAdmin = user?.role === "Admin";
  const [rows, setRows] = useState([]);
  const [parts, setParts] = useState([]);
  const [partsRequired, setPartsRequired] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [error, setError] = useState("");

  const load = () => Promise.all([
    api("/services"),
    isAdmin ? api("/parts") : Promise.resolve([])
  ]).then(([services, inventory]) => {
    setRows(services);
    setParts(inventory);
  });

  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const openEditor = service => {
    setEdit(service || null);
    setPartsRequired((service?.partsRequired || []).map(item => ({
      part: item.part?._id || item.part || "",
      quantity: item.quantity || 1
    })));
    setError("");
    setOpen(true);
  };

  const save = async e => {
    e.preventDefault();
    setError("");
    const f = Object.fromEntries(new FormData(e.target));
    if (partsRequired.some(item => !item.part)) {
      setError("Select a part for each row or remove the empty row.");
      return;
    }
    if (partsRequired.some(item => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
      setError("Part quantities must be whole numbers greater than zero.");
      return;
    }

    try {
      await api(`/services${edit ? "/" + edit._id : ""}`, {
        method: edit ? "PUT" : "POST",
        body: JSON.stringify({
          ...f,
          price: Number(f.price),
          partsRequired: partsRequired.map(item => ({ part: item.part, quantity: Number(item.quantity) }))
        })
      });
      setOpen(false);
      setEdit(null);
      setPartsRequired([]);
      await load();
    } catch (e) { setError(e.message); }
  };

  const remove = async service => {
    if (!confirm(`Delete service "${service.name}"? Services used by appointments or service requests cannot be deleted.`)) return;
    setError("");
    try { await api(`/services/${service._id}`, { method: "DELETE" }); await load(); }
    catch (e) { setError(e.message); }
  };

  const categories = [...new Set(rows.map(x => String(x.category || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const filtered = rows.filter(x => {
    const matchesSearch = [x.name, x.category, x.duration].some(value => String(value || "").toLowerCase().includes(q.toLowerCase()));
    return matchesSearch && (categoryFilter === "all" || x.category === categoryFilter);
  }).sort((a, b) => {
    if (sortBy === "name-desc") return String(b.name || "").localeCompare(String(a.name || ""));
    if (sortBy === "price-high") return Number(b.price || 0) - Number(a.price || 0);
    if (sortBy === "price-low") return Number(a.price || 0) - Number(b.price || 0);
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return <>
    <PageHead title="Services" button={isAdmin ? "Add Service" : undefined} onClick={isAdmin ? () => openEditor(null) : undefined} />
    {error && !open && <div className="ac-error" role="alert">{error}</div>}
    <div className="panel">
      <TableControls
        search={q} onSearch={setQ} searchPlaceholder="Search service, category or duration..."
        filters={[{ label: "Category", value: categoryFilter, onChange: setCategoryFilter, options: categories }]}
        sortValue={sortBy} onSort={setSortBy}
        sortOptions={[{ value: "name-asc", label: "Name (A–Z)" }, { value: "name-desc", label: "Name (Z–A)" }, { value: "price-low", label: "Price (low–high)" }, { value: "price-high", label: "Price (high–low)" }]}
        shown={filtered.length} total={rows.length} recordLabel="services"
      />
      <div className="table-wrap"><table className="table"><thead><tr><th>Service</th><th>Category</th><th>Price</th><th>Duration</th><th>Parts Required</th>{isAdmin && <th>Actions</th>}</tr></thead>
        <tbody>{filtered.map(x => <tr key={x._id}>
          <td>{x.name}</td><td>{x.category || "—"}</td><td>{money(x.price)}</td><td>{x.duration || "—"}</td>
          <td>{x.partsRequired?.length ? x.partsRequired.map(item => `${item.part?.name || "Part"} × ${item.quantity}`).join(", ") : "—"}</td>
          {isAdmin && <td className="actions"><button className="small-btn" onClick={() => openEditor(x)}>Edit</button><button className="small-btn danger" onClick={() => remove(x)}>Delete</button></td>}
        </tr>)}</tbody>
      </table>{!filtered.length && <div className="empty">{rows.length ? "No services match your search or filters." : "No services are available right now."}</div>}</div>
    </div>

    {isAdmin && <Modal open={open} title={`${edit ? "Edit" : "Add"} Service`} onClose={() => setOpen(false)}>
      {error && <div className="ac-error" role="alert">{error}</div>}
      <form onSubmit={save}>
        <div className="form-grid">
          <label>Name<input name="name" defaultValue={edit?.name || ""} required maxLength="100" /></label>
          <label>Category<input name="category" defaultValue={edit?.category || ""} maxLength="60" /></label>
          <label>Price<input name="price" type="number" min="0" step="0.01" defaultValue={edit?.price ?? 0} required /></label>
          <label>Duration<input name="duration" defaultValue={edit?.duration || "1 hour"} maxLength="40" /></label>

          <div className="full-row parts-required-box">
            <div className="parts-required-heading">
              <div><strong>Parts Required</strong></div>
              <button type="button" className="small-btn" onClick={() => setPartsRequired(current => [...current, { part: "", quantity: 1 }])} disabled={!parts.length}>＋ Add Part</button>
            </div>
            {partsRequired.map((item, index) => <div className="parts-required-row" key={index}>
              <select aria-label={`Part ${index + 1}`} value={item.part} onChange={e => setPartsRequired(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, part: e.target.value } : row))}>
                <option value="">Select a part</option>
                {parts.map(part => <option key={part._id} value={part._id} disabled={partsRequired.some((row, rowIndex) => rowIndex !== index && row.part === part._id)}>{part.name} (Stock: {part.stock})</option>)}
              </select>
              <input aria-label={`Quantity for part ${index + 1}`} type="number" min="1" step="1" value={item.quantity} onChange={e => setPartsRequired(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: e.target.value } : row))} />
              <button type="button" className="small-btn danger" onClick={() => setPartsRequired(current => current.filter((_, rowIndex) => rowIndex !== index))}>Remove</button>
            </div>)}
            {!partsRequired.length && <p className="parts-required-empty">No parts assigned to this service.</p>}
            {!parts.length && <p className="parts-required-empty">Add spare parts in the Spare Parts section before assigning them here.</p>}
          </div>
        </div>
        <button className="primary full">{edit ? "Save Changes" : "Save Service"}</button>
      </form>
    </Modal>}
  </>;
}
