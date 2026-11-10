// Keeps the logged-in user available to every page.
//
// Use it in any component:
//   const { user, login, logout } = useAuth();
import { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { refreshLogin, setToken } from '../api/api';
import { connectSocket, disconnectSocket } from '../api/socket';

const AuthContext = createContext(null);

// Shows pop-up messages for live events from the server
function listenForAlerts(socket) {
  socket.on('request:new', (r) => toast.info(`New ${r.urgency} request: ${r.units} units ${r.bloodGroup}`));
  socket.on('request:updated', (r) => toast(`Request ${r.bloodGroup} is now ${r.status}`));
  socket.on('request:volunteer', (d) => toast.success(`${d.donor.name} (${d.donor.bloodGroup}) volunteered!`));
  socket.on('sos:alert', (a) => toast.error(`SOS: ${a.units} units ${a.bloodGroup} needed in ${a.city}`, { autoClose: 15000 }));
  socket.on('inventory:received', (a) => toast.success(`Received ${a.units} units ${a.bloodGroup} from ${a.from}`));
  socket.on('donation:new', () => toast.info('New donation scheduled'));
  socket.on('donation:updated', (d) => toast(`Donation ${d.status}`));
  socket.on('broadcast:alert', (b) => toast.warning(`${b.title}: ${b.body}`, { autoClose: 20000 }));
  socket.on('chat:notify', (m) => {
    if (!window.location.pathname.startsWith('/chat')) {
      toast(`New message from ${m.from}: ${m.text.slice(0, 60)}`);
    }
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "checking" is true while we find out if the user is already logged in
  const [checking, setChecking] = useState(true);

  // Called after login, register or refresh
  function saveLogin(data) {
    setToken(data.accessToken);
    setUser(data.user);
    const socket = connectSocket(data.accessToken);
    listenForAlerts(socket);
  }

  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    saveLogin(response.data);
  }

  async function register(formData) {
    const response = await api.post('/auth/register', formData);
    saveLogin(response.data);
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore errors on logout
    }
    setToken(null);
    setUser(null);
    disconnectSocket();
  }

  // When the app opens, try to restore the last login using the cookie
  useEffect(() => {
    refreshLogin()
      .then((data) => saveLogin(data))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const value = { user, setUser, checking, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
