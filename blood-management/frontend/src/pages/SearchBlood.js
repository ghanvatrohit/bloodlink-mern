import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataGrid } from "@mui/x-data-grid";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from "@mui/material";
import toast from "react-hot-toast";
import API, { BLOOD_GROUPS } from "../api";
export default function SearchBlood() {
  const nav = useNavigate();
  const [group, setGroup] = useState("");
  const [rows, setRows] = useState([]);
  const [req, setReq] = useState(null);
  const [qty, setQty] = useState(450);
  const [msg, setMsg] = useState("");
  useEffect(() => { API.get("/inventory/search", { params: { bloodGroup: group || undefined } }).then((r) => setRows(r.data.data.filter((x) => x.owner.role === "organization"))); }, [group]);
  const send = () => API.post("/chat", { organizationId: req.owner._id, bloodGroup: req.bloodGroup, quantity: Number(qty), message: msg || undefined })
    .then((r) => { 
        toast.success(r.data.message); 
        const correctChatId = r.data.chat?._id || r.data.data?.chat?._id || r.data.data?.chatId || r.data.data?._id;
        nav(`/chats?id=${correctChatId}`); 
    }).catch(() => {}); //404 chat not found error
  const cols = [
    { field: "org", headerName: "Organization", flex: 2, valueGetter: (v, r) => r.owner.name },
    { field: "city", headerName: "City", flex: 1, valueGetter: (v, r) => r.owner.city },
    { field: "bloodGroup", headerName: "Group", flex: 1 },
    { field: "quantity", headerName: "Available (ml)", flex: 1 },
    { field: "a", headerName: "", flex: 1, sortable: false, renderCell: (p) => <Button size="small" variant="contained" onClick={() => { setReq(p.row); setQty(Math.min(450, p.row.quantity)); }}>Request via chat</Button> },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="m-0">Search Blood</h2>
        <TextField select size="small" label="Blood group" value={group} onChange={(e) => setGroup(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>{BLOOD_GROUPS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}</TextField></div>
      <div className="bg-white rounded-xl"><DataGrid autoHeight rows={rows} columns={cols} getRowId={(r) => r._id} /></div>
      <Dialog open={!!req} onClose={() => setReq(null)} fullWidth maxWidth="xs">
        <DialogTitle>Request {req?.bloodGroup} from {req?.owner.name}</DialogTitle>
        <DialogContent className="flex flex-col gap-3 !pt-2">
          <TextField label="Quantity (ml)" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          <TextField label="Message (optional)" multiline rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} />
        </DialogContent>
        <DialogActions><Button onClick={() => setReq(null)}>Cancel</Button><Button variant="contained" onClick={send}>Send request</Button></DialogActions>
      </Dialog>
    </div>
  );
}
