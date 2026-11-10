// All pages (routes) of the app are listed here.
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Requests from './pages/Requests';
import NewRequest from './pages/NewRequest';
import Donations from './pages/Donations';
import Chat from './pages/Chat';
import Admin from './pages/Admin';

// Only lets the user in if logged in (and has one of the allowed roles)
function PrivateRoute({ roles, children }) {
  const { user, checking } = useAuth();

  if (checking) {
    return (
      <div className="d-flex vh-100 align-items-center justify-content-center">
        <Spinner animation="border" variant="danger" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

const FACILITY = ['hospital', 'organization'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Pages below share the menu (Layout) and need login */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<PrivateRoute roles={FACILITY}><Inventory /></PrivateRoute>} />
        <Route path="/requests" element={<PrivateRoute roles={['patient', 'donor', ...FACILITY]}><Requests /></PrivateRoute>} />
        <Route path="/requests/new" element={<PrivateRoute roles={['patient', 'hospital']}><NewRequest /></PrivateRoute>} />
        <Route path="/donations" element={<PrivateRoute roles={['donor', ...FACILITY]}><Donations /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute roles={['patient', 'donor', ...FACILITY]}><Chat /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute roles={['admin']}><Admin /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
