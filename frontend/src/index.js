// This is the starting point of the React app.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

// Styles from libraries first, then our own styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

import { AuthProvider } from './context/AuthContext';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <BrowserRouter>
    <AuthProvider>
      <App />
      {/* Shows the small pop-up messages (toasts) */}
      <ToastContainer position="top-right" autoClose={4000} />
    </AuthProvider>
  </BrowserRouter>
);
