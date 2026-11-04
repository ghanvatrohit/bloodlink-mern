import { Routes, Route, Navigate } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import SearchBlood from "./pages/SearchBlood";
import Chats from "./pages/Chats";
import History from "./pages/History";
import Donations from "./pages/Donations";
import Facilities from "./pages/Facilities";
import AdminUsers from "./pages/AdminUsers";

const Private = ({ roles, children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center"><CircularProgress /></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
};
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Private><Layout /></Private>}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Private roles={["hospital", "organization"]}><Inventory /></Private>} />
        <Route path="search" element={<Private roles={["customer", "hospital"]}><SearchBlood /></Private>} />
        <Route path="chats" element={<Private roles={["customer", "hospital", "organization"]}><Chats /></Private>} />
        <Route path="history" element={<History />} />
        <Route path="donations" element={<Private roles={["donor", "hospital", "organization"]}><Donations /></Private>} />
        <Route path="facilities" element={<Private roles={["donor", "customer"]}><Facilities /></Private>} />
        <Route path="admin/users" element={<Private roles={["admin"]}><AdminUsers /></Private>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
