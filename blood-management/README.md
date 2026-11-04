<h1 align="center"> 🩸 BloodLink - Real-Time Blood Bank Management System </h1>

<p align="center">
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</p>

<p align="center">
  <strong>A full-stack MERN application with real-time Socket.io integration, designed to bridge the gap between Blood Donors, Hospitals, Organizations, and Customers seamlessly.</strong>
</p>

---

## 🚀 Live Demo & Deployments
- **Frontend (Vercel):** [https://bloodlink-mern-phi.vercel.app](https://bloodlink-mern-phi.vercel.app)
- **Backend API (Railway):
---

## ✨ Key Features & Core Business Logic

* 🔐 **Role-Based Access Control (RBAC):** Distinct interfaces and operational logic for `Admin`, `Customer`, `Donor`, `Hospital`, and `Organization`.
* 💬 **Real-Time Negotiation Engine:** Integrated **Socket.io** enables live chat between blood Requesters and Organizations to negotiate quantities before approval.
* ⚛️ **Atomic Inventory Transactions:** When blood is allotted, the system executes an atomic transaction—simultaneously deducting the Organization's stock, logging the Transaction history, and updating the Hospital's receiving inventory.
* 🩸 **Smart Global Search:** Enables users to find specific blood groups across all registered facilities, filtered by city and availability.
* 📅 **Donation Scheduling Flow:** Donors can book appointments. Facilities mark them "Completed" to automatically inflate their active blood bank stock.
* 📈 **Admin Analytics Dashboard:** Centralized view of total platform users, live blood stock volumes, and dynamic transaction metrics.

---

## 🛠️ Comprehensive Tech Stack

### 🖥️ Client-Side (Frontend)
| Technology | Description |
| :--- | :--- | 
| **React.js & Router v6** | UI Library for SPA and dynamic nested routing | 
| **Tailwind CSS** | Utility-first CSS framework for rapid responsive layouts | 
| **Material UI (MUI)** | Premium React component library for avatars, badges, and icons |
| **Axios** | Promise-based HTTP client for API requests | 
| **Socket.io-Client** | Client-side library for real-time WebSockets |

### ⚙️ Server-Side (Backend)
| Technology | Description |
| :--- | :--- | 
| **Node.js & Express.js** | Fast, unopinionated web framework and runtime | 
| **MongoDB & Mongoose** | NoSQL Database and Object Data Modeling (ODM) | 
| **Socket.io** | Server library for real-time bidirectional event communication | 
| **JWT & Bcrypt.js** | JSON Web Tokens for secure stateless authentication & password hashing | 

---

## 📂 Exact Project Structure

```text
blood-management/
├── backend/
│   ├── middleware/      
│   │   └── auth.js              # JWT verification & RBAC protection
│   ├── models/                  # Mongoose Schemas (Chat, Inventory, User, etc.)
│   ├── routes/                  # Express API Routes with Inline Logic
│   ├── .env                     # Backend environment variables
│   ├── server.js                # Main Express server entry point
│   └── socket.js                # Socket.io configuration and event listeners
│
└── frontend/
    ├── public/
    │   └── index.html           # Main HTML template
    ├── src/
    │   ├── components/          # Reusable UI components
    │   ├── context/             # Global State Management (Auth, Socket)
    │   ├── pages/               # Application Views (Dashboard, Chat, Inventory)
    │   ├── api.js               # Centralized Axios API configurations
    │   ├── App.js               # React Router DOM setup
    │   ├── index.css            # Global Tailwind styling
    │   └── index.js             # React DOM rendering entry point


