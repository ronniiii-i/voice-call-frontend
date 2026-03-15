import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { saveSession, loadSession } from "../session";
import type { SessionConfig } from "../session";
import styles from "../styles/Lobby.module.css";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "zh", label: "Chinese", flag: "🇨🇳" },
];

const ROOM_CODE_REGEX = /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{2}$/;

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

export default function Lobby() {
  const navigate = useNavigate();
  const lastConfig = loadSession();

  const [tab, setTab] = useState<"new" | "join">("new");
  const [displayName, setDisplayName] = useState(lastConfig?.displayName ?? "");
  const [language, setLanguage] = useState(lastConfig?.nativeLanguage ?? "en");
  const [roomId, setRoomId] = useState("");
  const [serverUrl, setServerUrl] = useState(
    lastConfig?.serverUrl ?? import.meta.env.VITE_WS_URL.trim(),
  );
  const [showServer, setShowServer] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const selectedLang =
    LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

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
  }, [displayName, language, tab, roomId, serverUrl, selectedLang, navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <div className={styles.container}>
        <div className={styles.heroContent}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  stroke="white"
                  strokeWidth="1.5"
                />
                <path
                  d="M7 10h6M10 7l3 3-3 3"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className={styles.logoText}>LinguaCall</span>
          </div>
          <h1 className={styles.heading}>
            Talk to anyone,
            <br />
            in any language.
          </h1>
          <p className={styles.sub}>
            Real-time voice translation. No downloads. No accounts.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.field}>
            <label className={styles.label}>Your name</label>
            <input
              className={styles.input}
              type="text"
              placeholder="How should others see you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              maxLength={32}
              autoComplete="off"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>I speak</label>
            <div className={styles.langGrid}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`${styles.langBtn} ${language === lang.code ? styles.langBtnActive : ""}`}
                  onClick={() => setLanguage(lang.code)}
                  type="button"
                >
                  <span>{lang.flag}</span>
                  <span className={styles.langLabel}>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "new" ? styles.tabActive : ""}`}
              onClick={() => setTab("new")}
              type="button"
            >
              New room
            </button>
            <button
              className={`${styles.tab} ${tab === "join" ? styles.tabActive : ""}`}
              onClick={() => setTab("join")}
              type="button"
            >
              Join room
            </button>
          </div>

          {tab === "join" && (
            <div className={styles.field}>
              <label className={styles.label}>Room code</label>
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
          )}

          <button
            className={styles.serverToggle}
            onClick={() => setShowServer((v) => !v)}
            type="button"
          >
            <span>⚙️ Server URL</span>
            <span
              className={`${styles.serverChevron} ${showServer ? styles.serverChevronOpen : ""}`}
            >
              ▼
            </span>
          </button>

          {showServer && (
            <div className={styles.field}>
              <input
                className={`${styles.input} ${styles.inputMono} ${styles.inputSmall}`}
                type="text"
                placeholder="wss://xxxx.ngrok-free.app"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button
            className={styles.cta}
            onClick={handleSubmit}
            type="button"
            disabled={checking}
          >
            {checking
              ? "Checking room…"
              : tab === "new"
                ? `Start call as ${selectedLang.flag} ${displayName || "you"}`
                : "Join call"}
            {!checking && (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <p className={styles.hint}>
            Rooms support exactly 2 people. Share the room code with your
            conversation partner.
          </p>
        </div>
      </div>
    </div>
  );
}
