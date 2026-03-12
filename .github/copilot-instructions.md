# LinguaCall Frontend – Copilot Instructions

## What this project is

LinguaCall is a two-participant real-time audio call app with live speech translation. Each participant speaks in their native language; the backend translates and streams the translated audio back to the other side.

## Developer workflows

```bash
npm run dev       # Start Vite dev server (HMR)
npm run build     # tsc -b && vite build
npm run lint      # ESLint check
npm run preview   # Preview production build
```

No test framework is configured.

## Screen flow & routing

```
/ (Lobby) → /waiting/:roomId (Waiting) → /call/:roomId (Call)
```

- **Lobby** collects name, language, server URL, and room code
- **Waiting** opens the first WebSocket connection; navigates to Call when `peer_joined` is received
- **Call** opens a fresh WebSocket connection (Waiting's socket is always closed before navigating)
- A cold reload on `/call/:roomId` with no session redirects back to `/waiting/:roomId`

## Session state (`src/session.ts`)

All cross-screen state is stored in `sessionStorage` under key `linguacall_session` as `SessionConfig`:

```ts
{
  (displayName, nativeLanguage, languageLabel, roomId, serverUrl, userId);
}
```

`userId` is generated once in Lobby as `user_${random}` and reused for the room's lifetime.

## WebSocket protocol (`src/hooks/useWebSocket.ts`)

- **URL**: `{serverUrl}/ws/call/{roomId}/{userId}`
- **Handshake**: on open, send `{ native_lang, display_name }` as JSON
- **Keepalive**: `{ type: "ping" }` sent every 25 s from Call screen
- **Binary frame format** (server → client):
  - Magic `[0xAB 0xCD 0x12 0x34]` + `uint32 jsonLen` (BE) + JSON metadata + WAV audio
  - Legacy fallback: `uint32 jsonLen` (no magic) + JSON + WAV
- **Inbound message types**: `connected`, `peer_joined`, `peer_left`, `audio_with_caption`, `caption`, `error`
- **Outbound audio**: raw PCM16 `ArrayBuffer` chunks sent directly via `ws.send(pcm)`

## Audio pipeline

- **Capture** (`src/hooks/useAudioStream.ts`): `getUserMedia` → `AudioContext` at 16 kHz → `ScriptProcessorNode` (4096 samples ≈ 256 ms) → PCM16 `ArrayBuffer`
- **Mute**: `isMutedRef` (a `useRef`, not state) gates whether chunks are forwarded to `sendAudio`. The ref avoids stale closures inside the audio processor callback.
- **Playback** (`src/hooks/useAudioPlayback.ts`): WAV `ArrayBuffer` from binary frame → `Blob` → Object URL → `Audio` element; previous URL is revoked before each new play

## Server URL

The server URL field in Lobby defaults to `ws://localhost:8000` for local development. For deployed environments, users supply their own URL. The Lobby converts the WS scheme to HTTP when calling the rooms REST endpoint (`wss://` → `https://`, `ws://` → `http://`), so only one URL needs to be configured.

## Room validation (Lobby join path)

Before navigating to Waiting, Lobby calls:

```
GET {serverUrl}/rooms/{roomId}
→ { exists: boolean, occupants: number }
```

Room code format: `/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{2}$/`

## Transcript (`src/hooks/useTranscript.ts`)

Only peer speech is recorded (`speaker: "peer"` always). Each entry holds both `original` and `translated` text. `downloadTranscript()` generates a `.txt` file via Object URL.

## Styling conventions

- One CSS Module per screen/component in `src/styles/` (e.g., `Call.module.css`, `Controls.module.css`)
- No global CSS framework; custom properties and plain CSS only
- Status dot and avatar variants use conditionally joined class strings (no `clsx`)

## Key files

| File                            | Purpose                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| `src/session.ts`                | Cross-screen session persistence via `sessionStorage`       |
| `src/hooks/useWebSocket.ts`     | WS lifecycle, binary frame parser, `sendAudio` / `sendJson` |
| `src/hooks/useAudioStream.ts`   | Mic capture → PCM16 chunks                                  |
| `src/hooks/useAudioPlayback.ts` | WAV playback via Object URLs                                |
| `src/screens/Call.tsx`          | Orchestrates all hooks; owns call state                     |
