# NovaTask — Project Management Tool

**CodeAlpha Full Stack Development Internship — Task 3**

NovaTask is a project management app for organising projects and team tasks. A user can create a project, add members, assign tasks, and track progress on a Kanban board. Comments and activity updates help team members follow the work.

**Live application:** https://novatask-f7f5.onrender.com/login

## Features

- User registration and login
- Project creation, editing, and deletion
- Project members with owner, admin, member, and viewer roles
- Task creation, editing, deletion, and assignment
- Kanban board with To Do, In Progress, In Review, and Done columns
- Drag-and-drop task movement and saved task order
- Task comments and activity history
- Search and filters for tasks
- Live updates between users through Socket.io
- Access checks for project and task actions

## Technology

| Part | Tools |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express |
| Database | MongoDB Atlas and Mongoose |
| Live updates | Socket.io |
| Authentication | JWT and bcryptjs |

## Project folders

```text
Task-3-Project-Management/
├── client/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── socket/
│   └── tests/
├── docs/
│   └── DEPLOYMENT.md
├── render.yaml
└── README.md
```

## Run locally

You need Node.js 22 or later and npm.

### 1. Backend

```bash
cd Task-3-Project-Management/server
npm install
```

Create `server/.env` and add your own values:

```env
PORT=5002
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
NODE_ENV=development
CLIENT_URL=http://localhost:3001
```

Start the backend:

```bash
npm run dev
```

The API runs on `http://localhost:5002`.

### 2. Frontend

Open another terminal:

```bash
cd Task-3-Project-Management/client
npm install
npm run dev
```

Open `http://localhost:3001`.

## Demo accounts

The seed script creates these accounts if they do not already exist:

| Role | Email | Password |
|---|---|---|
| Project lead | `lead@codealpha.com` | `lead123` |
| Developer | `dev@codealpha.com` | `dev123` |

These are sample credentials for testing. Change them before using the application with a database that contains real user data.

To add the sample project and tasks, run this from the `server` folder:

```bash
npm run seed
```

## Main API routes

| Area | Routes |
|---|---|
| Authentication | `/api/auth/register`, `/api/auth/login`, `/api/auth/me` |
| Projects | `/api/projects`, `/api/projects/:id`, `/api/projects/:id/members` |
| Tasks | `/api/tasks`, `/api/tasks/:id`, `/api/tasks/:id/comments` |
| Health | `/api/health` |

The application also uses Socket.io events to share task creation, updates, deletions, and comments with other connected project members.

## Tests and deployment

Run the backend tests from the server folder:

```bash
npm test
```

For deployment notes, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The Render configuration is in [render.yaml](render.yaml).

**CodeAlpha Full Stack Development Internship — November 2026**
