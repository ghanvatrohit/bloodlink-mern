import { NavLink, Outlet } from "react-router-dom";
import { Badge, Button, Avatar, Chip } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const MENU = {
  customer: [["/", "Dashboard"], ["/search", "Search Blood"], ["/chats", "Chats"], ["/history", "Allotment History"], ["/facilities", "Hospitals & Orgs"]],
  donor: [["/", "Dashboard"], ["/donations", "My Donations"], ["/facilities", "Nearby Centres"]],
  hospital: [["/", "Dashboard"], ["/inventory", "Inventory"], ["/search", "Request Blood"], ["/chats", "Chats"], ["/donations", "Donations"], ["/history", "Transactions"]],
  organization: [["/", "Dashboard"], ["/inventory", "Inventory"], ["/chats", "Requests & Chats"], ["/donations", "Donations"], ["/history", "Transactions"]],
  admin: [["/", "Analytics"], ["/admin/users", "Manage Users"], ["/history", "Transactions"]],
};
export default function Layout() {
  const { user, logout } = useAuth();
  const { unread, clearUnread } = useSocket();
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-64 bg-gray-900 text-gray-100 flex md:flex-col">
        <div className="p-5 text-xl font-bold text-red-400">🩸 BloodLink</div>
        <nav className="flex md:flex-col overflow-x-auto flex-1">
          {MENU[user.role].map(([to, label]) => (
            <NavLink key={to} to={to} end onClick={to === "/chats" ? clearUnread : undefined}
              className={({ isActive }) => `px-5 py-3 no-underline whitespace-nowrap ${isActive ? "bg-red-700 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
              {label}
            </NavLink>))}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-end gap-4">
          <Badge badgeContent={unread} color="primary"><ChatIcon color="action" /></Badge>
          <Chip label={user.role} size="small" color="primary" variant="outlined" />
          <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>{user.name[0]}</Avatar>
          <span className="hidden sm:inline font-medium">{user.name}</span>
          <Button size="small" onClick={logout}>Logout</Button>
        </header>
        <div className="p-4 md:p-6 flex-1"><Outlet /></div>
      </main>
    </div>
  );
}
