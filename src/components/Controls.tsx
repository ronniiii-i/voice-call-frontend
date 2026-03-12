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
          icon={isMuted ? "🔇" : "🎙️"}
          label={isMuted ? "Unmute" : "Mute"}
          onClick={onMute}
          variant={isMuted ? "danger" : "default"}
        />
        <CtrlBtn
          icon="💬"
          label={showTranscript ? "Hide" : "Transcript"}
          onClick={onToggleTranscript}
          variant={showTranscript ? "active" : "default"}
        />
        {hasTranscript && (
          <CtrlBtn
            icon="⬇️"
            label="Download"
            onClick={onDownload}
            variant="default"
          />
        )}
      </div>

      <button className={styles.endBtn} onClick={onEndCall} type="button">
        <span className={styles.endIcon}>📵</span>
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
  icon: string;
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
