import { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import API from "../api";
import { useAuth } from "../context/AuthContext";
export default function History() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  useEffect(() => { API.get(user.role === "admin" ? "/admin/transactions" : "/chat/transactions/history").then((r) => setRows(r.data.data)); }, [user.role]);
  const cols = [
    { field: "createdAt", headerName: "Date", flex: 1, valueFormatter: (v) => new Date(v).toLocaleString() },
    { field: "from", headerName: "From", flex: 1, valueGetter: (v) => v?.name },
    { field: "to", headerName: "To", flex: 1, valueGetter: (v) => v?.name },
    { field: "bloodGroup", headerName: "Group", width: 90 },
    { field: "quantity", headerName: "Qty (ml)", width: 100 },
    { field: "status", headerName: "Status", width: 100 },
  ];
  return <div className="space-y-4"><h2 className="m-0">Allotment / Transaction History</h2>
    <div className="bg-white rounded-xl"><DataGrid autoHeight rows={rows} columns={cols} getRowId={(r) => r._id} /></div></div>;
}
