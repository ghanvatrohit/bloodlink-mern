import { useEffect, useState } from "react";
import { Card, CardContent, LinearProgress } from "@mui/material";
import API from "../api";
import { useAuth } from "../context/AuthContext";
const Stat = ({ label, value }) => (
  <Card><CardContent><p className="text-gray-500 text-sm m-0">{label}</p><p className="text-3xl font-bold text-red-700 m-0 mt-1">{value}</p></CardContent></Card>
);
export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  useEffect(() => {
    if (user.role === "admin") API.get("/admin/analytics").then((r) => setD(r.data.data));
    else if (["hospital", "organization"].includes(user.role)) API.get("/inventory").then((r) => setD({ stock: r.data.data.map((i) => ({ _id: i.bloodGroup, total: i.quantity })) }));
    else if (user.role === "donor") API.get("/donations").then((r) => setD({ donations: r.data.data }));
    else API.get("/chat/transactions/history").then((r) => setD({ tx: r.data.data }));
  }, [user.role]);
  if (!d) return <LinearProgress />;
  const max = Math.max(1, ...(d.stock || []).map((s) => s.total));
  return (
    <div className="space-y-6">
      <h2 className="m-0">Welcome, {user.name}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {user.role === "admin" && <>
          {d.roles.map((r) => <Stat key={r._id} label={`${r._id}s`} value={r.count} />)}
          <Stat label="Transactions" value={d.txCount} /><Stat label="Blood allotted (ml)" value={d.txVolume} /><Stat label="Completed donations" value={d.donations} />
        </>}
        {user.role === "donor" && <>
          <Stat label="Total donations" value={d.donations.filter((x) => x.status === "completed").length} />
          <Stat label="Upcoming" value={d.donations.filter((x) => x.status === "scheduled").length} />
          <Stat label="Blood group" value={user.bloodGroup || "-"} />
        </>}
        {user.role === "customer" && <><Stat label="Allotments received" value={d.tx.length} /><Stat label="Total ml received" value={d.tx.reduce((a, t) => a + t.quantity, 0)} /></>}
        {d.stock && user.role !== "admin" && <Stat label="Total stock (ml)" value={d.stock.reduce((a, s) => a + s.total, 0)} />}
      </div>
      {d.stock && d.stock.length > 0 && (
        <Card><CardContent>
          <h3 className="mt-0">Blood stock by group (ml)</h3>
          {d.stock.map((s) => (
            <div key={s._id} className="flex items-center gap-3 mb-2">
              <span className="w-10 font-bold">{s._id}</span>
              <div className="flex-1 bg-gray-100 rounded h-5"><div className="bg-red-600 h-5 rounded" style={{ width: `${(s.total / max) * 100}%` }} /></div>
              <span className="w-16 text-right">{s.total}</span>
            </div>))}
        </CardContent></Card>)}
    </div>
  );
}
