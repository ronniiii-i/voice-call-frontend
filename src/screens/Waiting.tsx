import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { loadSession } from "../session";
import styles from "../styles/Waiting.module.css";

type Phase =
  | "connecting"
  | "waiting"
  | "peer_joined"
  | "error";

export default function Waiting() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const config = loadSession();

  const [phase, setPhase] = useState<Phase>("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [dots, setDots] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated dots for loading states
  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // No session means user landed on /waiting directly without going through lobby
    if (!config || !roomId) {
      navigate("/", { replace: true });
      return;
    }

    mountedRef.current = true;

    const base = config.serverUrl.trim().replace(/\/$/, "");
    const url = `${base}/ws/call/${roomId}/${config.userId}`;
    console.log("[Waiting] connecting to", url);

    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      if (!mountedRef.current) return;
      ws.send(
        JSON.stringify({
          native_lang: config.nativeLanguage,
          display_name: config.displayName,
        }),
      );
      setPhase("waiting");
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      if (typeof event.data !== "string") return;
      try {
        const msg = JSON.parse(event.data) as {
          type: string;
          peer_id?: string;
          display_name?: string;
        };
        if (msg.type === "peer_joined") {
          setPhase("peer_joined");
          // Brief pause so user sees the "peer joined" state, then navigate
          redirectTimer.current = setTimeout(() => {
            if (mountedRef.current) {
              navigate(`/call/${roomId}`, { replace: true });
            }
          }, 1200);
        }
      } catch {
        /* ignore binary/malformed */
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setPhase("error");
      setErrorMsg("Could not connect to the server. Check your server URL.");
    };

    ws.onclose = (e) => {
      if (!mountedRef.current) return;
      // Don't show error if we're about to redirect (peer_joined phase)
      if (phase !== "peer_joined") {
        setPhase("error");
        setErrorMsg(`Disconnected (code ${e.code}). The room may have closed.`);
      }
    };

    return () => {
      mountedRef.current = false;
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      // Don't close the socket here — pass it through to Call via sessionStorage flag
      // The Call screen will open its own connection fresh
      ws.close();
      wsRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = () => {
    wsRef.current?.close();
    navigate("/", { replace: true });
  };

  const handleRetry = () => {
    navigate("/", { replace: true });
  };

  const copyRoomCode = () => {
    if (roomId) navigator.clipboard.writeText(roomId);
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoMark}>LC</div>
          <span className={styles.logoText}>LinguaCall</span>
        </div>

        {/* Phase: connecting */}
        {phase === "connecting" && (
          <div className={styles.stateBlock}>
            <div className={styles.spinner} />
            <h2 className={styles.stateTitle}>Connecting{dots}</h2>
            <p className={styles.stateBody}>
              Establishing connection to the server.
            </p>
          </div>
        )}

        {/* Phase: waiting for peer */}
        {phase === "waiting" && (
          <div className={styles.stateBlock}>
            <div className={styles.pulseRing}>
              <div className={styles.pulseCore} />
            </div>
            <h2 className={styles.stateTitle}>
              Waiting for someone to join{dots}
            </h2>
            <p className={styles.stateBody}>
              Share the room code below with the person you want to call.
            </p>

            <div className={styles.roomCodeBlock}>
              <span className={styles.roomCodeLabel}>Room code</span>
              <div className={styles.roomCodeRow}>
                <span className={styles.roomCode}>{roomId}</span>
                <button
                  className={styles.copyBtn}
                  onClick={copyRoomCode}
                  type="button"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className={styles.youRow}>
              <div className={styles.youAvatar}>
                {config?.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className={styles.youInfo}>
                <span className={styles.youName}>{config?.displayName}</span>
                <span className={styles.youLang}>{config?.languageLabel}</span>
              </div>
              <span className={styles.youBadge}>you</span>
            </div>
          </div>
        )}

        {/* Phase: peer just joined */}
        {phase === "peer_joined" && (
          <div className={styles.stateBlock}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.stateTitle}>Someone joined!</h2>
            <p className={styles.stateBody}>Starting the call now…</p>
          </div>
        )}

        {/* Phase: error */}
        {phase === "error" && (
          <div className={styles.stateBlock}>
            <div className={styles.errorIcon}>✕</div>
            <h2 className={styles.stateTitle}>Connection failed</h2>
            <p className={styles.stateBody}>{errorMsg}</p>
            <button
              className={styles.retryBtn}
              onClick={handleRetry}
              type="button"
            >
              Back to lobby
            </button>
          </div>
        )}

        {/* Cancel button (shown during connecting/waiting only) */}
        {(phase === "connecting" || phase === "waiting") && (
          <button
            className={styles.cancelBtn}
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
