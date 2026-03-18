# Environment variables & GitHub

## Local development

1. Copy the template (safe to commit):
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Edit **`backend/.env`** with real values.  
   **`.env` is gitignored** — it will **not** be pushed to GitHub.

## GitHub / public repo

- **Do not** commit `backend/.env`.
- **Do** commit `backend/.env.example` (placeholders only).
- If you ever committed secrets by mistake: **rotate** your HubSpot token and change passwords immediately.

## Deploying (Railway, Render, Fly.io, VPS, etc.)

Your host does not use the `.env` file from the repo. You set the **same variable names** in the provider’s **Environment** / **Secrets** UI:

| Variable | Required | Notes |
|----------|----------|--------|
| `HUBSPOT_ACCESS_TOKEN` | Yes (for sync) | Private app token from HubSpot |
| `APP_LOGIN_USERNAME` | Optional | Omit both login vars to disable login |
| `APP_LOGIN_PASSWORD` | Optional | No spaces around `=` when pasting |
| `APP_LOGIN_DISPLAY_NAME` | Optional | Header label |
| `APP_AUTH_SECRET` | Optional | Random 32+ chars for session signing in production |
| `PORT` | Optional | Host often sets this automatically |
| `SQLITE_DB_PATH` | Optional | e.g. `data/sales-calendar.db` (relative to `backend/`) or full path; folder is created if missing |

After deploy, run **Sync** once so SQLite fills on the server (or ensure `backend/data` is writable).

## Frontend + API URL (Render Static Site)

Set at **build time** on Render:

| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `https://your-backend.onrender.com` (no trailing slash) |

The frontend prefixes all `/api/...` calls with this URL. Redeploy the static site after changing it.
