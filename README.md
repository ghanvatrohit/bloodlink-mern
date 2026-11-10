# LifeFlow — Blood Bank & Donation Management Platform

Enterprise-grade MERN application connecting **Patients, Donors, Hospitals, Blood Banks (Organizations) and Admins** with real-time inventory, request pipelines, 1-on-1 chat and SOS broadcasts.

---

## 1. System Architecture

```text
 ┌──────────────────────────── Browser (React 18 (Create React App)) ────────────────────────────┐
 │  MUI + Tailwind UI │ Redux Toolkit (auth) │ TanStack Query (cache) │ socket.io-client │
 │        Axios ── interceptor: attach access token, auto-refresh on 401             │
 └──────────────┬───────────────────────────────────────────────┬─────────────────────┘
          HTTPS │ REST /api/*  (HttpOnly refresh cookie)        │ WSS (JWT handshake)
 ┌──────────────▼───────────────────────────────────────────────▼─────────────────────┐
 │                         Node.js / Express (Modular MVC)                            │
 │ helmet · cors · rate-limit · morgan→winston · zod validation · RBAC middleware     │
 │  routes → controllers → utils (stock txn, audit) → Mongoose models                 │
 │  Socket.io rooms: user:<id> · role:<r> · city:<c> · donors:<city>:<group> · conv:<id>│
 └──────────────┬─────────────────────────────────────────────────────────────────────┘
                │ Mongoose (transactions require replica set)
 ┌──────────────▼──────────────┐
 │ MongoDB (rs0)               │  Users · BloodInventory · BloodRequest · Donation
 │ 2dsphere + compound indexes │  Conversation · Message · AuditLog (immutable) · Broadcast
 └─────────────────────────────┘
```

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Create React App), React Bootstrap 5, React Router, Axios, socket.io-client, React-Toastify |
| Backend | Node.js 20 LTS, Express 4, Mongoose 8, Socket.io 4, Zod, bcryptjs, jsonwebtoken, helmet, cors, express-rate-limit, multer, morgan, winston |
| Database | MongoDB 7 (replica set for multi-document ACID transactions) |
| Hosting | Railway (API + Socket.io), Vercel (frontend), MongoDB Atlas (database) |

## 3. Folder Structure

```text
backend/src
  config/       env.js, db.js
  models/       User, BloodInventory, BloodRequest, Donation, Conversation, Message, AuditLog, Broadcast
  middleware/   auth (protect/allow), validate, upload, rateLimit, error
  controllers/  auth, user, inventory, request, donation, chat, admin
  routes/       index.js (all REST routes)
  socket/       index.js (JWT handshake, chat, rooms)
  utils/        logger, tokens, validators (zod), stock (FEFO + txn retry), audit, constants
  seed/         seed.js
frontend/src
  api/          client.js (axios + refresh interceptor), socket.js
  store/        Redux auth slice
  hooks/        useRealtime.js (socket → toasts + cache invalidation)
  components/   Layout, SosButton, StatCard, AuthShell
  pages/        Login, Register, Dashboard, Inventory, Requests, NewRequest, Donations, Chat, Admin
```

## 4. Roles & Permissions

### Workflow matrix

| Role | Core workflow |
|---|---|
| Patient / Relative | Register → create request (hospital / blood bank / public donors, with prescription) → track `Pending → Accepted → In-Transit → Fulfilled/Cancelled` → chat with assigned hospital/donors → SOS |
| Donor | Register (group, DOB 18–65, city, eligibility) → toggle Active/Inactive → schedule donation at hospital/org → facility accepts → auto 90-day **Cool-down** → certificate |
| Hospital | Manage inventory batches & expiry → review patient requests (verify prescription) → **atomic allot** → in-transit/fulfilled → request replenishment from blood banks |
| Organization | Cold-storage repository → record walk-in / drive donations → **atomic transfer** to hospitals |
| Admin | Analytics (units, shortages, demographics, emergency heatmap) → CRUD users/inventory → chat moderation → broadcasts → audit log |

### Permission table

| Capability | Patient | Donor | Hospital | Org | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Create blood request | ✅ | — | ✅ (to Org) | — | — |
| SOS broadcast | ✅ | — | ✅ | — | ✅ (broadcast) |
| View/allot incoming requests | — | — | ✅ | ✅ | ✅ |
| Volunteer for public request | — | ✅ | — | — | — |
| Manage own inventory | — | — | ✅ | ✅ | ✅ (all) |
| Transfer stock to hospital | — | — | — | ✅ | — |
| Schedule donation | — | ✅ | — | — | — |
| Accept donation / walk-in | — | — | ✅ | ✅ | — |
| Chat with | Hospital, Donor | Hospital, Org, Patient | Patient, Org, Donor | Donor, Hospital | moderate only |
| User CRUD, moderation, audit | — | — | — | — | ✅ |

## 5. Key Engineering Features

- **Atomic stock reservation** — `utils/stock.js` runs deduction inside `session.withTransaction`, uses Mongoose `optimisticConcurrency` and retries on `TransientTransactionError`/`VersionError`, so two requests for the last unit cannot both succeed (loser gets `409 Insufficient stock`). Units are taken **FEFO** (first-expiry-first-out).
- **SOS** — notifies `donors:<city>:<group>` rooms for every donor group **compatible** with the requested group.
- **Immutable audit logs** — pre-hooks block every update/delete query on `AuditLog`.
- **Cool-down** — accepting a donation sets `availability: Cool-down` + `lastDonationAt`; it auto-reverts to `Active` after 90 days on next `/auth/me`.
- **Token security** — 15-min access token in memory (Redux), 7-day refresh token in HttpOnly cookie scoped to `/api/auth`; `tokenVersion` enables "logout all devices" & instant revocation on block.
- **Auto-moderation** — keyword filter flags messages in real time and pushes them to admins.

## 6. Environment Variables

`backend/.env`

| Key | Example | Description |
|---|---|---|
| NODE_ENV | development | `production` enables secure cookies |
| PORT | 5000 | API port |
| MONGO_URI | mongodb://localhost:27017/bloodbank?replicaSet=rs0 | **Atlas `mongodb+srv` string** (replica set required for transactions) |
| CLIENT_URL | http://localhost:3000 | CORS + Socket.io origin |
| JWT_ACCESS_SECRET | *random 64 chars* | Access token secret |
| JWT_REFRESH_SECRET | *random 64 chars* | Refresh token secret |
| JWT_ACCESS_EXPIRES | 15m | Access TTL |
| JWT_REFRESH_EXPIRES | 7d | Refresh TTL |
| UPLOAD_DIR | uploads | Prescription storage |
| LOW_STOCK_THRESHOLD | 5 | Default threshold |

`frontend/.env`

| Key | Example |
|---|---|
| REACT_APP_API_URL | http://localhost:5000/api |
| REACT_APP_SERVER_URL | http://localhost:5000 |

## 7. Local Setup

```bash
# 1. Create a free MongoDB Atlas cluster (Atlas clusters are replica sets, so transactions work)
#    Atlas → Database Access: add user · Network Access: allow your IP

# 2. Backend
cd backend && cp .env.example .env    # paste your Atlas MONGO_URI + secrets
npm install
npm run seed       # demo accounts, password: Passw0rd!
npm start        # http://localhost:5000

# 3. Frontend
cd ../frontend && cp .env.example .env && npm install
npm start        # http://localhost:3000
```

Seeded logins (password `Passw0rd!`): `admin@`, `hospital@`, `org@`, `donor@`, `patient@` + `bloodbank.io`.

## 8. Deployment (MongoDB Atlas + Railway + Vercel)

### 8.1 MongoDB Atlas
1. Create cluster → **Database Access**: create a user with read/write.
2. **Network Access** → add `0.0.0.0/0` (Railway uses dynamic IPs).
3. Copy the `mongodb+srv://...` connection string, add `/bloodbank` as the DB name.

### 8.2 Backend on Railway
1. Push the repo to GitHub → Railway → **New Project → Deploy from GitHub repo**.
2. Service **Settings → Root Directory**: `backend`. Railway detects Node and runs `npm start` (see `railway.json`, healthcheck `/health`).
3. **Variables**:

| Key | Value |
|---|---|
| NODE_ENV | production |
| MONGO_URI | your Atlas string |
| CLIENT_URL | https://your-app.vercel.app (comma-separate extra origins) |
| JWT_ACCESS_SECRET / JWT_REFRESH_SECRET | long random strings |
| JWT_ACCESS_EXPIRES / JWT_REFRESH_EXPIRES | 15m / 7d |
| UPLOAD_DIR | /data/uploads |

   `PORT` is injected by Railway automatically — don't set it.
4. **Volumes** → add a volume mounted at `/data` so uploaded prescriptions survive redeploys.
5. **Settings → Networking → Generate Domain** → e.g. `https://bloodbank-api.up.railway.app`. WebSockets work out of the box.
6. Seed once: `railway run npm run seed` (Railway CLI) from the `backend` folder.

### 8.3 Frontend on Vercel
1. Vercel → **Add New Project** → import repo → **Root Directory**: `frontend` (Framework: Create React App, output folder: `build`).
2. **Environment Variables**:
   - `REACT_APP_API_URL` = `https://bloodbank-api.up.railway.app/api`
   - `REACT_APP_SERVER_URL` = `https://bloodbank-api.up.railway.app`
3. Deploy. `vercel.json` rewrites all routes to `index.html` so page refreshes work.
4. Copy the Vercel URL back into Railway's `CLIENT_URL` and redeploy the backend.

> Cross-site login: in production the refresh cookie is sent with `Secure; SameSite=None`, which is required because Vercel and Railway are different domains. Both must be HTTPS (they are by default). For the most reliable cookies across browsers, attach a custom domain to both (e.g. `app.example.com` and `api.example.com`).

## 9. REST API Reference

Base: `/api` · Auth: `Authorization: Bearer <accessToken>` · Errors: `{ message, errors? }`

| Method | Endpoint | Role | Body | Response |
|---|---|---|---|---|
| POST | /auth/register | public | name, email, mobile, password, role, city, [bloodGroup, dob, healthEligible, licenseNo] | `{accessToken, user}` + cookie |
| POST | /auth/login | public | email, password | `{accessToken, user}` + cookie |
| POST | /auth/refresh | cookie | — | `{accessToken, user}` |
| POST | /auth/logout | any | — | `{message}` |
| POST | /auth/logout-all | auth | — | `{message}` |
| GET | /auth/me | auth | — | `{user}` |
| GET | /users/facilities?role=&city= | auth | — | `User[]` |
| GET | /users/donors?city=&bloodGroup= | hospital, org, admin | — | `User[]` |
| PATCH | /users/me | auth | name, mobile, city, address, healthEligible | `{user}` |
| PATCH | /users/me/availability | donor | availability: Active\|Inactive | `{user}` |
| GET | /inventory | hospital, org, admin | — | 8 groups with batches, low, expiringSoon |
| GET | /inventory/availability?bloodGroup=&city= | auth | — | network stock |
| POST | /inventory/batches | hospital, org | bloodGroup, units, batchNo, expiresAt, storageUnit | `Inventory` |
| DELETE | /inventory/batches/:batchId | hospital, org | reason | `Inventory` |
| PATCH | /inventory/:group/threshold | hospital, org | threshold | `Inventory` |
| POST | /inventory/transfer | org | hospitalId, bloodGroup, units, [requestId] | `{batches}` |
| POST | /requests (multipart) | patient, hospital | bloodGroup, units, urgency, targetType, target, city, patientName, prescription(file) | `Request` |
| POST | /requests/sos | patient, hospital | bloodGroup, units, city | `Request` |
| GET | /requests?status=&scope= | auth (scoped) | — | `Request[]` |
| GET | /requests/:id | auth | — | `Request` |
| POST | /requests/:id/allot | hospital, org (target) | verified | `Request` (Accepted) |
| PATCH | /requests/:id/status | owner/handler/admin | status, note | `Request` |
| POST | /requests/:id/volunteer | donor | — | `Request` |
| POST | /donations | donor | facilityId, scheduledAt, driveName | `Donation` |
| POST | /donations/walk-in | hospital, org | donorEmail, driveName | `Donation` (Accepted) |
| GET | /donations | donor, hospital, org | — | `Donation[]` |
| PATCH | /donations/:id | hospital, org | decision: Accepted\|Rejected | `Donation` |
| GET | /donations/:id/certificate | donor | — | certificate JSON |
| GET | /chat/contacts?q= | auth | — | allowed contacts |
| GET | /chat/conversations | auth | — | `Conversation[]` |
| POST | /chat/conversations | auth | userId | `Conversation` |
| GET | /chat/conversations/:id/messages?before= | participant, admin | — | `Message[]` (50) |
| POST | /chat/messages/:id/flag | participant | reason | `{message}` |
| GET | /broadcasts | auth | — | `Broadcast[]` |
| GET | /admin/stats | admin | — | analytics aggregate |
| GET/POST | /admin/users | admin | user fields | list `{rows,total}` / `User` |
| PATCH/DELETE | /admin/users/:id | admin | fields (isBlocked, isVerified…) | `User` / `{message}` |
| GET | /admin/inventory | admin | — | `Inventory[]` |
| PATCH | /admin/inventory/:id | admin | threshold | `Inventory` |
| GET | /admin/messages?q=&flagged= | admin | — | `Message[]` |
| DELETE | /admin/messages/:id | admin | — | `{message}` |
| POST | /admin/broadcasts | admin | title, body, type, city, bloodGroup | `Broadcast` |
| GET | /admin/audit-logs?action=&page= | admin | — | `AuditLog[]` |

## 10. Socket.io Events

Connect with `io(URL, { auth: { token: accessToken } })`.

| Direction | Event | Payload | Purpose |
|---|---|---|---|
| client → server | `chat:join` | conversationId | Join conversation room |
| client → server | `chat:send` | `{conversationId, text}`, ack | Send message |
| client → server | `chat:typing` | `{conversationId}` | Typing indicator |
| client → server | `chat:read` | `{conversationId}` | Mark read |
| server → client | `chat:message` | Message | New message in room |
| server → client | `chat:notify` | `{conversationId, text, from}` | Inbox notification |
| server → client | `chat:typing` / `chat:read` / `chat:deleted` | … | Chat state |
| server → client | `request:new` | Request | New request for facility |
| server → client | `request:updated` | Request | Status change |
| server → client | `request:volunteer` | `{requestId, donor}` | Donor volunteered |
| server → client | `sos:alert` | `{requestId, bloodGroup, units, city, urgency}` | To compatible donors in city |
| server → client | `sos:broadcast` | `{requestId, bloodGroup, city}` | City-wide SOS |
| server → client | `inventory:updated` / `inventory:received` | … | Stock changes |
| server → client | `donation:new` / `donation:updated` | Donation | Donation lifecycle |
| server → client | `broadcast:alert` | Broadcast | Admin alert |
| server → client | `moderation:flagged` | Message | Admin moderation feed |
| server → client | `presence:online` / `presence:offline` | `{userId}` | Presence |

## 11. Security Checklist

- bcrypt (cost 12) password hashing; strict regex for email, 10-digit Indian mobile, strong password
- Zod validation on every write; ObjectId regex checks
- helmet headers, CORS allow-list, rate limits (500/15m API, 20/15m auth)
- HttpOnly + SameSite refresh cookie; refresh rotation; token versioning
- Upload filter (PDF/JPG/PNG, 5 MB)
- RBAC enforced on API **and** client routes
