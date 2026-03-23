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

  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
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
      if (phase !== "peer_joined") {
        setPhase("error");
        setErrorMsg(`Disconnected (code ${e.code}). The room may have closed.`);
      }
    };

    return () => {
      mountedRef.current = false;
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
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
      <div className={styles.bg} aria-hidden="true" />

      <div className={styles.shell}>
        <div className={styles.card}>
          {phase === "connecting" && (
            <div className={styles.stateBlock}>
              <div className={styles.spinnerWrap}>
                <div className={styles.spinner} />
              </div>
              <h2 className={styles.stateTitle}>Connecting{dots}</h2>
              <p className={styles.stateBody}>Connecting you to the room.</p>
            </div>
          )}

          {phase === "waiting" && (
            <div className={styles.stateBlock}>
              <div className={styles.pulseRing}>
                <div className={styles.pulseCore} />
              </div>
              <h2 className={styles.stateTitle}>Waiting for connection{dots}</h2>
              <p className={styles.stateBody}>Share the code below to continue.</p>

              <div className={styles.roomCodeBlock}>
                <span className={styles.roomCodeLabel}>Room code</span>
                <div className={styles.roomCodeRow}>
                  <span className={styles.roomCode}>{roomId}</span>
                  <button
                    className={styles.copyBtn}
                    onClick={copyRoomCode}
                    type="button"
                  >
                    Copy code
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
                <span className={styles.youBadge}>You</span>
              </div>
            </div>
          )}

          {phase === "peer_joined" && (
            <div className={styles.stateBlock}>
              <div className={`${styles.statusIcon} ${styles.statusSuccess}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 12.5l4 4L18.5 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className={styles.stateTitle}>Connected</h2>
              <p className={styles.stateBody}>Starting the call now...</p>
            </div>
          )}

            {phase === "error" && (
              <div className={styles.stateBlock}>
                <div className={`${styles.statusIcon} ${styles.statusError}`}>
                  <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
                    <circle
                      cx="24"
                      cy="24"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      opacity="0.35"
                    />
                    <path
                      d="M18 18l12 12M30 18L18 30"
                      stroke="currentColor"
                      strokeWidth="3.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className={styles.stateTitle}>Connection failed</h2>
              <p className={`${styles.stateBody} ${styles.errorText}`}>{errorMsg}</p>
              <button
                className={styles.retryBtn}
                onClick={handleRetry}
                type="button"
              >
                Back to lobby
              </button>
            </div>
          )}

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
    </div>
  );
}
