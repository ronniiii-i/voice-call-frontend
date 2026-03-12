import styles from "../styles/EndCallModal.module.css";

interface EndCallModalProps {
  hasTranscript: boolean;
  onConfirm: (download: boolean) => void;
  onCancel: () => void;
}

export default function EndCallModal({
  hasTranscript,
  onConfirm,
  onCancel,
}: EndCallModalProps) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.icon}>📵</div>
        <h2 className={styles.title}>End this call?</h2>
        <p className={styles.body}>
          {hasTranscript
            ? "Your transcript will be lost unless you download it first."
            : "The call will be disconnected."}
        </p>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} type="button">
            Cancel
          </button>

          {hasTranscript && (
            <button
              className={styles.downloadBtn}
              onClick={() => onConfirm(true)}
              type="button"
            >
              ⬇️ Download &amp; end
            </button>
          )}

          <button
            className={styles.endBtn}
            onClick={() => onConfirm(false)}
            type="button"
          >
            End call
          </button>
        </div>
      </div>
    </div>
  );
}
