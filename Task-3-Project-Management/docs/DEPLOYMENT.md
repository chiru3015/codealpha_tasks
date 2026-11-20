# Deploying NovaTask

This guide documents the existing live deployment and explains how to deploy NovaTask from the combined CodeAlpha internship repository.

## Live application

**Live URL:** https://novatask-f7f5.onrender.com

NovaTask is hosted as a Render web service. The Express server serves the React frontend, handles API requests, and manages Socket.io connections. MongoDB Atlas stores application data.

## 1. Existing Render deployment

The current live service is connected to the original GitHub repository:

| Setting | Current configuration |
|---|---|
| Repository | `https://github.com/chiru3015/NovaTask` |
| Branch | `master` |
| Root Directory | Blank (repository root) |
| Runtime | Node.js |
| Node.js version | 22 |
| Build Command | `npm ci --prefix server && npm ci --include=dev --prefix client && npm run build --prefix client` |
| Start Command | `node server/src/server.js` |
| Health Check Path | `/api/health` |

These details are based on the successful Render deployment logs from November 20, 2026.

## 2. Deploying from the combined repository

Repository: https://github.com/chiru3015/codealpha_tasks

For a separate Render service, use:

| Setting | Value |
|---|---|
| Repository | `chiru3015/codealpha_tasks` |
| Branch | `main` |
| Root Directory | `Task-3-Project-Management` |
| Runtime | Node |
| Build Command | `npm ci --prefix server && npm ci --include=dev --prefix client && npm run build --prefix client` |
| Start Command | `node server/src/server.js` |
| Health Check Path | `/api/health` |

The existing live service uses the original NovaTask repository. Do not change its settings to match the combined repository.

## 3. MongoDB Atlas setup

1. Create a MongoDB Atlas cluster.
2. Under Database Access, create a database user.
3. Give the user the required database permissions.
4. Configure Network Access to allow connections from Render.
5. Open Database → Connect → Drivers and copy the connection string.

Example:

`mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority`

Never commit your actual database connection string to Git.

## 4. Environment variables

Configure these in Render:

| Variable | Value |
|---|---|
| NODE_ENV | production |
| NODE_VERSION | 22 |
| MONGODB_URI | Your MongoDB Atlas connection string |
| JWT_SECRET | A strong random secret |

Render provides the PORT variable automatically.

## 5. Verify deployment

1. Open the login page.
2. Check `/api/health`.
3. Sign in with a test account.
4. Create a project and task.
5. Move a task between Kanban columns.
6. Refresh and verify that changes remain.
7. Test real-time updates in another browser tab.

## 6. Troubleshooting

| Problem | What to check |
|---|---|
| Build cannot find client or server | Check Root Directory and repository structure. |
| Database connection fails | Check MONGODB_URI and Atlas Network Access. |
| Login fails | Check JWT_SECRET and server logs. |
| Page refresh returns 404 | Check the Express frontend fallback route. |
| Real-time updates fail | Check browser console and Socket.io logs. |

## 7. Security reminders

- Use a separate database user for the application.
- Use a strong database password and JWT secret.
- Keep `.env` files and credentials out of Git.
- Do not use sample demo passwords for a public deployment.
- Use test data during demonstrations.
