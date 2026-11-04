import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import API from "../api";
const Ctx = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem("token")) return setLoading(false);
    API.get("/auth/me").then((r) => setUser(r.data.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const handle = (r) => { localStorage.setItem("token", r.data.token); setUser(r.data.user); toast.success(r.data.message); return r.data.user; };
  const login = (d) => API.post("/auth/login", d).then(handle);
  const register = (d) => API.post("/auth/register", d).then(handle);
  const logout = () => { localStorage.removeItem("token"); setUser(null); toast.success("Logged out"); };
  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
};
export const useAuth = () => useContext(Ctx);
