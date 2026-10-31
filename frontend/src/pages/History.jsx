import React, { useEffect, useState } from "react";
import { api } from "../api";
import { PageHead, Status, money } from "../components/Common";
import TableControls from "../components/TableControls";

export default function History() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-newest");
  const [error, setError] = useState("");

  useEffect(() => { api("/service-requests").then(setRows).catch(e => setError(e.message)); }, []);

  const filtered = rows.filter(x => {
    const matchesSearch = [x.code, x.date, x.vehicle?.registration, x.vehicle?.customer?.name, x.service?.name, x.mechanic?.name, x.status, x.total]
      .some(value => String(value ?? "").toLowerCase().includes(q.toLowerCase()));
    return matchesSearch && (statusFilter === "all" || x.status === statusFilter);
  }).sort((a, b) => sortBy === "date-oldest"
    ? String(a.date || "").localeCompare(String(b.date || ""))
    : String(b.date || "").localeCompare(String(a.date || "")));

  return <>
    <PageHead title="Service History" subtitle="Previous vehicle service records" />
    {error && <div className="ac-error" role="alert">{error}</div>}
    <div className="panel">
      <TableControls
        search={q} onSearch={setQ} searchPlaceholder="Search ID, vehicle, customer or service..."
        filters={[{ label: "Status", value: statusFilter, onChange: setStatusFilter, options: ["Pending", "In Progress", "Completed", "Cancelled"] }]}
        sortValue={sortBy} onSort={setSortBy}
        sortOptions={[{ value: "date-newest", label: "Date (newest first)" }, { value: "date-oldest", label: "Date (oldest first)" }]}
        shown={filtered.length} total={rows.length} recordLabel="service records"
      />
      <div className="table-wrap"><table className="table"><thead><tr><th>ID</th><th>Date</th><th>Vehicle</th><th>Customer</th><th>Service</th><th>Mechanic</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>{filtered.map(x => <tr key={x._id}><td>{x.code}</td><td>{x.date}</td><td>{x.vehicle?.registration || "—"}</td><td>{x.vehicle?.customer?.name || "—"}</td><td>{x.service?.name || "—"}</td><td>{x.mechanic?.name || "-"}</td><td>{money(x.total)}</td><td><Status value={x.status} /></td></tr>)}</tbody>
      </table>{!filtered.length && <div className="empty">{rows.length ? "No service records match your search or filters." : "No service history is available yet."}</div>}</div>
    </div>
  </>;
}
