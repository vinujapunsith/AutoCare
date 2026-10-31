import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Modal, PageHead, money } from "../components/Common";
import TableControls from "../components/TableControls";

export default function Parts() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [error, setError] = useState("");
  const load = () => api("/parts").then(setRows);
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const save = async e => {
    e.preventDefault(); setError("");
    const f = Object.fromEntries(new FormData(e.target));
    try {
      await api(`/parts${edit ? "/" + edit._id : ""}`, { method: edit ? "PUT" : "POST", body: JSON.stringify({ ...f, stock: Number(f.stock), price: Number(f.price) }) });
      setOpen(false); setEdit(null); await load();
    } catch (e) { setError(e.message); }
  };

  const remove = async part => {
    if (!confirm(`Delete spare part "${part.name}" (${part.code})? This cannot be undone.`)) return;
    setError("");
    try { await api(`/parts/${part._id}`, { method: "DELETE" }); await load(); }
    catch (e) { setError(e.message); }
  };

  const filtered = rows.filter(x => {
    const matchesSearch = [x.code, x.name, x.category, x.supplier].some(value => String(value || "").toLowerCase().includes(q.toLowerCase()));
    const matchesStock = stockFilter === "all" || (stockFilter === "low" ? Number(x.stock) > 0 && Number(x.stock) < 10 : Number(x.stock) === 0);
    return matchesSearch && matchesStock;
  }).sort((a, b) => {
    if (sortBy === "name-desc") return String(b.name || "").localeCompare(String(a.name || ""));
    if (sortBy === "stock-asc") return Number(a.stock || 0) - Number(b.stock || 0);
    if (sortBy === "price-desc") return Number(b.price || 0) - Number(a.price || 0);
    if (sortBy === "price-asc") return Number(a.price || 0) - Number(b.price || 0);
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return <>
    <PageHead title="Spare Parts" button="Add Part" onClick={() => { setEdit(null); setError(""); setOpen(true); }} />
    {error && <div className="ac-error" role="alert">{error}</div>}
    <div className="panel">
      <TableControls
        search={q} onSearch={setQ} searchPlaceholder="Search part, ID, category or supplier..."
        filters={[{ label: "Stock", value: stockFilter, onChange: setStockFilter, options: [{ value: "low", label: "Low stock (1–9)" }, { value: "out", label: "Out of stock" }] }]}
        sortValue={sortBy} onSort={setSortBy}
        sortOptions={[{ value: "name-asc", label: "Name (A–Z)" }, { value: "name-desc", label: "Name (Z–A)" }, { value: "stock-asc", label: "Stock (lowest first)" }, { value: "price-desc", label: "Price (high–low)" }, { value: "price-asc", label: "Price (low–high)" }]}
        shown={filtered.length} total={rows.length} recordLabel="parts"
      />
      <div className="table-wrap"><table className="table"><thead><tr><th>ID</th><th>Part</th><th>Category</th><th>Stock</th><th>Price</th><th>Supplier</th><th>Actions</th></tr></thead>
        <tbody>{filtered.map(x => <tr key={x._id}><td>{x.code}</td><td>{x.name}</td><td>{x.category || "—"}</td><td className={x.stock < 10 ? "low" : ""}>{x.stock}</td><td>{money(x.price)}</td><td>{x.supplier || "—"}</td><td className="actions"><button className="small-btn" onClick={() => { setEdit(x); setError(""); setOpen(true); }}>Edit</button><button className="small-btn danger" onClick={() => remove(x)}>Delete</button></td></tr>)}</tbody>
      </table>{!filtered.length && <div className="empty">{rows.length ? "No parts match your search or filters." : "No spare parts in inventory."}</div>}</div>
    </div>
    <Modal open={open} title={`${edit ? "Edit" : "Add"} Part`} onClose={() => setOpen(false)}><form onSubmit={save}><div className="form-grid">
      <label>Name<input name="name" defaultValue={edit?.name || ""} required maxLength="100" /></label><label>Category<input name="category" defaultValue={edit?.category || ""} maxLength="60" /></label><label>Stock<input name="stock" type="number" min="0" step="1" defaultValue={edit?.stock ?? 0} required /></label><label>Price<input name="price" type="number" min="0" step="0.01" defaultValue={edit?.price ?? 0} required /></label><label>Supplier<input name="supplier" defaultValue={edit?.supplier || ""} maxLength="100" /></label>
    </div><button className="primary full">Save Part</button></form></Modal>
  </>;
}
