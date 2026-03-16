export interface SessionConfig {
  displayName: string;
  nativeLanguage: string;
  languageLabel: string;
  roomId: string;
  serverUrl: string;
  userId: string;
}

const SESSION_KEY = "linguacall_session";

export function saveSession(cfg: SessionConfig) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(cfg));
}

export function loadSession(): SessionConfig | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionConfig) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}