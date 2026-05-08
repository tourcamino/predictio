import { useEffect, useState, useRef, useCallback } from "react";

export type WebSocketChannel = "markets" | "platform" | "growth" | "admin";

export interface WebSocketMessage {
  channel: WebSocketChannel;
  event: string;
  data: any;
  timestamp?: number;
}

interface UseWebSocketOptions {
  maxMessages?: number;
  reconnectDelay?: number;
  enabled?: boolean;
  maxReconnectAttempts?: number;
}

export function useWebSocket(
  channel: WebSocketChannel,
  options: UseWebSocketOptions = {}
) {
  const {
    maxMessages = 50,
    reconnectDelay = 3000,
    enabled = true,
    maxReconnectAttempts = 5,
  } = options;

  // No localhost fallback: when VITE_WS_URL is unset there is no realtime server in dev,
  // so the previous fallback caused an infinite reconnect storm that re-rendered every
  // consumer roughly every `reconnectDelay`.
  const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined)?.trim() || null;

  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const attemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;
    if (!WS_URL) {
      // Realtime not configured for this environment.
      setError("offline");
      return;
    }

    try {
      const ws = new WebSocket(`${WS_URL}/${channel}`);

      ws.onopen = () => {
        console.log(`[WebSocket] Connected to ${channel}`);
        attemptsRef.current = 0;
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          setMessages((prev) => [msg, ...prev].slice(0, maxMessages));
        } catch (err) {
          console.error("[WebSocket] Failed to parse message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error(`[WebSocket] Error on ${channel}:`, event);
        setError("Connection error");
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        if (!mountedRef.current || !enabled) return;

        if (attemptsRef.current >= maxReconnectAttempts) {
          console.warn(
            `[WebSocket] Giving up on ${channel} after ${attemptsRef.current} attempts`,
          );
          setError("offline");
          return;
        }

        // Exponential backoff with jitter, capped at 30s.
        const delay = Math.min(
          reconnectDelay * Math.pow(2, attemptsRef.current) +
            Math.random() * 500,
          30_000,
        );
        attemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error(`[WebSocket] Failed to connect to ${channel}:`, err);
      setError("Failed to connect");
    }
  }, [
    channel,
    enabled,
    maxMessages,
    reconnectDelay,
    maxReconnectAttempts,
    WS_URL,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnected(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    messages,
    connected,
    error,
    clearMessages,
    reconnect: connect,
  };
}
