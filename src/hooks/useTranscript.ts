import { useState, useCallback, useRef } from "react";

export interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: "me" | "peer";
  displayName: string;
  original: string;
  translated: string;
}

export function useTranscript() {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const counterRef = useRef(0);

  const addEntry = useCallback(
    (data: {
      speaker: "me" | "peer";
      displayName: string;
      original: string;
      translated: string;
    }) => {
      const entry: TranscriptEntry = {
        id: `t-${++counterRef.current}`,
        timestamp: new Date(),
        speaker: data.speaker,
        displayName: data.displayName,
        original: data.original,
        translated: data.translated,
      };
      setEntries((prev) => [...prev, entry]);
    },
    [],
  );

  const downloadTranscript = useCallback(
    (roomId: string, myName: string, peerName: string) => {
      if (entries.length === 0) return;

      const lines: string[] = [
        "LinguaCall Transcript",
        `Date: ${new Date().toLocaleString()}`,
        `Room: ${roomId}`,
        `Participants: ${myName}, ${peerName || "Unknown peer"}`,
        "─".repeat(50),
        "",
      ];

      entries.forEach((e) => {
        const time = e.timestamp.toLocaleTimeString();
        lines.push(`[${time}] ${e.displayName}:`);
        if (e.speaker === "peer") {
          lines.push(`  Original:   ${e.original}`);
          lines.push(`  Translated: ${e.translated}`);
        } else {
          lines.push(`  ${e.original}`);
        }
        lines.push("");
      });

      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `linguacall-${roomId}-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [entries],
  );

  const clear = useCallback(() => setEntries([]), []);

  return { entries, addEntry, downloadTranscript, clear };
}
