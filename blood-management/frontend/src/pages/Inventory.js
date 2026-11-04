import { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import toast from "react-hot-toast";
import API, { BLOOD_GROUPS } from "../api";
export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ bloodGroup: "A+", quantity: "", expiryDate: "" });
  const load = () => API.get("/inventory").then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, []);
  const add = () => API.post("/inventory", f).then((r) => { toast.success(r.data.message); setOpen(false); load(); }).catch(() => {});
  const update = (row) => API.put(`/inventory/${row._id}`, { quantity: Number(row.quantity) }).then((r) => { toast.success(r.data.message); return row; });
  const del = (id) => window.confirm("Delete this record?") && API.delete(`/inventory/${id}`).then((r) => { toast.success(r.data.message); load(); });
  const cols = [
    { field: "bloodGroup", headerName: "Blood Group", flex: 1 },
    { field: "quantity", headerName: "Quantity (ml) – double-click to edit", flex: 2, editable: true, type: "number" },
    { field: "expiryDate", headerName: "Expiry", flex: 1, valueFormatter: (v) => (v ? new Date(v).toLocaleDateString() : "-") },
    { field: "updatedAt", headerName: "Updated", flex: 1, valueFormatter: (v) => new Date(v).toLocaleString() },
    { field: "actions", headerName: "", width: 70, sortable: false, renderCell: (p) => <IconButton onClick={() => del(p.row._id)}><DeleteIcon color="error" /></IconButton> },
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="m-0">Blood Inventory</h2><Button variant="contained" onClick={() => setOpen(true)}>Add Stock</Button></div>
      <div className="bg-white rounded-xl"><DataGrid autoHeight rows={rows} columns={cols} getRowId={(r) => r._id} processRowUpdate={update} onProcessRowUpdateError={() => {}} /></div>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Stock</DialogTitle>
        <DialogContent className="flex flex-col gap-3 !pt-2">
          <TextField select label="Blood group" value={f.bloodGroup} onChange={(e) => setF({ ...f, bloodGroup: e.target.value })}>{BLOOD_GROUPS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}</TextField>
          <TextField label="Quantity (ml)" type="number" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
          <TextField label="Expiry date" type="date" InputLabelProps={{ shrink: true }} value={f.expiryDate} onChange={(e) => setF({ ...f, expiryDate: e.target.value })} />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={add} disabled={!f.quantity}>Save</Button></DialogActions>
      </Dialog>
    </div>
  );
}
