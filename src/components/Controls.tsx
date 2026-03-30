import type { ReactNode } from "react";
import styles from "../styles/Controls.module.css";

interface ControlsProps {
  isMuted: boolean;
  showTranscript: boolean;
  hasTranscript: boolean;
  onMute: () => void;
  onToggleTranscript: () => void;
  onDownload: () => void;
  onEndCall: () => void;
}

export default function Controls({
  isMuted,
  showTranscript,
  hasTranscript,
  onMute,
  onToggleTranscript,
  onDownload,
  onEndCall,
}: ControlsProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.group}>
        <CtrlBtn
          icon={isMuted ? <MutedIcon /> : <MicIcon />}
          label={isMuted ? "Unmute" : "Mute"}
          onClick={onMute}
          variant={isMuted ? "danger" : "default"}
        />
        <CtrlBtn
          icon={<TranscriptIcon />}
          label={showTranscript ? "Hide" : "Transcript"}
          onClick={onToggleTranscript}
          variant={showTranscript ? "active" : "default"}
        />
        {hasTranscript && (
          <CtrlBtn
            icon={<DownloadIcon />}
            label="Download"
            onClick={onDownload}
            variant="default"
          />
        )}
      </div>

      <button className={styles.endBtn} onClick={onEndCall} type="button">
        End call
      </button>
    </div>
  );
}

function CtrlBtn({
  icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "active" | "danger";
}) {
  const cls = [
    styles.btn,
    variant === "active" ? styles.btnActive : "",
    variant === "danger" ? styles.btnDanger : "",
  ].join(" ");

  return (
    <button className={cls} onClick={onClick} type="button" title={label}>
      <span className={styles.btnIcon}>{icon}</span>
      <span className={styles.btnLabel}>{label}</span>
    </button>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 11.5a6 6 0 0 1-12 0M12 17.5V21M9 21h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 11.5a6 6 0 0 1-1.06 3.46M6 11.5a6 6 0 0 0 8.67 5.37M12 17.5V21M9 21h6M4 4l16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TranscriptIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4 4v-4H7.5A2.5 2.5 0 0 1 5 12.5v-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 8.5h6M9 11.5h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4v10M8.5 10.5 12 14l3.5-3.5M5 18.5h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
