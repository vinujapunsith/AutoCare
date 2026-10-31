import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Modal, PageHead, Status, money } from "../components/Common";
import TableControls from "../components/TableControls";

export default function ServiceRequests() {
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-newest");
  const [error, setError] = useState("");

  const load = () => Promise.all([api("/service-requests"), api("/vehicles"), api("/services"), api("/mechanics")])
    .then(([r, v, s, m]) => { setRows(r); setVehicles(v); setServices(s); setMechanics(m); });
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const save = async e => {
    e.preventDefault();
    setError("");
    const f = Object.fromEntries(new FormData(e.target));
    try {
      await api("/service-requests", { method: "POST", body: JSON.stringify({ ...f, total: Number(f.total) }) });
      setOpen(false);
      setSelectedServiceId("");
      await load();
    } catch (e) { setError(e.message); }
  };

  const setStatus = async (id, status) => {
    setError("");
    try {
      await api(`/service-requests/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
      await load();
    } catch (e) { setError(e.message); }
  };

  const remove = async request => {
    if (!confirm(`Delete service request ${request.code}? This cannot be undone.`)) return;
    setError("");
    try { await api(`/service-requests/${request._id}`, { method: "DELETE" }); await load(); }
    catch (e) { setError(e.message); }
  };

  const selectedService = services.find(service => service._id === selectedServiceId);
  const filtered = rows.filter(x => {
    const matchesSearch = [x.code, x.date, x.vehicle?.registration, x.vehicle?.customer?.name, x.service?.name, x.mechanic?.name, x.status, x.total]
      .some(value => String(value ?? "").toLowerCase().includes(q.toLowerCase()));
    return matchesSearch && (statusFilter === "all" || x.status === statusFilter);
  }).sort((a, b) => {
    if (sortBy === "date-oldest") return String(a.date || "").localeCompare(String(b.date || ""));
    if (sortBy === "total-high") return Number(b.total || 0) - Number(a.total || 0);
    if (sortBy === "total-low") return Number(a.total || 0) - Number(b.total || 0);
    return String(b.date || "").localeCompare(String(a.date || ""));
  });

  return <>
    <PageHead title="Service Requests" button="New Service Request" onClick={() => { setError(""); setSelectedServiceId(""); setOpen(true); }} />
    {error && <div className="ac-error" role="alert">{error}</div>}
    <div className="panel">
      <TableControls
        search={q} onSearch={setQ} searchPlaceholder="Search request ID, vehicle, customer or service..."
        filters={[{ label: "Status", value: statusFilter, onChange: setStatusFilter, options: ["Pending", "In Progress", "Completed", "Cancelled"] }]}
        sortValue={sortBy} onSort={setSortBy}
        sortOptions={[{ value: "date-newest", label: "Date (newest first)" }, { value: "date-oldest", label: "Date (oldest first)" }, { value: "total-high", label: "Total (high–low)" }, { value: "total-low", label: "Total (low–high)" }]}
        shown={filtered.length} total={rows.length} recordLabel="service requests"
      />
      <div className="table-wrap"><table className="table"><thead><tr><th>ID</th><th>Vehicle</th><th>Customer</th><th>Service / Parts</th><th>Mechanic</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{filtered.map(x => <tr key={x._id}>
          <td>{x.code}</td>
          <td>{x.vehicle?.registration || "—"}</td>
          <td>{x.vehicle?.customer?.name || "—"}</td>
          <td>
            <div>{x.service?.name || "—"}</div>
            {x.partsUsed?.length > 0 && <small className="parts-used-summary">{x.partsUsed.map(part => `${part.name} × ${part.quantity}`).join(", ")}</small>}
            {x.stockDeducted && x.partsUsed?.length > 0 && <small className="stock-deducted-note">Inventory updated</small>}
          </td>
          <td>{x.mechanic?.name || "-"}</td>
          <td>{money(x.total)}</td>
          <td><Status value={x.status} /></td>
          <td className="actions">
            <select aria-label={`Status for service request ${x.code}`} value={x.status} disabled={x.stockDeducted || x.stockDeductionInProgress} onChange={e => setStatus(x._id, e.target.value)}>
              <option>Pending</option><option>In Progress</option><option>Completed</option><option>Cancelled</option>
            </select>
            <button className="small-btn danger" disabled={x.stockDeducted || x.stockDeductionInProgress} title={x.stockDeducted ? "Completed requests with deducted stock cannot be deleted" : x.stockDeductionInProgress ? "Stock deduction is being processed" : "Delete service request"} onClick={() => remove(x)}>Delete</button>
          </td>
        </tr>)}</tbody>
      </table>{!filtered.length && <div className="empty">{rows.length ? "No service requests match your search or filters." : "No service requests yet."}</div>}</div>
    </div>

    <Modal open={open} title="New Service Request" onClose={() => setOpen(false)}>
      <form onSubmit={save}>
        <div className="form-grid">
          <label>Vehicle<select name="vehicle" required defaultValue=""><option value="" disabled>Select a vehicle</option>{vehicles.map(v => <option value={v._id} key={v._id}>{v.registration} - {v.customer?.name}</option>)}</select></label>
          <label>Service<select name="service" required value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)}><option value="" disabled>Select a service</option>{services.map(s => <option value={s._id} key={s._id}>{s.name}</option>)}</select></label>
          <label>Mechanic<select name="mechanic" defaultValue=""><option value="">Not assigned</option>{mechanics.map(m => <option value={m._id} key={m._id}>{m.name}</option>)}</select></label>
          <label>Date<input name="date" type="date" required /></label>
          <label>Total<input name="total" type="number" min="0" step="0.01" defaultValue="0" required /></label>
          {selectedService?.partsRequired?.length > 0 && <div className="full-row request-parts-preview">
            <strong>Parts to be used</strong>
            <span>{selectedService.partsRequired.map(item => `${item.part?.name || "Part"} × ${item.quantity}`).join(", ")}</span>
            <small>Inventory will be deducted when this request is marked Completed.</small>
          </div>}
        </div>
        <button className="primary full" disabled={!vehicles.length || !services.length}>Create Service Request</button>
      </form>
    </Modal>
  </>;
}
