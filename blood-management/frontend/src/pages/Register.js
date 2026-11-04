import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TextField, Button, MenuItem, ToggleButtonGroup, ToggleButton } from "@mui/material";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { BLOOD_GROUPS } from "../api";
export default function Register() {
  const { register } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ role: "customer", name: "", email: "", password: "", phone: "", city: "", address: "", bloodGroup: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const personal = ["customer", "donor"].includes(f.role);
  const submit = (e) => { e.preventDefault(); register({ ...f, bloodGroup: f.bloodGroup || undefined }).then(() => nav("/")).catch(() => {}); };
  return (
    <AuthShell title="Create your account">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <ToggleButtonGroup exclusive size="small" value={f.role} onChange={(e, v) => v && setF({ ...f, role: v })} className="flex-wrap">
          {["customer", "donor", "hospital", "organization"].map((r) => <ToggleButton key={r} value={r}>{r === "customer" ? "Patient" : r}</ToggleButton>)}
        </ToggleButtonGroup>
        <TextField size="small" label={personal ? "Full name" : f.role === "hospital" ? "Hospital name" : "Organization name"} required value={f.name} onChange={set("name")} />
        <TextField size="small" label="Email" type="email" required value={f.email} onChange={set("email")} />
        <TextField size="small" label="Password" type="password" required inputProps={{ minLength: 6 }} value={f.password} onChange={set("password")} />
        <div className="flex gap-3">
          <TextField size="small" label="Phone" fullWidth value={f.phone} onChange={set("phone")} />
          <TextField size="small" label="City" fullWidth required value={f.city} onChange={set("city")} />
        </div>
        <TextField size="small" label="Address" value={f.address} onChange={set("address")} />
        {personal && <TextField size="small" select label="Blood group" required={f.role === "donor"} value={f.bloodGroup} onChange={set("bloodGroup")}>
          {BLOOD_GROUPS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}</TextField>}
        <Button type="submit" variant="contained" size="large">Register</Button>
        <p className="text-sm text-center">Have an account? <Link to="/login">Login</Link></p>
      </form>
    </AuthShell>
  );
}
