CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'chat' CHECK (mode IN ('chat', 'voice', 'mixed')),
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'text' CHECK (input_type IN ('text', 'voice_transcript')),
  status TEXT NOT NULL DEFAULT 'final' CHECK (status IN ('final', 'edited', 'failed')),
  sequence_no BIGINT NOT NULL,
  language_code TEXT,
  stt_confidence NUMERIC(4, 3),
  latency_ms INTEGER,
  model_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS vocabulary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  definition TEXT NOT NULL DEFAULT '',
  vietnamese TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '',
  learning_status TEXT NOT NULL DEFAULT 'new' CHECK (learning_status IN ('new', 'learning', 'mastered')),
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message
  ON conversations (user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_sequence
  ON messages (conversation_id, sequence_no);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_vocab_user_created_at
  ON vocabulary_items (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vocab_user_word
  ON vocabulary_items (user_id, word);
