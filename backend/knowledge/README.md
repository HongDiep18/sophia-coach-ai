# Knowledge base (source of truth for the RAG chatbot)

Every `.md` file in this folder becomes the chatbot's knowledge. The ingest
script will read these files, split them into small chunks, turn each chunk
into a vector, and store them in the `knowledge_chunks` table. The chatbot can
only answer using what is written here — so keep it accurate and clear.

## How to write so retrieval works well
- **One topic per file.** Don't mix voice + vocabulary in one file.
- **Use `##` headings for each sub-topic.** Chunks are cut along headings, so
  each section should make sense on its own without the section above it.
- **Short paragraphs, one idea each** (3–5 sentences). Avoid walls of text.
- **Use the words a real user would type.** If someone asks "how do I save a
  word", the file should contain the phrase "save a word".
- **Be specific and factual.** Real button names, real steps, real statuses —
  not marketing fluff. Vague text retrieves poorly and answers poorly.
- **Vietnamese is welcome**, especially in the FAQ — the users are Vietnamese
  speakers and Gemini embeddings handle mixed language fine.

## The files
- `overview.md` — what the app is, who it's for, the big picture
- `voice-assistant.md` — the voice/speaking feature (the `/` home page)
- `chat.md` — the text chat coaching feature (`/chat`)
- `vocabulary.md` — the saved-words / Vocabulary Bank feature (`/vocabulary`)
- `settings.md` — user settings and preferences (`/settings`)
- `faq.md` — common questions and short answers

## When you edit these
Re-run the ingest step after changing any file so the chatbot learns the
new version. Delete the bracketed `[...]` prompts as you replace them with
your real content.
