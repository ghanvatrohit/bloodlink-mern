import { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { IconButton, TextField, MenuItem, Button } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import toast from "react-hot-toast";
import API from "../api";

const ROLES = ["customer", "donor", "hospital", "organization", "admin"];

export default function AdminUsers() {
  const [rows, setRows] = useState([]); 
  const [role, setRole] = useState("");

  const load = () => API.get("/admin/users", { params: { role: role || undefined } }).then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, [role]); // eslint-disable-line
  
  const update = (row) => API.put(`/admin/users/${row._id}`, row).then((r) => { toast.success(r.data.message); return r.data.data; });
  const del = (id) => window.confirm("Delete this user?") && API.delete(`/admin/users/${id}`).then((r) => { toast.success(r.data.message); load(); });

  // NEW LOGIC FOR CLEARING STORAGE (512MB Limit)
  const handleBulkDelete = async (endpoint, itemType) => {
    const confirmDelete = window.confirm(`Kya aap sach mein sabhi ${itemType} delete karna chahte hain? Yeh action wapas nahi hoga!`);
    if (!confirmDelete) return;

    try {
      const { data } = await API.delete(`/admin/${endpoint}`);
      if (data.success) {
        toast.success(data.message);
        if (itemType === "Users") load(); // Agar users delete kiye hain toh table reload karein
      }
    } catch (error) {
      toast.error("Delete karne mein error aaya!");
      console.log(error);
    }
  };

  const cols = [
    { field: "name", headerName: "Name", flex: 1, editable: true }, { field: "email", headerName: "Email", flex: 1.5 },
    { field: "role", headerName: "Role", flex: 1, editable: true, type: "singleSelect", valueOptions: ROLES },
    { field: "city", headerName: "City", flex: 1, editable: true }, { field: "phone", headerName: "Phone", flex: 1, editable: true },
    { field: "bloodGroup", headerName: "Group", width: 80 },
    { field: "a", headerName: "", width: 70, sortable: false, renderCell: (p) => <IconButton onClick={() => del(p.row._id)}><DeleteIcon color="error" /></IconButton> },
  ];

  return (
    <div className="space-y-6">
      
      {/* STORAGE MANAGEMENT SECTION */}
      <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm flex flex-col gap-3">
        
        <div className="flex flex-wrap gap-3 mt-2">
          <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={() => handleBulkDelete("clear-chats", "Chats")}>
            Clear All Chats
          </Button>
          <Button variant="contained" color="warning" startIcon={<DeleteIcon />} onClick={() => handleBulkDelete("clear-inventory", "Inventory")}>
            Clear All Inventory
          </Button>
          <Button variant="contained" color="secondary" startIcon={<DeleteIcon />} onClick={() => handleBulkDelete("clear-users", "Users")}>
            Delete All Users (Admin Safe)
          </Button>
        </div>
      </div>

      {/* EXISTING USER MANAGEMENT TABLE */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="m-0">Manage Users</h2>
        <TextField select size="small" label="Role" value={role} onChange={(e) => setRole(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>{ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
      </div>
      <p className="text-sm text-gray-500 m-0">Double-click a cell to edit. Change role to "admin" to promote a user.</p>
      <div className="bg-white rounded-xl">
        <DataGrid autoHeight rows={rows} columns={cols} getRowId={(r) => r._id} processRowUpdate={update} onProcessRowUpdateError={() => {}} />
      </div>

    </div>
  );
}