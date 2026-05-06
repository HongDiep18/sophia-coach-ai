# Sophia Coach AI — Backend

Node.js + TypeScript API that proxies requests to Google Gemini. The frontend never sends your API key only this server does.

## Prerequisites

- Node.js 20+ (recommended)
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini

## Setup

1. Install dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Create `.env` from the example:

   ```bash
   copy .env.example .env
   ```

   On macOS/Linux:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and set:
   - `GEMINI_API_KEY` — your real key (required)
   - `PORT` — server port (default `4000`)
   - `GEMINI_MODEL` — model id (default `gemini-2.5-flash`)

## Run

**Development** (watch mode, auto-restart on file changes):

```bash
npm run dev
```

The server listens on `http://localhost:<PORT>` (default `http://localhost:4000`).

**Production-style** (compile then run):

```bash
npm run build
npm start
```

**Typecheck only:**

```bash
npm run typecheck
```

## API

Base URL: `http://localhost:4000` (or your `PORT`).

| Method | Path               | Description                                                     |
| ------ | ------------------ | --------------------------------------------------------------- |
| `GET`  | `/health`          | Simple health check                                             |
| `GET`  | `/api/health`      | Same, under `/api`                                              |
| `POST` | `/api/chat/reply`  | Coach reply (JSON body: `message`, `level`, `history`)          |
| `POST` | `/api/word/lookup` | Word definition (JSON body: `word`, optional `contextSentence`) |

Errors return JSON with an `error` field; validation issues may include `details`.

## Project layout

```text
src/
  app.ts              # Express app (CORS, JSON, routes, error handling)
  server.ts           # Entry: load env, listen
  config/env.ts       # Environment variables (Zod)
  routes/api.ts       # Route registration
  controllers/        # HTTP handlers
  services/           # Gemini + business logic
  middleware/         # Error middleware
  types/              # Shared TypeScript types
```

## Frontend

This backend does **not** start automatically when you run the frontend. Run both:

1. **Terminal A:** `cd backend && npm run dev`
2. **Terminal B:** `cd frontend && npm run dev`

Point the frontend at this API with `VITE_API_BASE_URL` in `frontend/.env` (for example `http://localhost:4000`).

## Security notes

- Keep `GEMINI_API_KEY` only in `backend/.env` (never commit `.env`).
- In production, use HTTPS, rate limiting, and authentication before exposing these routes publicly.
