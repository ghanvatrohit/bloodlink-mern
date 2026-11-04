import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TextField, Button } from "@mui/material";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
export default function Login() {
  const { login } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ email: "", password: "" });
  const submit = (e) => { e.preventDefault(); login(f).then(() => nav("/")).catch(() => {}); };
  return (
    <AuthShell title="Sign in to your account">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField label="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <TextField label="Password" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <Button type="submit" variant="contained" size="large">Login</Button>
        <p className="text-sm text-center">No account? <Link to="/register">Register</Link></p>
      </form>
    </AuthShell>
  );
}
