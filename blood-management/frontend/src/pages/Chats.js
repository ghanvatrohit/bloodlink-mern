import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Avatar, Button, Chip, IconButton, TextField } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import toast from "react-hot-toast";
import API from "../api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
const COLORS = { pending: "warning", negotiating: "info", confirmed: "secondary", allotted: "success", rejected: "error" };
export default function Chats() {
  const { user } = useAuth(); const { socket } = useSocket();
  const [params, setParams] = useSearchParams();
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const bottom = useRef();
  const activeId = params.get("id");

  useEffect(() => { API.get("/chat").then((r) => setChats(r.data.data)); }, []);
  useEffect(() => {
    if (!activeId) return;
    API.get(`/chat/${activeId}/messages`).then((r) => { setActive(r.data.chat); setMsgs(r.data.data); });
    socket?.emit("join_chat", activeId);
    return () => socket?.emit("leave_chat", activeId);
  }, [activeId, socket]);
  useEffect(() => {
    if (!socket) return;
    const onMsg = (m) => m.chat === activeId && setMsgs((p) => (p.some((x) => x._id === m._id) ? p : [...p, m]));
    const onChat = (c) => { setChats((p) => [c, ...p.filter((x) => x._id !== c._id)]); if (c._id === activeId) setActive(c); };
    const onTyping = ({ chatId }) => { if (chatId === activeId) { setTyping(true); setTimeout(() => setTyping(false), 1500); } };
    socket.on("new_message", onMsg); socket.on("chat_updated", onChat); socket.on("typing", onTyping);
    return () => { socket.off("new_message", onMsg); socket.off("chat_updated", onChat); socket.off("typing", onTyping); };
  }, [socket, activeId]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]); //{}

  const send = (e) => { e?.preventDefault(); if (!text.trim()) return; API.post(`/chat/${activeId}/messages`, { text }).then((r) => { setMsgs((p) => (p.some((x) => x._id === r.data.data._id) ? p : [...p, r.data.data])); setText(""); }); };
  const act = (path, method = "patch") => API[method](`/chat/${activeId}/${path}`).then((r) => toast.success(r.data.message)).catch(() => { });
  const isOrg = user.role === "organization";
  const other = (c) => (isOrg ? c.requester : c.organization);
  const closed = ["allotted", "rejected"].includes(active?.status);

  return (
    <div className="bg-white rounded-xl shadow flex h-[calc(100vh-130px)] overflow-hidden">
      <div className={`w-full md:w-80 border-r flex-col ${activeId ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 bg-gray-100 font-semibold">{isOrg ? "Incoming requests" : "My requests"}</div>
        <div className="overflow-y-auto flex-1">
          {chats.length === 0 && <p className="p-4 text-gray-500">No conversations yet.</p>}
          {chats.map((c) => (
            <div key={c._id} onClick={() => setParams({ id: c._id })}
              className={`p-3 flex gap-3 items-center cursor-pointer border-b hover:bg-gray-50 ${c._id === activeId ? "bg-red-50" : ""}`}>
              <Avatar sx={{ bgcolor: "primary.main" }}>{c.bloodGroup}</Avatar>
              <div className="flex-1 min-w-0"><p className="m-0 font-medium truncate">{other(c)?.name}</p><p className="m-0 text-xs text-gray-500">{c.quantity} ml · {new Date(c.lastMessageAt).toLocaleString()}</p></div>
              <Chip size="small" label={c.status} color={COLORS[c.status]} />
            </div>))}
        </div>
      </div>
      <div className={`flex-1 flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
        {!active ? <div className="flex-1 flex items-center justify-center text-gray-400 chat-bg">Select a conversation</div> : <>
          <div className="p-3 bg-gray-100 flex flex-wrap items-center gap-3">
            <Button size="small" className="md:!hidden" onClick={() => setParams({})}>←</Button>
            <Avatar sx={{ bgcolor: "secondary.main" }}>{other(active)?.name?.[0]}</Avatar>
            <div className="flex-1"><p className="m-0 font-semibold">{other(active)?.name}</p><p className="m-0 text-xs text-gray-500">{typing ? "typing…" : `Request: ${active.quantity} ml of ${active.bloodGroup}`}</p></div>
            <Chip label={active.status} color={COLORS[active.status]} />
            {!isOrg && !active.requesterConfirmed && !closed && active.status !== "pending" && <Button variant="outlined" size="small" onClick={() => act("confirm")}>Confirm Transaction</Button>}
            {isOrg && !closed && <>
              <Button variant="contained" color="success" size="small" disabled={!active.requesterConfirmed} onClick={() => act("allot", "post")}>Allot Blood</Button>
              <Button color="error" size="small" onClick={() => act("reject")}>Decline</Button></>}
          </div>
          {active.status === "allotted" && <div className="bg-green-100 text-green-800 text-center py-2 font-semibold">✅ Blood Allotted Successfully</div>}
          {isOrg && !active.requesterConfirmed && !closed && <div className="bg-amber-50 text-amber-800 text-center py-1 text-sm">Waiting for requester to confirm before allotting.</div>}
          <div className="flex-1 overflow-y-auto p-4 chat-bg space-y-2">
            {msgs.map((m) => m.type === "system"
              ? <div key={m._id} className="text-center"><span className="bg-yellow-100 text-gray-700 text-xs px-3 py-1 rounded-lg shadow-sm">{m.text}</span></div>
              : <div key={m._id} className={`flex ${m.sender?._id === user._id ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${m.sender?._id === user._id ? "bg-green-100" : "bg-white"}`}>
                  <p className="m-0 whitespace-pre-wrap">{m.text}</p>
                  <p className="m-0 text-[10px] text-gray-500 text-right">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div></div>)}
            <div ref={bottom} />
          </div>
          {isOrg && !closed && <div className="px-3 pt-2 flex gap-2 flex-wrap bg-gray-50">
            {[`Yes, ${active.quantity} ml of ${active.bloodGroup} is available. Please confirm the transaction.`, "Sorry, we only have a partial quantity available."].map((q) =>
              <Chip key={q} label={q} size="small" variant="outlined" onClick={() => setText(q)} />)}</div>}
          <form onSubmit={send} className="p-3 bg-gray-50 flex gap-2">
            <TextField fullWidth size="small" placeholder={closed ? "This conversation is closed" : "Type a message"} disabled={closed}
              value={text} onChange={(e) => { setText(e.target.value); socket?.emit("typing", { chatId: activeId }); }} sx={{ bgcolor: "white" }} />
            <IconButton type="submit" color="primary" disabled={closed}><SendIcon /></IconButton>
          </form></>}
      </div>
    </div>
  );
}
