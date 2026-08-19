# Sophia Coach AI — Backend

Node.js + TypeScript (Express 5) API that powers the Sophia English‑coaching app. It proxies all AI requests to Google Gemini so the API key stays on the server — the frontend never sees it. On top of chat, it provides word lookup/glossing, a PostgreSQL‑backed vocabulary bank, a real‑time voice‑coaching WebSocket, and a retrieval‑augmented (RAG) help chatbot grounded in the app's own knowledge base.

## Features

- **Coach chat** — level‑aware English replies from Gemini.
- **Word lookup & gloss** — full definitions and lightweight per‑word Vietnamese glosses.
- **Vocabulary bank** — CRUD over saved words, stored in PostgreSQL.
- **Voice coaching** — streaming replies plus correction cards over a WebSocket (`/ws/voice`).
- **Help chatbot (RAG)** — answers questions about the app from embedded Markdown docs using pgvector similarity search.

## Prerequisites

- **Node.js 20+** (recommended)
- **PostgreSQL 14+** with the [`pgvector`](https://github.com/pgvector/pgvector) and `pgcrypto` extensions available (the schema enables them with `CREATE EXTENSION`)
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini (used for both chat/generation and embeddings)

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

3. Edit `.env` and set the variables below.

### Environment variables

| Variable                 | Required | Default                | Description                                                                               |
| ------------------------ | -------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | yes      | —                      | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/sophia_coach`). |
| `GEMINI_API_KEY`         | yes      | —                      | Your Google AI Studio key.                                                                |
| `PORT`                   | no       | `4000`                 | HTTP/WebSocket server port.                                                               |
| `GEMINI_MODEL`           | no       | `gemini-2.5-flash`     | Primary generation model.                                                                 |
| `GEMINI_FALLBACK_MODELS` | no       | —                      | Comma‑separated backup models used when the primary is busy/rate‑limited.                 |
| `EMBEDDING_MODEL`        | no       | `gemini-embedding-001` | Model used to embed knowledge chunks and questions for RAG.                               |
| `EMBEDDING_DIM`          | no       | `768`                  | Embedding dimension. **Must match** `vector(N)` in `src/db/schema.sql`.                   |
| `RAG_TOP_K`              | no       | `4`                    | How many knowledge chunks to retrieve per question.                                       |
| `RAG_MIN_SCORE`          | no       | `0.6`                  | Lenient cosine floor; blocks clearly irrelevant chunks.                                   |

`DATABASE_URL` and `GEMINI_API_KEY` are validated at startup (via Zod) — the server refuses to boot if either is missing.

## Database

The schema (`src/db/schema.sql`) defines:

- `users`, `conversations`, `messages` — conversation history
- `vocabulary_items` — the vocabulary bank
- `knowledge_chunks` — embedded docs for RAG (`vector(768)` column with an HNSW cosine index)

It also enables the `pgcrypto` and `vector` extensions and seeds a single default user.

**Initialize the schema:**

```bash
npm run db:init
```

**Ingest the knowledge base** (embeds the Markdown in `knowledge/` into `knowledge_chunks` so the help chatbot can answer from it):

```bash
npm run db:ingest
```

## Run

**Development** (watch mode, auto‑restart on file changes):

```bash
npm run dev
```

The server listens on `http://localhost:<PORT>` (default `http://localhost:4000`) and the voice WebSocket on `ws://localhost:<PORT>/ws/voice`.

**Production‑style** (compile then run):

```bash
npm run build
npm start
```

**Typecheck only:**

```bash
npm run typecheck
```

## API

Base URL: `http://localhost:4000` (or your `PORT`). All JSON endpoints live under `/api`.

| Method   | Path               | Description                                                                                                       |
| -------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/health`          | Health check                                                                                                      |
| `GET`    | `/api/health`      | Health check under `/api`                                                                                         |
| `POST`   | `/api/chat/reply`  | Coach reply — body: `message`, `level`, `history`                                                                 |
| `POST`   | `/api/word/lookup` | Full word definition — body: `word`, optional `contextSentence`                                                   |
| `POST`   | `/api/word/gloss`  | Lightweight per‑word Vietnamese gloss — body: `word`, optional `contextSentence`                                  |
| `GET`    | `/api/vocab`       | List saved vocabulary items                                                                                       |
| `POST`   | `/api/vocab`       | Save a word — body: `word`, optional `meaning`, `vietnamese`, `example` (201 created / 200 if it already existed) |
| `PATCH`  | `/api/vocab/:id`   | Update learning status — body: `learning_status` (`new` \| `learning` \| `mastered`)                              |
| `DELETE` | `/api/vocab/:id`   | Delete a saved word                                                                                               |
| `POST`   | `/api/chatbot`     | RAG help bot — body: `message`, `history`                                                                         |

**WebSocket:** `ws://localhost:<PORT>/ws/voice` — streaming voice coaching. The client sends `client.interim` / `client.final` transcript messages; the server streams `assistant.delta` chunks plus an `assistant.coaching` correction card.

Errors return JSON with an `error` field; validation issues may include `details`.

## Project layout

```text
src/
  app.ts              # Express app (CORS, JSON, routes, error handling)
  server.ts           # Entry: HTTP server + voice WebSocket, listen
  config/env.ts       # Environment variables (Zod)
  routes/api.ts       # Route registration
  controllers/        # HTTP handlers (chat, word, vocab)
  services/           # Gemini + chat/word/vocab/voice business logic
  chatbot/            # RAG help bot (controller, routes, service, retrieval)
  prompts/            # System prompts (chat, voice)
  db/                 # pool, schema.sql, init + ingest scripts
  ws/voice.ws.ts      # Voice-coaching WebSocket server
  middleware/         # Error + not-found middleware
  lib/errors.ts       # AppError and error helpers
  types/              # Shared TypeScript types
knowledge/            # Markdown docs ingested into the RAG knowledge base
```

## Frontend

This backend does **not** start automatically when you run the frontend. Run both:

1. **Terminal A:** `cd backend && npm run dev`
2. **Terminal B:** `cd frontend && npm run dev`

Point the frontend at this API with `VITE_API_BASE_URL` in `frontend/.env` (for example `http://localhost:4000`).

## Security notes

- Keep `GEMINI_API_KEY` and `DATABASE_URL` only in `backend/.env` (never commit `.env`).
- CORS is currently open (`cors()` with no allow‑list). Restrict the origin before deploying.
- In production, add HTTPS, rate limiting, and authentication before exposing these routes publicly. There is no auth today — every request runs as a single shared default user.
