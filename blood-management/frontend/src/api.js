import axios from "axios";
import toast from "react-hot-toast";
const API = axios.create({ baseURL: process.env.REACT_APP_BASE_URL });
API.interceptors.request.use((c) => { const t = localStorage.getItem("token"); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
API.interceptors.response.use((r) => r, (err) => {
  toast.error(err.response?.data?.message || err.message || "Request failed");
  if (err.response?.status === 401) { localStorage.removeItem("token"); }
  return Promise.reject(err);
});
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export default API;
