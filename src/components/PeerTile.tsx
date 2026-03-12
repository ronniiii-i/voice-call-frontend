import styles from "../styles/PeerTile.module.css";

interface PeerTileProps {
  name: string;
  language: string;
  isSelf?: boolean;
  isMuted?: boolean;
  isStreaming?: boolean;
  isConnected?: boolean;
  latestCaption?: string;
}

export default function PeerTile({
  name,
  language,
  isSelf,
  isMuted,
  isStreaming,
  isConnected,
  latestCaption,
}: PeerTileProps) {
  const initials = name.slice(0, 2).toUpperCase();

  const avatarClass = [
    styles.avatarInner,
    isSelf
      ? styles.avatarSelf
      : isConnected
        ? styles.avatarPeerConnected
        : styles.avatarPeerWaiting,
  ].join(" ");

  return (
    <div className={`${styles.tile} ${isSelf ? styles.tileSelf : ""}`}>
      <div className={styles.avatarWrap}>
        <div className={avatarClass}>
          <span className={styles.initials}>{initials}</span>
        </div>

        {/* Peer connected ripple */}
        {!isSelf && isConnected && <span className={styles.ripple} />}

        {/* Mic activity ripple on self tile */}
        {isSelf && isStreaming && !isMuted && (
          <div className={styles.micRippleWrap}>
            <span
              className={styles.ripplePulse}
              style={{ animationDelay: "0s" }}
            />
            <span
              className={styles.ripplePulse}
              style={{ animationDelay: "0.5s" }}
            />
          </div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{name}</span>
          {isSelf && <span className={styles.youBadge}>you</span>}
          {!isSelf && isConnected && <span className={styles.onlineDot} />}
        </div>
        <span className={styles.lang}>{language}</span>
        {isSelf && isMuted && (
          <span className={styles.mutedBadge}>🔇 muted</span>
        )}
      </div>

      {latestCaption && <div className={styles.caption}>{latestCaption}</div>}
    </div>
  );
}
