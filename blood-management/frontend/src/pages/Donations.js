import { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from "@mui/material";
import toast from "react-hot-toast";
import API from "../api";
import { useAuth } from "../context/AuthContext";
export default function Donations() {
  const { user } = useAuth(); const isDonor = user.role === "donor";
  const [rows, setRows] = useState([]); const [fac, setFac] = useState([]);
  const [open, setOpen] = useState(false); const [f, setF] = useState({ facilityId: "", date: "", quantity: 450 });
  const load = () => API.get("/donations").then((r) => setRows(r.data.data));
  useEffect(() => { load(); if (isDonor) API.get("/users/facilities").then((r) => setFac(r.data.data)); }, [isDonor]);
  const act = (id, a) => API.patch(`/donations/${id}/${a}`).then((r) => { toast.success(r.data.message); load(); });
  const save = () => API.post("/donations", f).then((r) => { toast.success(r.data.message); setOpen(false); load(); }).catch(() => {});
  const cols = [
    { field: "date", headerName: "Date", flex: 1, valueFormatter: (v) => new Date(v).toLocaleDateString() },
    isDonor ? { field: "facility", headerName: "Centre", flex: 2, valueGetter: (v) => v?.name } : { field: "donor", headerName: "Donor", flex: 2, valueGetter: (v) => v?.name },
    { field: "bloodGroup", headerName: "Group", width: 90 }, { field: "quantity", headerName: "ml", width: 90 }, { field: "status", headerName: "Status", width: 110 },
    { field: "a", headerName: "", flex: 1, sortable: false, renderCell: (p) => p.row.status === "scheduled" && <>
      {!isDonor && <Button size="small" color="success" onClick={() => act(p.row._id, "complete")}>Complete</Button>}
      <Button size="small" color="error" onClick={() => act(p.row._id, "cancel")}>Cancel</Button></> },
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="m-0">{isDonor ? "My Donations" : "Donor Appointments"}</h2>
        {isDonor && <Button variant="contained" onClick={() => setOpen(true)}>Register to Donate</Button>}</div>
      <div className="bg-white rounded-xl"><DataGrid autoHeight rows={rows} columns={cols} getRowId={(r) => r._id} /></div>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Schedule a donation</DialogTitle>
        <DialogContent className="flex flex-col gap-3 !pt-2">
          <TextField select label="Hospital / Organization" value={f.facilityId} onChange={(e) => setF({ ...f, facilityId: e.target.value })}>
            {fac.map((x) => <MenuItem key={x._id} value={x._id}>{x.name} ({x.city})</MenuItem>)}</TextField>
          <TextField type="date" label="Date" InputLabelProps={{ shrink: true }} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <TextField type="number" label="Quantity (ml)" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" disabled={!f.facilityId || !f.date} onClick={save}>Schedule</Button></DialogActions>
      </Dialog>
    </div>
  );
}
