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
}

export function useWebSocket(
  channel: WebSocketChannel,
  options: UseWebSocketOptions = {}
) {
  const {
    maxMessages = 50,
    reconnectDelay = 3000,
    enabled = true,
  } = options;

  const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws";
  
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;

    try {
      const ws = new WebSocket(`${WS_URL}/${channel}`);
      
      ws.onopen = () => {
        console.log(`[WebSocket] Connected to ${channel}`);
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
        console.log(`[WebSocket] Disconnected from ${channel}`);
        setConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (mountedRef.current && enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[WebSocket] Reconnecting to ${channel}...`);
            connect();
          }, reconnectDelay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error(`[WebSocket] Failed to connect to ${channel}:`, err);
      setError("Failed to connect");
    }
  }, [channel, enabled, maxMessages, reconnectDelay, WS_URL]);

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
