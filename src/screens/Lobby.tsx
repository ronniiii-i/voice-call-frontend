import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { saveSession, loadSession } from "../session";
import type { SessionConfig } from "../session";
import styles from "../styles/Lobby.module.css";

const LANGUAGES = [
  { code: "en", label: "English", country: "United Kingdom" },
  { code: "fr", label: "French", country: "France" },
  { code: "de", label: "German", country: "Germany" },
  { code: "es", label: "Spanish", country: "Spain" },
  { code: "zh", label: "Chinese", country: "China" },
];

const ROOM_CODE_REGEX = /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{2}$/;

function parseServerOptions(...values: Array<string | null | undefined>) {
  const urls = values
    .flatMap((value) => (value ?? "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(urls));
}

function generateRoomId() {
  const seg = (n: number) =>
    Math.random()
      .toString(36)
      .slice(2, 2 + n)
      .padEnd(n, "0");
  return `${seg(4)}-${seg(4)}-${seg(2)}`;
}

function generateUserId() {
  return `user_${Math.random().toString(36).slice(2, 11)}`;
}

function formatRoomCode(raw: string): string {
  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean.length <= 4) return clean;
  if (clean.length <= 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 10)}`;
}

function FlagIcon({ code }: { code: string }) {
  switch (code) {
    case "en":
      return (
        <svg viewBox="0 0 24 16" className={styles.languageFlag} aria-hidden="true">
          <rect width="24" height="16" rx="3" fill="#0A47A9" />
          <path d="M1 1l22 14M23 1L1 15" stroke="#fff" strokeWidth="3" />
          <path d="M1 1l22 14M23 1L1 15" stroke="#CF142B" strokeWidth="1.5" />
          <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5" />
          <path d="M12 0v16M0 8h24" stroke="#CF142B" strokeWidth="3" />
        </svg>
      );
    case "fr":
      return (
        <svg viewBox="0 0 24 16" className={styles.languageFlag} aria-hidden="true">
          <rect width="8" height="16" rx="3" fill="#0055A4" />
          <rect x="8" width="8" height="16" fill="#fff" />
          <rect x="16" width="8" height="16" rx="3" fill="#EF4135" />
        </svg>
      );
    case "de":
      return (
        <svg viewBox="0 0 24 16" className={styles.languageFlag} aria-hidden="true">
          <rect width="24" height="16" rx="3" fill="#000" />
          <rect y="5.33" width="24" height="5.34" fill="#DD0000" />
          <rect y="10.66" width="24" height="5.34" rx="0 0 3 3" fill="#FFCE00" />
        </svg>
      );
    case "es":
      return (
        <svg viewBox="0 0 24 16" className={styles.languageFlag} aria-hidden="true">
          <rect width="24" height="16" rx="3" fill="#AA151B" />
          <rect y="4" width="24" height="8" fill="#F1BF00" />
        </svg>
      );
    case "zh":
      return (
        <svg viewBox="0 0 24 16" className={styles.languageFlag} aria-hidden="true">
          <rect width="24" height="16" rx="3" fill="#DE2910" />
          <polygon points="6,2 6.7,4 8.8,4 7.1,5.2 7.8,7.2 6,6 4.2,7.2 4.9,5.2 3.2,4 5.3,4" fill="#FFDE00" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Lobby() {
  const navigate = useNavigate();
  const lastConfig = loadSession();
  const serverOptions = parseServerOptions(
    import.meta.env.VITE_WS_URL,
    lastConfig?.serverUrl,
    "ws://localhost:8000",
  );
  const defaultServerUrl = serverOptions[0] ?? "ws://localhost:8000";

  const [tab, setTab] = useState<"new" | "join">("new");
  const [displayName, setDisplayName] = useState(lastConfig?.displayName ?? "");
  const [language, setLanguage] = useState(lastConfig?.nativeLanguage ?? "en");
  const [roomId, setRoomId] = useState("");
  const [serverUrl, setServerUrl] = useState(
    lastConfig?.serverUrl ?? defaultServerUrl,
  );
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(false);

  const selectedLang =
    LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];

  const handleRoomInput = (val: string) => {
    setRoomId(formatRoomCode(val));
    setError("");
  };

  const checkRoomExists = async (
    id: string,
    base: string,
  ): Promise<"ok" | "not_found" | "full" | "error"> => {
    try {
      const httpBase = base.replace(/^wss?:\/\//, (m) =>
        m === "wss://" ? "https://" : "http://",
      );
      const res = await fetch(`${httpBase}/rooms/${id}`);
      if (!res.ok) return "not_found";
      const data = (await res.json()) as { exists: boolean; occupants: number };
      if (!data.exists) return "not_found";
      if (data.occupants >= 2) return "full";
      return "ok";
    } catch {
      return "error";
    }
  };

  const handleSubmit = useCallback(async () => {
    setError("");
    if (!displayName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!serverUrl.trim()) {
      setError("Please enter the server URL");
      return;
    }

    if (tab === "join") {
      if (!roomId.trim()) {
        setError("Please enter a room code");
        return;
      }
      if (!ROOM_CODE_REGEX.test(roomId)) {
        setError("Room code must be in the format xxxx-xxxx-xx");
        return;
      }
    }

    const finalRoomId = tab === "new" ? generateRoomId() : roomId.trim();

    if (tab === "join") {
      setChecking(true);
      const result = await checkRoomExists(finalRoomId, serverUrl.trim());
      setChecking(false);
      if (result === "not_found") {
        setError("Room not found. Check the code and try again.");
        return;
      }
      if (result === "full") {
        setError("This room is full (2 participants max).");
        return;
      }
      if (result === "error") {
        setError("Could not reach the server. Check the URL.");
        return;
      }
    }

    const cfg: SessionConfig = {
      displayName: displayName.trim(),
      nativeLanguage: language,
      languageLabel: selectedLang.label,
      roomId: finalRoomId,
      serverUrl: serverUrl.trim(),
      userId: generateUserId(),
    };

    saveSession(cfg);
    navigate(`/waiting/${finalRoomId}`);
  }, [displayName, language, navigate, roomId, selectedLang, serverUrl, tab]);

  return (
    <main className={styles.page}>
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.gradientBlurPrimary} />
        <div className={styles.gradientBlurSecondary} />
      </div>

      <section className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.badgeDotWrap}>
            <span className={styles.badgeDotPulse} />
            <span className={styles.badgeDot} />
          </span>
          Real-time Voice Intelligence
        </div>

        <h1 className={styles.title}>
          Lingua<span className={styles.titleAccent}>Call</span>
        </h1>

        <p className={styles.subtitle}>
          Break language barriers instantly. Professional voice call
          translation for fast, private conversations.
        </p>
      </section>

      <section className={styles.formSection}>
        <div className={styles.card}>
          <div className={styles.tabs}>
            <div
              className={`${styles.tabPill} ${tab === "join" ? styles.tabPillJoin : ""}`}
              aria-hidden="true"
            />

            <button
              className={`${styles.tabButton} ${tab === "new" ? styles.tabButtonActive : ""}`}
              onClick={() => setTab("new")}
              type="button"
            >
              New Room
            </button>

            <button
              className={`${styles.tabButton} ${tab === "join" ? styles.tabButtonActive : ""}`}
              onClick={() => setTab("join")}
              type="button"
            >
              Join Room
            </button>
          </div>

          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Your Identity</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Full name or alias"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                maxLength={32}
                autoComplete="off"
              />
            </div>

            <div
              className={`${styles.serverField} ${tab === "new" ? styles.serverFieldVisible : ""}`}
              aria-hidden={tab !== "new"}
            >
              <div className={styles.field}>
                <label className={styles.label}>Server</label>
                <button
                  className={styles.serverToggle}
                  onClick={() => setShowServerMenu((open) => !open)}
                  type="button"
                >
                  <span className={styles.serverToggleCopy}>
                    <span className={styles.serverToggleTitle}>Selected server</span>
                    <span className={styles.serverToggleValue}>{serverUrl}</span>
                  </span>
                  <span
                    className={`${styles.serverChevron} ${showServerMenu ? styles.serverChevronOpen : ""}`}
                    aria-hidden="true"
                  >
                    <ChevronIcon />
                  </span>
                </button>

                <div
                  className={`${styles.serverMenu} ${showServerMenu ? styles.serverMenuOpen : ""}`}
                >
                  {serverOptions.map((option) => (
                    <button
                      key={option}
                      className={`${styles.serverOption} ${serverUrl === option ? styles.serverOptionActive : ""}`}
                      onClick={() => {
                        setServerUrl(option);
                        setShowServerMenu(false);
                      }}
                      type="button"
                    >
                      <span className={styles.serverOptionLabel}>
                        {option === defaultServerUrl ? "Primary server" : "Saved server"}
                      </span>
                      <span className={styles.serverOptionValue}>{option}</span>
                    </button>
                  ))}
                </div>

                <input
                  className={`${styles.input} ${styles.serverInput}`}
                  type="text"
                  placeholder="Or enter a custom server URL"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>

            <div
              className={`${styles.roomField} ${tab === "join" ? styles.roomFieldVisible : ""}`}
              aria-hidden={tab !== "join"}
            >
              <div className={styles.field}>
                <label className={styles.label}>Room Access Code</label>
                <input
                  className={`${styles.input} ${styles.inputMono}`}
                  type="text"
                  placeholder="xxxx-xxxx-xx"
                  value={roomId}
                  onChange={(e) => handleRoomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  maxLength={12}
                  autoComplete="off"
                />
                {roomId.length > 0 && !ROOM_CODE_REGEX.test(roomId) && (
                  <span className={styles.formatHint}>Format: xxxx-xxxx-xx</span>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Language</label>
              <div className={styles.languageChips}>
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    className={`${styles.languageChip} ${language === item.code ? styles.languageChipActive : ""}`}
                    onClick={() => setLanguage(item.code)}
                    type="button"
                  >
                    <FlagIcon code={item.code} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.submit}
              onClick={handleSubmit}
              type="button"
              disabled={checking}
            >
              {checking
                ? "Checking room..."
                : tab === "new"
                  ? "Create Room"
                  : "Join Call"}
            </button>
          </div>

          <p className={styles.note}>
            Secure, encrypted, and designed for two-person translated calls.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Privacy Policy</span>
        <span>Documentation</span>
        <span>API Support</span>
      </footer>
    </main>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
