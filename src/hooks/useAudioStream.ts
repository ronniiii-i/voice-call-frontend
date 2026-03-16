import { useRef, useCallback, useState } from "react";

export function useAudioStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const onChunkRef = useRef<((pcm: ArrayBuffer) => void) | null>(null);

  const startStreaming = useCallback(
    async (onChunk: (pcm: ArrayBuffer) => void): Promise<boolean> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
          },
        });

        const ctx = new AudioContext({ sampleRate: 16000 });
        const source = ctx.createMediaStreamSource(stream);
        // 4096 samples @ 16kHz ≈ 256ms — good VAD granularity
        const processor = ctx.createScriptProcessor(4096, 1, 1);

        onChunkRef.current = onChunk;

        processor.onaudioprocess = (e) => {
          if (!onChunkRef.current) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          onChunkRef.current(pcm16.buffer);
        };

        source.connect(processor);
        processor.connect(ctx.destination);

        mediaStreamRef.current = stream;
        audioContextRef.current = ctx;
        processorRef.current = processor;

        setIsStreaming(true);
        console.log("[Mic] Streaming PCM16 @ 16kHz");
        return true;
      } catch (err) {
        console.error("[Mic] Error:", err);
        return false;
      }
    },
    [],
  );

  const stopStreaming = useCallback(() => {
    onChunkRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setIsStreaming(false);
  }, []);

  return { isStreaming, startStreaming, stopStreaming };
}
