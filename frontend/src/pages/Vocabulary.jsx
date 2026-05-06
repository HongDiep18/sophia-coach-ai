import { useMemo, useState } from "react";
import { loadVocabFromStorage } from "../lib/vocabBank";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "learning", label: "Learning" },
  { value: "mastered", label: "Mastered" },
];

const STATUS_COLORS = {
  new: "#64748b",
  learning: "#f59e0b",
  mastered: "#16a34a",
};

const INITIAL_VOCAB = [
  {
    id: "v-1",
    word: "scalable",
    meaning: "Able to grow without losing performance.",
    example: "We need a scalable backend for more users.",
    learning_status: "learning",
  },
  {
    id: "v-2",
    word: "refactor",
    meaning: "Improve code structure without changing behavior.",
    example: "I will refactor this component tomorrow.",
    learning_status: "new",
  },
  {
    id: "v-3",
    word: "deploy",
    meaning: "Release software to production.",
    example: "We deploy every Friday evening.",
    learning_status: "mastered",
  },
];

const nextStatus = {
  new: "learning",
  learning: "mastered",
  mastered: "new",
};

const toTitleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

function VocabularyCard({ item, onCycleStatus, onDelete }) {
  return (
    <article
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <strong>{item.word}</strong>
        <span
          style={{
            fontSize: 12,
            color: STATUS_COLORS[item.learning_status],
            fontWeight: 600,
          }}
        >
          {toTitleCase(item.learning_status)}
        </span>
      </div>

      <p style={{ margin: 0, color: "#334155", fontSize: 14 }}>
        {item.meaning}
      </p>
      <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
        {item.example}
      </p>

      <div className="mt-auto flex items-center gap-3 pt-4">
        {/* Next Status Button - Primary Action */}
        <button
          type="button"
          onClick={() => onCycleStatus(item.id)}
          className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 active:bg-blue-800"
        >
          Next Status
        </button>

        {/* Delete Button - Danger Action */}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="px-4 py-2 text-sm font-medium text-slate-300 transition-all border border-slate-700 rounded-md hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default function Vocabulary() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [vocab, setVocab] = useState(() => [
    ...loadVocabFromStorage(),
    ...INITIAL_VOCAB,
  ]);

  const searchTerm = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return vocab.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.word.toLowerCase().includes(searchTerm) ||
        item.meaning.toLowerCase().includes(searchTerm);
      const matchesFilter = filter === "all" || item.learning_status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [vocab, searchTerm, filter]);

  const stats = useMemo(() => {
    return vocab.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.learning_status] += 1;
        return acc;
      },
      { total: 0, new: 0, learning: 0, mastered: 0 },
    );
  }, [vocab]);

  const updateStatus = (id) => {
    setVocab((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, learning_status: nextStatus[item.learning_status] }
          : item,
      ),
    );
  };

  const deleteWord = (id) => {
    setVocab((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Vocabulary Bank</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            {stats.total} words saved
          </p>
        </div>
        <div
          style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748b" }}
        >
          {STATUS_OPTIONS.filter((option) => option.value !== "all").map(
            (option) => (
              <span key={option.value}>
                {stats[option.value]} {option.label.toLowerCase()}
              </span>
            ),
          )}
        </div>
      </header>

      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search words..."
          style={{
            flex: 1,
            minWidth: 260,
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            padding: "10px 12px",
          }}
        />

        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "8px 12px",
              background: filter === option.value ? "#2563eb" : "#fff",
              color: filter === option.value ? "#fff" : "#0f172a",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            border: "1px dashed #cbd5e1",
            borderRadius: 12,
            padding: 32,
            textAlign: "center",
            color: "#64748b",
          }}
        >
          {searchTerm
            ? "No words match your search."
            : "No words saved yet. Add words from your chat."}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {filtered.map((item) => (
            <VocabularyCard
              key={item.id}
              item={item}
              onCycleStatus={updateStatus}
              onDelete={deleteWord}
            />
          ))}
        </div>
      )}
    </section>
  );
}
