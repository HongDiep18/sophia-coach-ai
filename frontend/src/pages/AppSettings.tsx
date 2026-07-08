import { useState } from "react";
import { useToast } from "../components/ui/toast";

const STORAGE_KEY = "sophia-coach-settings";

const DEFAULT_SETTINGS = {
  auto_speak: false,
};

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
  const toast = useToast();

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    setSaving(false);
    toast.success("Settings saved!", {
      description: "Your preferences have been updated.",
    });
  };

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
          <h3 style={titleStyle}>Preferences</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span>
                <span style={{ display: "block", fontSize: 13 }}>
                  Auto-speak AI responses
                </span>
                <span style={hintStyle}>Automatically read responses aloud</span>
              </span>
              <input
                type="checkbox"
                checked={settings.auto_speak}
                onChange={(event) =>
                  updateSetting("auto_speak", event.target.checked)
                }
              />
            </label>
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

const hintStyle = {
  color: "#64748b",
  fontSize: 11,
};
