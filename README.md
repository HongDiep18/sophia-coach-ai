# Sophia Coach AI

Full-stack English coaching app: a **React (Vite)** frontend for chat, vocabulary, settings, and voice-assisted coaching, backed by a **Node.js + Express** API that calls **Google Gemini**. The browser never sees your Gemini API key; only the backend uses it.

| Part | Tech | Role |
|------|------|------|
| **Frontend** (`frontend/`) | React 19, Vite 8, Tailwind v4, React Router | UI, calls HTTP + WebSocket to the backend |
| **Backend** (`backend/`) | Express 5, TypeScript, `ws`, Zod | REST API, streaming voice WebSocket, Gemini proxy |

More detail per folder: [`frontend/README.md`](frontend/README.md), [`backend/README.md`](backend/README.md).

---

## Prerequisites

- **Node.js 20+** (recommended)
- **npm** (comes with Node)
- **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/)
- **PostgreSQL** (optional for running chat/voice today; **required** only if you run `npm run db:init` to create tables)

---

## Repository layout

```text
sophia-coach-ai/
  frontend/          # Vite + React app
  backend/           # Express API + voice WebSocket
```

---

## 1. Backend — setup and run

### Install

```powershell
cd backend
npm install
```

### Environment

Create `backend/.env` from the template:

**Windows (PowerShell or CMD):**

```powershell
cd backend
copy .env.example .env
```

**macOS / Linux:**

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

| Variable | Required for server? | Description |
|----------|----------------------|-------------|
| `GEMINI_API_KEY` | **Yes** | Your Gemini key. The server fails to start without it (see `backend/src/config/env.ts`). |
| `PORT` | No | HTTP port (default `4000`). |
| `GEMINI_MODEL` | No | Model id (default `gemini-2.5-flash`). |
| `GEMINI_FALLBACK_MODELS` | No | Comma-separated fallbacks if the primary model is unavailable. |
| `DATABASE_URL` | Only for `db:init` | PostgreSQL URL, e.g. `postgresql://user:pass@localhost:5432/sophia`. Not validated at server startup; chat/voice work without it until you wire DB features. |

Example snippet:

```env
GEMINI_API_KEY=your_key_here
PORT=4000
GEMINI_MODEL=gemini-2.5-flash
```

### PostgreSQL schema (optional)

If you use PostgreSQL for users, conversations, messages, and vocabulary (`backend/src/db/schema.sql`):

1. Create a database and set `DATABASE_URL` in `backend/.env`.
2. Run:

```powershell
cd backend
npm run db:init
```

### Run backend (development)

```powershell
cd backend
npm run dev
```

You should see:

- HTTP: `http://localhost:4000` (or your `PORT`)
- Voice WebSocket: `ws://localhost:4000/ws/voice`

### Run backend (production-style)

```powershell
cd backend
npm run build
npm start
```

### Backend scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | `tsx watch src/server.ts` — hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run `node dist/server.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:init` | Apply `schema.sql` using `DATABASE_URL` |

---

## 2. Frontend — setup and run

The UI **does not** start the API. Run backend and frontend in **two terminals**.

### Install

```powershell
cd frontend
npm install
```

### Environment

```powershell
cd frontend
copy .env.example .env
```

Set **`VITE_API_BASE_URL`** to match the backend (default `http://localhost:4000`). Vite only exposes variables prefixed with `VITE_`. After changing `.env`, restart `npm run dev`.

### Run frontend (development)

```powershell
cd frontend
npm run dev
```

Open the URL Vite prints (typically **http://localhost:5173**).

### Other frontend commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## 3. Run everything together (quick checklist)

1. **Terminal A — backend**

   ```powershell
   cd backend
   npm install
   copy .env.example .env
   # Edit .env: set GEMINI_API_KEY (and DATABASE_URL if using db:init)
   npm run dev
   ```

2. **Terminal B — frontend**

   ```powershell
   cd frontend
   npm install
   copy .env.example .env
   # Ensure VITE_API_BASE_URL matches backend PORT
   npm run dev
   ```

3. Open the frontend URL, use chat / vocabulary / voice as implemented in the app.

---

## API reference (backend)

Base URL: `http://localhost:<PORT>` (default port `4000`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/health` | Same, under `/api` |
| `POST` | `/api/chat/reply` | Coach reply. Body (JSON): `message`, optional `level` (default `B1`), optional `history` array of `{ role: "user" \| "assistant", content }`. |
| `POST` | `/api/word/lookup` | Word help. Body: `word`, optional `contextSentence`. |

**WebSocket:** `ws://localhost:<PORT>/ws/voice` — voice streaming; server sends `server.ready`, streamed assistant deltas, etc. (see `backend/src/ws/voice.ws.ts`).

Errors are JSON when possible, often with an `error` field; validation errors may include `details`.

---

## Troubleshooting

- **Backend exits on startup:** Set `GEMINI_API_KEY` in `backend/.env`.
- **Chat or word lookup fails from the UI:** Confirm backend is running and `VITE_API_BASE_URL` matches `PORT` (including `http` vs `https` and host).
- **Frontend ignores new env values:** Restart `npm run dev` after editing `frontend/.env`.
- **`db:init` fails:** Ensure PostgreSQL is running and `DATABASE_URL` is correct.
- **Security:** Never commit `.env` files or expose `GEMINI_API_KEY` to the browser. For public deployments, add HTTPS, auth, and rate limiting as needed.

---

## License

See package metadata in `frontend/package.json` and `backend/package.json` (backend is marked `ISC` in `package.json`).
