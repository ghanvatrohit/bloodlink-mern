import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";

const Ctx = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const s = io(process.env.REACT_APP_SOCKET_URL, { auth: { token: localStorage.getItem("token") } });
    
    // Default notifications (Allotment, etc)
    s.on("notification", (n) => { 
      setUnread((u) => u + 1); 
      n.type === "allotted" ? toast.success(n.text) : toast(n.text, { icon: "🩸" }); 
    });

    // NAYA CODE: Normal chat messages ke liye badge counter badhayein
    s.on("new_message", (m) => {
      // Agar sender hum khud nahi hain, tabhi count badhao
      if (m.sender?._id !== user._id) {
        setUnread((u) => u + 1);
      }
    });

    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  return <Ctx.Provider value={{ socket, unread, clearUnread: () => setUnread(0) }}>{children}</Ctx.Provider>;
};

export const useSocket = () => useContext(Ctx);