import { useRef, useCallback } from "react";

export function useAudioPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  const playAudio = useCallback((wavData: ArrayBuffer) => {
    if (!wavData || wavData.byteLength === 0) return;
    try {
      // Revoke previous object URL
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }

      const blob = new Blob([wavData], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      currentUrlRef.current = url;

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = url;
      audioRef.current
        .play()
        .catch((e) => console.warn("[Audio] Play blocked:", e));
      audioRef.current.onended = () => {
        URL.revokeObjectURL(url);
        if (currentUrlRef.current === url) currentUrlRef.current = null;
      };
    } catch (err) {
      console.warn("[Audio] Error:", err);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
  }, []);

  return { playAudio, stopAudio };
}
