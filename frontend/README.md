# Sophia Coach AI — Frontend

React (Vite) app for the Sophia English coach: a real‑time **voice assistant**, a **chat** coach, a **vocabulary bank**, **settings**, and a floating **help chatbot**. It talks to the **backend** for all Gemini‑powered features — the API key stays on the server.

## Features

- **Voice Assistant** (home route `/`) — speak to Sophia and get streamed spoken replies plus correction cards over a WebSocket.
- **Chat** (`/chat`) — text coaching with tap‑to‑look‑up words and per‑word Vietnamese glosses.
- **Vocabulary** (`/vocabulary`) — save, review, and update the learning status of words.
- **Settings** (`/settings`) — preferences such as auto‑speak.
- **Floating help chatbot** — a RAG‑backed assistant that answers questions about the app.

## Stack

- React 19 + Vite 8
- React Router 7
- Tailwind CSS v4 (`@tailwindcss/vite`)
- TypeScript throughout (`.ts` / `.tsx`)
- Framer Motion, Lucide React
- `@tanstack/react-query` for data fetching/mutations
- Browser `Web Speech` / `SpeechSynthesis` APIs for voice input and playback

## Prerequisites

- Node.js 20+ recommended
- Backend running (see [`../backend/README.md`](../backend/README.md)) for any AI feature — chat, voice, word lookup, vocabulary, and the help bot all call the backend.
- A Chromium‑based browser is recommended for the fullest speech‑recognition support.

## Setup

```bash
cd frontend
npm install
```

Copy the environment template:

```bash
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Set **`VITE_API_BASE_URL`** to your backend URL (default `http://localhost:4000`). The voice WebSocket URL is derived from this base. Vite only exposes variables prefixed with `VITE_`.

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
  api/           # Per-feature HTTP client, services, types & react-query hooks
    client.ts    #   Shared fetch wrapper (uses VITE_API_BASE_URL)
    chat/        #   Coach chat
    word/        #   Word lookup + gloss
    vocab/       #   Vocabulary bank CRUD
    chatbot/     #   Help bot
  components/    # UI pieces
    chat/        #   ChatInput, MessageBubble, WordLookupModal, SpeechControls
    layouts/     #   AppLayout (shared shell + nav)
    ui/          #   Toast, primitives
    FloatingChatButton.tsx
  pages/         # Routes: VoiceAssistant (/), Chat, Vocabulary, AppSettings
  hooks/         # React hooks (e.g. useSpeechPlayback)
  lib/           # Browser helpers (vocab, word lookup, speech playback)
  App.tsx        # Router + providers
  main.tsx       # Entry
  index.css      # Tailwind + global styles
```

## Troubleshooting

- **Chat, voice, or word lookup fails:** Confirm the backend is up and `VITE_API_BASE_URL` matches the backend `PORT`.
- **Voice assistant won't connect:** Check the backend's voice WebSocket is running (`ws://localhost:4000/ws/voice`) and that your browser has microphone permission.
- **Help bot has no answers:** Make sure the backend's knowledge base has been ingested (`npm run db:ingest` in `backend`).
- **Env changes ignored:** Restart `npm run dev` after editing `.env`.
