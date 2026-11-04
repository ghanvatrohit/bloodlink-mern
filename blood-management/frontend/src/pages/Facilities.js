import { useEffect, useState } from "react";
import { Card, CardContent, Chip, TextField } from "@mui/material";
import API from "../api";
import { useAuth } from "../context/AuthContext";
export default function Facilities() {
  const { user } = useAuth();
  const [city, setCity] = useState(user.city || "");
  const [list, setList] = useState([]);
  useEffect(() => { const t = setTimeout(() => API.get("/users/facilities", { params: { city } }).then((r) => setList(r.data.data)), 300); return () => clearTimeout(t); }, [city]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="m-0">Nearby Hospitals & Organizations</h2>
        <TextField size="small" label="Filter by city" value={city} onChange={(e) => setCity(e.target.value)} /></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((f) => <Card key={f._id}><CardContent>
          <div className="flex justify-between items-start"><h3 className="m-0">{f.name}</h3><Chip size="small" label={f.role} color={f.role === "hospital" ? "secondary" : "primary"} /></div>
          <p className="text-gray-600 mb-0">{f.address}, {f.city}</p><p className="text-gray-600 m-0">📞 {f.phone || "-"} · ✉️ {f.email}</p>
        </CardContent></Card>)}
        {list.length === 0 && <p className="text-gray-500">No facilities found.</p>}
      </div>
    </div>
  );
}
