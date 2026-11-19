# 📌 NovaTask — Collaborative Project Management Tool

> **CodeAlpha Full Stack Development Internship — Project 2 (Task 3)**

NovaTask is a production-grade, collaborative project management and real-time Kanban board application inspired by **Linear**, **Asana**, and **Trello**. Built with the modern MERN stack and Socket.io, it delivers real MongoDB Atlas cloud persistence, JWT authentication with role-based access control, interactive drag-and-drop workflow columns, live discussion threads, activity audit logs, and instant WebSocket updates across team members.

---

## ✨ Core Features by Development Phase

| Phase | Milestone | Capabilities Delivered |
|:---|:---|:---|
| **Phase 1** | **Foundation & Auth** | Node.js + Express REST API on port `5002`, React 19 + Vite + Tailwind CSS v4 on port `3001`, MongoDB Atlas cloud connection (`readyState = 1`), JWT Bearer tokens, bcryptjs password hashing, live status indicator badges in navbar. |
| **Phase 2** | **Project Lifecycle & Access** | Create, edit, and delete projects; customizable accent color palettes; target due dates; user search; project member invitations with role-based permissions (`owner`, `admin`, `member`, `viewer`). |
| **Phase 3** | **Task Management (CRUD)** | Create, edit, and delete tasks; multi-assignee team member assignment; 4-tier priorities (`Low`, `Medium`, `High`, `Urgent`); deadlines; tagging support. |
| **Phase 4** | **Interactive Kanban Board** | 4-column agile board (`To Do`, `In Progress`, `In Review`, `Done`) powered by `@hello-pangea/dnd` with smooth drag-and-drop transitions, column task counters, and optimistic updates. |
| **Phase 5** | **Discussion & Activity Trail** | Nested task comment threads with author badges and relative timestamps; automated audit logs tracking status transitions and member changes. |
| **Phase 6** | **Real-Time Sync (Socket.io)** | Dedicated project WebSocket rooms (`join:project`, `leave:project`); instantaneous task creation, drag moves, deletions, and comments broadcast across all open collaborator tabs. |
| **Phase 7** | **Search, Filters & Analytics** | Real-time title/description/tag search; priority and assignee dropdown filters; overdue task indicator with animated alerts; dynamic project progress bar. |

---

## 🛠️ Technology Stack

| Layer | Technologies |
|:---|:---|
| **Frontend** | React 19, Vite v8, Tailwind CSS v4, Lucide React, React Router v7, `@hello-pangea/dnd`, Axios, Socket.io Client |
| **Backend** | Node.js, Express.js (REST API, CORS), Socket.io v4 |
| **Database** | MongoDB Atlas (Mongoose v8 ODM) — **Real cloud persistence** |
| **Authentication** | JSON Web Tokens (JWT) + bcryptjs password hashing |
| **Real-Time Engine**| WebSockets via Socket.io |

---

## 📁 Project Architecture

```text
02-project-management-tool/
├── client/                         # React Frontend (Vite + Tailwind CSS v4)
│   ├── src/
│   │   ├── components/             # Navbar, KanbanBoard, CreateTaskModal, TaskDetailModal
│   │   ├── context/                # AuthContext (JWT & session state)
│   │   ├── pages/                  # LoginPage, RegisterPage, DashboardPage, ProjectDetailPage
│   │   ├── services/               # api.js (Axios + JWT interceptor), socket.js (Socket.io client)
│   │   ├── App.jsx                 # Route definitions & protected routes
│   │   ├── index.css               # Tailwind CSS v4 setup & custom scrollbars
│   │   └── main.jsx
│   ├── vite.config.js              # Proxy :3001 -> :5002 for /api and /socket.io
│   └── package.json
│
├── server/                         # Express.js REST API & WebSocket Server
│   ├── src/
│   │   ├── config/                 # db.js (Atlas connection with DNS fallback & URI normalizer)
│   │   ├── middleware/             # auth.js (ensureDB, protect, admin)
│   │   ├── models/                 # User.js, Project.js, Task.js (Mongoose Schemas)
│   │   ├── routes/                 # authRoutes.js, projectRoutes.js, taskRoutes.js
│   │   ├── socket/                 # socketHandlers.js (room join/leave)
│   │   ├── seed.js                 # Idempotent demo data seeder
│   │   └── server.js               # HTTP + Socket.io app entrypoint
│   ├── .env.example                # Safe environment variable template
│   ├── .gitignore
│   └── package.json
│
├── .gitattributes
├── .gitignore
└── README.md
```

---

## 🔑 Demo Accounts (Pre-configured in MongoDB Atlas)

| Role | Email | Password | Access Level |
|:---|:---|:---|:---|
| **Project Lead** | `lead@codealpha.com` | `lead123` | Admin & Project Owner; can invite/remove members and delete projects |
| **Developer** | `dev@codealpha.com` | `dev123` | Member; can create, drag, and update tasks, post comments |

*(Clickable 1-click quick-fill buttons are provided on the login page)*

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher (v25+ supported)
- **npm** v9 or higher
- A **MongoDB Atlas** database cluster (free M0 tier is sufficient)

---

### 1. Backend Setup

```bash
cd server
cp .env.example .env
```

Open `server/.env` and configure your credentials:

```env
PORT=5002
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/pm_tool?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
CLIENT_URL=http://localhost:3001
```

Install dependencies and start the backend:

```bash
npm install
npm run seed       # Seeds initial demo project, users, and tasks into Atlas
npm start          # Runs backend on port 5002
```

---

### 2. Frontend Setup

In a new terminal:

```bash
cd client
npm install
npm run dev        # Runs Vite dev server on http://localhost:3001
```

Open **`http://localhost:3001`** in your browser.

---

### 3. Production Build & Deployment

To verify compilation and generate optimized assets:

```bash
cd client
npm run build      # Outputs production bundles to client/dist/
```

NovaTask is configured for unified, single-service production deployment on **Render** with **Node.js 22.x** and **MongoDB Atlas**.
Detailed step-by-step setup, database user scoping, IP allowlist guidelines, and troubleshooting are available in:
👉 [**Production Deployment Guide (docs/DEPLOYMENT.md)**](file:///E:/CodeAlpha/02-project-management-tool/docs/DEPLOYMENT.md)

- **Render Blueprint**: [`render.yaml`](file:///E:/CodeAlpha/02-project-management-tool/render.yaml)
- **Architecture**: Single Render Web Service serving React static bundle, Express REST API, and Socket.io from the exact same origin.
- **Node Engine**: Node.js `>=22.0.0`

---

## 📡 REST API Reference

### Health & Database
- `GET /api/health` — Returns server uptime and MongoDB Atlas `readyState = 1` connection status.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account (`name`, `email`, `password`).
- `POST /api/auth/login` — Sign in and receive a 30-day JWT token.
- `GET /api/auth/me` — Retrieve current authenticated profile.
- `GET /api/auth/users?keyword=...` — Search registered workspace users to invite to projects.

### Projects (`/api/projects`)
- `GET /api/projects` — List all projects where user is owner or member.
- `POST /api/projects` — Create project (`name`, `description`, `color`, `dueDate`).
- `GET /api/projects/:id` — Retrieve detailed project info (access-controlled).
- `PUT /api/projects/:id` — Update project metadata or status (admin/owner only).
- `DELETE /api/projects/:id` — Delete project and cascade-delete its tasks (owner only).
- `POST /api/projects/:id/members` — Add a member with role (`admin`, `member`, `viewer`).
- `DELETE /api/projects/:id/members/:userId` — Remove a member from the project.

### Tasks (`/api/tasks`)
- `GET /api/tasks?project=:id` — List project tasks (supports `?priority=`, `?status=`, `?assignee=`).
- `POST /api/tasks` — Create task (`title`, `description`, `priority`, `status`, `dueDate`, `tags`, `assignees`).
- `GET /api/tasks/:id` — Get full task with comments and activity timeline.
- `PUT /api/tasks/:id` — Update task details, status, or order (emits Socket.io event).
- `DELETE /api/tasks/:id` — Delete task (emits Socket.io event).
- `POST /api/tasks/:id/comments` — Post a discussion comment (emits Socket.io event).

---

## ⚡ WebSocket Events (`socket.io`)

| Event Name | Direction | Payload | Description |
|:---|:---:|:---|:---|
| `join:project` | Client → Server | `projectId` | Joins a project room for isolated real-time events |
| `leave:project` | Client → Server | `projectId` | Leaves project room on component unmount |
| `task:created` | Server → Client | `Task` | Broadcasts newly added task to all open board tabs |
| `task:updated` | Server → Client | `Task` | Broadcasts status transitions (drag-and-drop) or content edits |
| `task:deleted` | Server → Client | `{ taskId }` | Broadcasts task deletion |
| `task:comment` | Server → Client | `{ taskId, task }` | Broadcasts new discussion comments |

---

## 🔐 Security & Integrity

- **Strict Database Guard:** When MongoDB Atlas is unavailable, requests return **HTTP 503 (Database Unavailable)**. No fake in-memory storage is used for production data.
- **Git Safety:** `server/.env` is strictly gitignored. Only safe `.env.example` templates are tracked.
- **Access Control:** Middleware verifies project ownership or membership before allowing reads or mutations.

---

## 👨‍💻 Author

**CodeAlpha Full Stack Development Internship — November 2026**
