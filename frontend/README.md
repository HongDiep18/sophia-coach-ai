# Sophia Coach AI — Frontend

React (Vite) app for the English coach chat, vocabulary bank, and settings. It talks to the **backend** for Gemini-powered chat and word lookup; the API key stays on the server.

## Stack

- React 19 + Vite 8
- React Router
- Tailwind CSS v4 (`@tailwindcss/vite`)
- TypeScript (API + `src/lib`; pages/components may stay `.jsx`)
- Framer Motion, Lucide React
- `@tanstack/react-query` (available if you use it in pages)

## Prerequisites

- Node.js 20+ recommended
- Backend running (see `../backend/README.md`) when using real AI

## Setup

```bash
cd frontend
npm install
```

Copy environment template:

```bash
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Set **`VITE_API_BASE_URL`** to your backend URL (default `http://localhost:4000`). Vite only exposes variables prefixed with `VITE_`.

## Run

**Development (hot reload):**

```bash
npm run dev
```

**Production build:**

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

**Lint and typecheck:**

```bash
npm run lint
npm run typecheck
```

## Running with the backend

The frontend **does not** start the API. Use two terminals:

1. `cd ../backend && npm run dev`
2. `cd frontend && npm run dev`

Then open the URL Vite prints (usually `http://localhost:5173`).

## Project layout (high level)

```text
src/
  api/           # HTTP client + chat/word endpoints (TypeScript)
  lib/           # Browser helpers (vocab localStorage, etc., TypeScript)
  components/    # UI pieces (chat, layout, vocabulary)
  pages/         # Routes: Chat, Vocabulary, Settings
  main.jsx       # Entry
  index.css      # Tailwind + global styles
```

## Troubleshooting

- **Chat or word lookup fails:** Confirm backend is up and `VITE_API_BASE_URL` matches the backend `PORT`.
- **Env changes ignored:** Restart `npm run dev` after editing `.env`.
