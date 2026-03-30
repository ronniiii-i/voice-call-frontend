import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { loadSession, clearSession } from "../session";
import {
  useWebSocket,
  type ConnectionStatus,
  type ParsedMessage,
} from "../hooks/useWebSocket";
import { useAudioStream } from "../hooks/useAudioStream";
import { useAudioPlayback } from "../hooks/useAudioPlayback";
import { useTranscript } from "../hooks/useTranscript";
import Controls from "../components/Controls";
import PeerTile from "../components/PeerTile";
import TranscriptPanel from "../components/TranscriptPanel";
import EndCallModal from "../components/EndCallModal";
import styles from "../styles/Call.module.css";

export default function Call() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const config = loadSession();

  const [connStatus, setConnStatus] = useState<ConnectionStatus>("connecting");
  const [peerName, setPeerName] = useState<string | null>(null);
  const [hasPeer, setHasPeer] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [latestTranslated, setLatestTranslated] = useState(
    "Waiting for translation...",
  );
  const [latestOriginal, setLatestOriginal] = useState("-");
  const [isReconnecting, setIsReconnecting] = useState(false);

  const isMutedRef = useRef(false);
  const peerNameRef = useRef<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null!);

  const { playAudio, stopAudio } = useAudioPlayback();
  const { entries, addEntry, downloadTranscript, clear } = useTranscript();

  useEffect(() => {
    if (!config || !roomId) {
      navigate(`/waiting/${roomId ?? ""}`, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMessage = useCallback(
    (msg: ParsedMessage) => {
      switch (msg.type) {
        case "connected":
          console.log("[WS] Connected as", msg.user_id);
          break;
        case "peer_joined": {
          const m = msg as ParsedMessage & {
            display_name?: string;
            displayName?: string;
          };
          const name =
            m.display_name || m.displayName || m.peer_id || "Participant";
          peerNameRef.current = name;
          setHasPeer(true);
          setPeerName(name);
          break;
        }
        case "peer_left":
          peerNameRef.current = null;
          setHasPeer(false);
          setPeerName(null);
          break;
        case "audio_with_caption": {
          const text = msg.text || "-";
          const original = msg.original || "-";
          setLatestTranslated(text);
          setLatestOriginal(original);
          if (msg.audioData) playAudio(msg.audioData);
          addEntry({
            speaker: "peer",
            displayName: peerNameRef.current || "Peer",
            original,
            translated: text,
          });
          break;
        }
        case "caption": {
          const text = msg.text || "-";
          const original = msg.original || "-";
          setLatestTranslated(text);
          setLatestOriginal(original);
          addEntry({
            speaker: "peer",
            displayName: peerNameRef.current || "Peer",
            original,
            translated: text,
          });
          break;
        }
        case "self_caption": {
          addEntry({
            speaker: "me",
            displayName: config?.displayName ?? "Me",
            original: msg.text || "-",
            translated: "",
          });
          break;
        }
        case "error":
          console.error("[WS] error:", msg.message);
          break;
      }
    },
    [playAudio, addEntry],
  );

  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    setConnStatus(status);
  }, []);

  const { connect, disconnect, sendAudio, sendJson } = useWebSocket({
    onMessage: handleMessage,
    onStatusChange: handleStatusChange,
  });

  const { isStreaming, startStreaming, stopStreaming } = useAudioStream();

  useEffect(() => {
    if (!config || !roomId) return;
    let cancelled = false;

    const start = async () => {
      if (isReconnecting) setIsReconnecting(true);
      try {
        await connect(
          config.serverUrl,
          roomId,
          config.userId,
          config.nativeLanguage,
          config.displayName,
        );
        if (cancelled) return;
        await startStreaming((pcm) => {
          if (!isMutedRef.current) sendAudio(pcm);
        });
      } catch (err) {
        console.error("[Call] start error:", err);
      }
    };

    start();

    return () => {
      cancelled = true;
      stopStreaming();
      stopAudio();
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => sendJson({ type: "ping" }), 25_000);
    return () => clearInterval(id);
  }, [sendJson]);

  useEffect(() => {
    if (connStatus !== "connected") return;
    const id = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [connStatus]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [entries]);

  const handleMute = () => {
    const next = !isMuted;
    isMutedRef.current = next;
    setIsMuted(next);
  };

  const confirmEndCall = (download: boolean) => {
    if (download)
      downloadTranscript(
        roomId!,
        config?.displayName ?? "",
        peerName || "Peer",
      );
    stopStreaming();
    stopAudio();
    disconnect();
    clear();
    clearSession();
    navigate("/", { replace: true });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const dotClass = [
    styles.statusDot,
    connStatus === "connected"
      ? styles.statusDotConnected
      : connStatus === "error"
        ? styles.statusDotError
        : styles.statusDotDefault,
  ].join(" ");

  const glowClass = [
    styles.bgGlow,
    hasPeer ? styles.bgGlowConnected : "",
    isStreaming && !isMuted ? styles.bgGlowActive : "",
  ].join(" ");

  if (!config) return null;

  return (
    <div className={styles.page}>
      <div className={glowClass} />

      <header className={styles.topBar}>
        <div className={styles.headerGroup}>
          <div className={styles.roomChip}>
            <span className={styles.roomLabel}>Room</span>
            <span className={styles.roomCode}>{roomId}</span>
            <button
              className={styles.copyBtn}
              onClick={() => navigator.clipboard.writeText(roomId ?? "")}
              title="Copy room code"
              type="button"
            >
              <CopyIcon />
            </button>
          </div>

          <div className={styles.callMeta}>
            <span className={styles.callMetaLabel}>Live call</span>
            <span className={styles.callMetaValue}>
              {hasPeer ? "2 participants" : "Waiting for peer"}
            </span>
          </div>
        </div>

        <div className={styles.statusRow}>
          <div className={dotClass} />
          <span className={styles.statusText}>
            {connStatus === "connected" ? formatTime(callSeconds) : connStatus}
          </span>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.stage}>
          <div className={styles.stageHeader}>
            <div>
              <p className={styles.stageEyebrow}>Participants</p>
              <h1 className={styles.stageTitle}>Conversation</h1>
            </div>
            <div className={styles.stageStatus}>
              <span className={styles.stageStatusLabel}>
                {hasPeer ? "Connected" : "Standby"}
              </span>
              <span className={styles.stageStatusText}>
                {hasPeer ? latestTranslated : "Waiting for the other participant"}
              </span>
            </div>
          </div>

          <div className={styles.tiles}>
            <PeerTile
              name={config.displayName}
              language={config.languageLabel}
              isSelf
              isMuted={isMuted}
              isStreaming={isStreaming}
            />
            {hasPeer && (
              <PeerTile
                name={peerName || "Participant"}
                language="-"
                isConnected
                latestCaption={latestTranslated}
              />
            )}
          </div>
        </section>

        {showTranscript && (
          <aside className={styles.transcriptWrap}>
            <TranscriptPanel
              entries={entries}
              myName={config.displayName}
              scrollRef={transcriptRef}
              latestOriginal={hasPeer ? latestOriginal : undefined}
            />
          </aside>
        )}
      </main>

      <Controls
        isMuted={isMuted}
        showTranscript={showTranscript}
        hasTranscript={entries.length > 0}
        onMute={handleMute}
        onToggleTranscript={() => setShowTranscript((v) => !v)}
        onDownload={() =>
          downloadTranscript(roomId!, config.displayName, peerName || "Peer")
        }
        onEndCall={() => setShowEndModal(true)}
      />

      {showEndModal && (
        <EndCallModal
          hasTranscript={entries.length > 0}
          onConfirm={confirmEndCall}
          onCancel={() => setShowEndModal(false)}
        />
      )}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 9.5A2.5 2.5 0 0 1 11.5 7h6A2.5 2.5 0 0 1 20 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 9 17.5v-8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v8A2.5 2.5 0 0 0 6.5 17H7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
