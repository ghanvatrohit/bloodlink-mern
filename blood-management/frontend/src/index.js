import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import "./index.css";

const theme = createTheme({ palette: { primary: { main: "#c81e1e" }, secondary: { main: "#1f2937" } }, shape: { borderRadius: 10 } });
ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider theme={theme}><CssBaseline />
    <BrowserRouter><AuthProvider><SocketProvider><App /><Toaster position="top-right" /></SocketProvider></AuthProvider></BrowserRouter>
  </ThemeProvider>
);
