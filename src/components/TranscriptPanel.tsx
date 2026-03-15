import type { RefObject } from "react";
import type { TranscriptEntry } from "../hooks/useTranscript";
import styles from "../styles/TranscriptPanel.module.css";

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  myName: string;
  scrollRef: RefObject<HTMLDivElement>;
  latestOriginal?: string;
}

export default function TranscriptPanel({
  entries,
  // myName,
  scrollRef,
  latestOriginal,
}: TranscriptPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Transcript</span>
        <span className={styles.headerCount}>
          {entries.length} {entries.length === 1 ? "message" : "messages"}
        </span>
      </div>

      <div className={styles.scroll} ref={scrollRef}>
        {entries.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>💬</div>
            <p className={styles.emptyText}>
              Translations will appear here as the conversation unfolds.
            </p>
          </div>
        ) : (
          entries.map((entry) => {
            const isMe = entry.speaker === "me";
            return (
              <div
                key={entry.id}
                className={`${styles.row} ${isMe ? styles.rowMe : styles.rowPeer}`}
              >
                <div
                  className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubblePeer}`}
                >
                  <div className={styles.bubbleName}>
                    {isMe ? "You" : entry.displayName}
                  </div>
                  <div className={styles.bubbleText}>
                    {isMe ? entry.original : entry.translated}
                  </div>
                  {!isMe && entry.original && (
                    <div className={styles.bubbleOriginal}>
                      <span className={styles.originalLabel}>original</span>
                      <span className={styles.originalText}>
                        {entry.original}
                      </span>
                    </div>
                  )}
                  <div className={styles.bubbleTime}>
                    {entry.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {latestOriginal && latestOriginal !== "—" && (
        <div className={styles.liveBar}>
          <span className={styles.liveDot} />
          <span className={styles.liveText}>{latestOriginal}</span>
        </div>
      )}
    </div>
  );
}
