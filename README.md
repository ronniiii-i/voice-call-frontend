# LinguaCall Frontend

Real-time voice translation for two-person calls. Each participant speaks in their own language; the backend translates and streams the translated audio back to the other side — live, with captions.

No accounts. No downloads. Just share a room code.

---

## Features

- **Instant rooms** — create a room or join with a `xxxx-xxxx-xx` code
- **Live translated audio** — hear your peer speaking in your language in real time
- **Dual captions** — see both the original and translated text as the conversation unfolds
- **Transcript download** — export the full conversation to a `.txt` file at the end of a call
- **Mute toggle** — gated via a `useRef` to avoid stale closures in the audio processor callback
- **Supported languages** — English, French, German, Spanish, Chinese (expandable in `src/screens/Lobby.tsx`)

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Routing | React Router v7 |
| Styling | CSS Modules (no utility framework) |
| Audio capture | Web Audio API — `getUserMedia` → `ScriptProcessorNode` → PCM16 |
| Audio playback | `Audio` element via Object URLs |
| Transport | WebSocket (binary + JSON frames) |

---

## Getting started

### Prerequisites
- Node.js 18+
- A running LinguaCall backend (or a compatible WebSocket server)

### Install & run

```bash
npm install
npm run dev        # http://localhost:5173
```

### Other scripts

```bash
npm run build      # tsc -b && vite build  →  dist/
npm run preview    # Preview production build locally
npm run lint       # ESLint check
```

No test framework is configured.

---

## Configuration

The only runtime config is the **server URL**, entered in the Lobby UI under the ⚙️ Server URL toggle.

| Environment | Value |
|---|---|
| Local dev | `ws://localhost:8000` (pre-filled default) |
| Deployed | `wss://your-server.example.com` |

The frontend derives the HTTP base automatically (`ws://` → `http://`, `wss://` → `https://`) wherever it needs to call REST endpoints, so you only ever configure one URL.

---

## Screen flow

```
/ (Lobby)
  └─ enter name, language, optional server URL
  └─ New room  →  generate random roomId
  └─ Join room →  GET /rooms/:roomId  (validates existence + capacity)
        │
        ▼
/waiting/:roomId  (Waiting)
  └─ opens WebSocket, sends handshake
  └─ shows room code to share with peer
  └─ on peer_joined → navigate to /call/:roomId after 1.2 s
  └─ socket is closed before navigating; Call opens its own fresh connection
        │
        ▼
/call/:roomId  (Call)
  └─ opens new WebSocket + starts mic capture
  └─ cold reload with no sessionStorage → redirects to /waiting/:roomId
```

---

## Architecture

### Session state (`src/session.ts`)
All cross-screen state is written to `sessionStorage` under the key `linguacall_session` as `SessionConfig`:

```ts
{ displayName, nativeLanguage, languageLabel, roomId, serverUrl, userId }
```

`userId` is generated once in Lobby (`user_${random}`) and persisted for the room's lifetime.

### WebSocket protocol (`src/hooks/useWebSocket.ts`)
- **URL**: `{serverUrl}/ws/call/{roomId}/{userId}`
- **Handshake** (on open): send `{ native_lang, display_name }` as JSON
- **Keepalive**: `{ type: "ping" }` every 25 s, sent from the Call screen
- **Inbound message types**:

| Type | Frame | Description |
|---|---|---|
| `connected` | JSON | Assigned `user_id` echoed back |
| `peer_joined` | JSON | Peer's `display_name` and `peer_id` |
| `peer_left` | JSON | Peer disconnected |
| `audio_with_caption` | **Binary** | Magic header + JSON metadata + WAV audio |
| `caption` | JSON | Translation text only, no audio |
| `error` | JSON | Server-side error message |

- **Binary frame format**:
  ```
  [0xAB 0xCD 0x12 0x34]  4 bytes  magic number
  [uint32 BE]            4 bytes  byte length of JSON metadata
  [JSON bytes]           N bytes  ParsedMessage (type, text, original, …)
  [WAV bytes]            rest     audio payload
  ```
  Legacy fallback (no magic): `[uint32 BE jsonLen][JSON][WAV]`

- **Outbound audio**: raw PCM16 `ArrayBuffer` chunks sent via `ws.send(pcm)`

### Audio pipeline

```
getUserMedia (16 kHz, echoCancellation, noiseSuppression)
  └─ AudioContext @ 16 kHz
       └─ ScriptProcessorNode (4096 samples ≈ 256 ms)
            └─ float32 → Int16Array (PCM16)
                 └─ sendAudio(pcm)  ←  gated by isMutedRef

Inbound WAV bytes
  └─ Blob → Object URL → Audio element
       └─ previous Object URL revoked before each new play
```

Mute is tracked with `isMutedRef` (a `useRef`) rather than state so the audio processor callback always reads the latest value without re-creating the closure.

---

## Project structure

```
src/
├── session.ts                  # sessionStorage read/write helpers
├── App.tsx                     # Routes: / /waiting/:roomId /call/:roomId
├── screens/
│   ├── Lobby.tsx               # Name, language, room create/join flow
│   ├── Waiting.tsx             # WS connect, waits for peer_joined
│   └── Call.tsx                # Orchestrates all hooks; owns call state
├── hooks/
│   ├── useWebSocket.ts         # WS lifecycle, binary frame parser
│   ├── useAudioStream.ts       # Mic capture → PCM16 chunks
│   ├── useAudioPlayback.ts     # WAV playback via Object URLs
│   └── useTranscript.ts        # Entry list + .txt download
├── components/
│   ├── Controls.tsx            # Mute / transcript / end-call bar
│   ├── PeerTile.tsx            # Avatar tile with mic & connection ripples
│   ├── TranscriptPanel.tsx     # Scrollable transcript with live bar
│   └── EndCallModal.tsx        # Confirm + optional transcript download
└── styles/
    └── *.module.css            # One CSS Module per screen / component
```

---

## Styling conventions

- One CSS Module per file in `src/styles/`, co-named with its component (e.g., `Call.module.css`)
- Custom CSS properties only — no utility framework, no `clsx`
- Conditional variants are joined manually:
  ```ts
  const cls = [styles.btn, isActive ? styles.btnActive : ""].join(" ")
  ```
