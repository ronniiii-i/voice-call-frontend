import { useRef, useCallback, useState, useEffect } from 'react'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'waiting' | 'error'

export interface ParsedMessage {
  type: string
  peer_id?: string
  text?: string
  original?: string
  message?: string
  info?: string
  user_id?: string
  audioData?: ArrayBuffer
}

interface UseWebSocketOptions {
  onMessage: (msg: ParsedMessage) => void
  onStatusChange: (status: ConnectionStatus, info?: string) => void
}

// Magic number framing: [0xAB 0xCD 0x12 0x34][uint32 jsonLen BE][json][wav]
const MAGIC = 0xabcd1234

function parseBinaryFrame(buf: ArrayBuffer): ParsedMessage | null {
  if (buf.byteLength < 8) return null
  const view = new DataView(buf)

  // Check for magic number
  const magic = view.getUint32(0, false)
  if (magic === MAGIC) {
    const jsonLen = view.getUint32(4, false)
    if (jsonLen > 0 && jsonLen + 8 <= buf.byteLength) {
      try {
        const jsonBytes = buf.slice(8, 8 + jsonLen)
        const meta = JSON.parse(new TextDecoder().decode(jsonBytes)) as ParsedMessage
        if (meta.type === 'audio_with_caption') {
          meta.audioData = buf.slice(8 + jsonLen)
        }
        return meta
      } catch { /* fall through */ }
    }
  }

  // Legacy: first 4 bytes = jsonLen (no magic)
  const jsonLen = view.getUint32(0, false)
  if (jsonLen > 0 && jsonLen + 4 <= buf.byteLength) {
    try {
      const jsonBytes = buf.slice(4, 4 + jsonLen)
      const meta = JSON.parse(new TextDecoder().decode(jsonBytes)) as ParsedMessage
      if (meta.type === 'audio_with_caption') {
        meta.audioData = buf.slice(4 + jsonLen)
      }
      return meta
    } catch { /* fall through */ }
  }

  return null
}

export function useWebSocket(opts: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const optsRef = useRef(opts)

  useEffect(() => {
    optsRef.current = opts
  }, [opts])

  const updateStatus = useCallback((s: ConnectionStatus, info?: string) => {
    setStatus(s)
    optsRef.current.onStatusChange(s, info)
  }, [])

  const connect = useCallback(async (
    serverUrl: string,
    roomId: string,
    userId: string,
    nativeLanguage: string,
    displayName: string,
  ) => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    updateStatus('connecting')
    const base = serverUrl.trim().replace(/\/$/, '')
    const url = `${base}/ws/call/${roomId}/${userId}`
    console.log('[WS] Connecting to:', url)

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        ws.send(JSON.stringify({ native_lang: nativeLanguage, display_name: displayName }))
        updateStatus('connected')
        resolve()
      }

      ws.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          const msg = parseBinaryFrame(event.data)
          if (msg) optsRef.current.onMessage(msg)
          return
        }
        if (event.data instanceof Blob) {
          const buf = await event.data.arrayBuffer()
          const msg = parseBinaryFrame(buf)
          if (msg) optsRef.current.onMessage(msg)
          return
        }
        try {
          const msg = JSON.parse(event.data as string) as ParsedMessage
          console.log('[WS] JSON:', msg)
          optsRef.current.onMessage(msg)
        } catch { /* ignore */ }
      }

      ws.onerror = () => {
        updateStatus('error', 'Connection error — check server URL')
        reject(new Error('WebSocket error'))
      }

      ws.onclose = (e) => {
        wsRef.current = null
        updateStatus('disconnected', `Disconnected (code ${e.code})`)
      }
    })
  }, [updateStatus])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const sendAudio = useCallback((pcm: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(pcm)
    }
  }, [])

  const sendJson = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { connect, disconnect, sendAudio, sendJson, status }
}