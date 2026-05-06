import { useMemo, useState } from "react";

const STORAGE_KEY = "sophia-coach-settings";

const DEFAULT_SETTINGS = {
  level: "B1",
  speech_rate: 0.75,
  show_translation: true,
  auto_speak: false,
};

const LEVEL_OPTIONS = [
  { value: "A2", label: "A2 - Elementary" },
  { value: "B1", label: "B1 - Intermediate" },
  { value: "Technical", label: "Technical - Developer English" },
];

const toggleRows = [
  {
    key: "auto_speak",
    title: "Auto-speak AI responses",
    description: "Automatically read responses aloud",
  },
  {
    key: "show_translation",
    title: "Show Vietnamese translation",
    description: "Toggle bilingual view in chat",
  },
];

const parseStoredSettings = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export default function AppSettings() {
  const [settings, setSettings] = useState(() => {
    const saved = parseStoredSettings(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
  });
  const [saving, setSaving] = useState(false);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    setSaving(false);
    alert("Settings saved!");
  };

  const speechRateLabel = useMemo(
    () => `${settings.speech_rate.toFixed(2)}x`,
    [settings.speech_rate],
  );

  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Settings</h2>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
          Customize your learning experience
        </p>
      </header>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={cardStyle}>
          <h3 style={titleStyle}>English Level</h3>
          <p style={descStyle}>
            Controls vocabulary complexity in AI responses
          </p>
          <select
            value={settings.level}
            onChange={(event) => updateSetting("level", event.target.value)}
            style={fieldStyle}
          >
            {LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={cardStyle}>
          <h3 style={titleStyle}>Speech</h3>
          <p style={descStyle}>Control text-to-speech behavior</p>

          <div style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span>Speech rate</span>
              <span style={{ color: "#64748b" }}>{speechRateLabel}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.25}
              value={settings.speech_rate}
              onChange={(event) =>
                updateSetting("speech_rate", Number(event.target.value))
              }
            />
            <p style={hintStyle}>Slower speeds help you hear every syllable.</p>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={titleStyle}>Preferences</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {toggleRows.map((row) => (
              <label
                key={row.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span>
                  <span style={{ display: "block", fontSize: 13 }}>
                    {row.title}
                  </span>
                  <span style={hintStyle}>{row.description}</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings[row.key]}
                  onChange={(event) =>
                    updateSetting(row.key, event.target.checked)
                  }
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: 14,
          width: "100%",
          border: 0,
          borderRadius: 10,
          padding: "10px 12px",
          background: "#2563eb",
          color: "#fff",
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </section>
  );
}

const cardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
};

const titleStyle = {
  margin: 0,
  fontSize: 14,
};

const descStyle = {
  margin: "4px 0 10px",
  color: "#64748b",
  fontSize: 12,
};

const hintStyle = {
  color: "#64748b",
  fontSize: 11,
};

const fieldStyle = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "8px 10px",
};
