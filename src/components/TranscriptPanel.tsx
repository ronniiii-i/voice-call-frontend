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
  scrollRef,
  latestOriginal,
}: TranscriptPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Transcript</span>
        <span className={styles.headerCount}>
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
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
          entries.map((entry) => (
            <div key={entry.id} className={styles.entry}>
              <div className={styles.entryHeader}>
                <span className={styles.speakerName}>{entry.peerName}</span>
                <span className={styles.timestamp}>
                  {entry.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className={styles.translated}>{entry.translated}</div>
              <div className={styles.original}>
                <span className={styles.originalLabel}>original</span>
                <span className={styles.originalText}>{entry.original}</span>
              </div>
            </div>
          ))
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
