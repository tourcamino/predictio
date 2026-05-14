import { useTradingStore } from '~/store/tradingStore';
import type { MarketPrice, Orderbook, Trade } from '~/store/tradingStore';

interface TradingSocketMessage {
  type: 'price' | 'orderbook' | 'trade';
  marketId: string;
  data: any;
  timestamp: number;
}

class TradingSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscribedMarkets: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 2000; // 2 seconds
  private maxReconnectDelay = 30000; // 30 seconds
  private isConnecting = false;
  private isBrowser = typeof window !== 'undefined';

  constructor() {
    if (this.isBrowser) {
      // Only attempt connection in browser environment
      this.connect();
    }
  }

  private connect() {
    if (!this.isBrowser || this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Check if WebSocket URL is configured
    const WS_URL = import.meta.env.VITE_WS_URL;
    if (!WS_URL) {
      console.log('[TradingSocket] WebSocket URL not configured, running in offline mode');
      useTradingStore.getState().setWsStatus('offline');
      return;
    }

    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(`${WS_URL}/trading`);
      
      this.ws.onopen = () => {
        console.log('[TradingSocket] Connected');
        this.isConnecting = false;
        useTradingStore.getState().setWsStatus('connected');
        this.reconnectAttempts = 0;
        
        // Re-subscribe to all markets
        this.subscribedMarkets.forEach((marketId) => {
          this.sendSubscribe(marketId);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: TradingSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          console.error('[TradingSocket] Failed to parse message:', err);
        }
      };

      this.ws.onerror = (event) => {
        console.error('[TradingSocket] Error:', event);
        this.isConnecting = false;
      };

      this.ws.onclose = (event) => {
        console.log('[TradingSocket] Disconnected', event.code, event.reason);
        this.ws = null;
        this.isConnecting = false;
        useTradingStore.getState().setWsStatus('offline');
        
        // Only attempt reconnect if it wasn't a clean close
        if (event.code !== 1000) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      console.error('[TradingSocket] Failed to connect:', err);
      this.isConnecting = false;
      useTradingStore.getState().setWsStatus('offline');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[TradingSocket] Max reconnection attempts reached, staying offline');
      useTradingStore.getState().setWsStatus('offline');
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;
    useTradingStore.getState().setWsStatus('reconnecting');

    console.log(`[TradingSocket] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(message: TradingSocketMessage) {
    const store = useTradingStore.getState();

    switch (message.type) {
      case 'price': {
        const priceData: MarketPrice = message.data;
        store.updateMarketPrice(message.marketId, priceData);
        break;
      }

      case 'orderbook': {
        const orderbookData: Orderbook = message.data;
        store.updateOrderbook(message.marketId, orderbookData);
        break;
      }

      case 'trade': {
        const tradeData: Trade = message.data;
        store.addTrade(message.marketId, tradeData);
        break;
      }

      default:
        console.warn('[TradingSocket] Unknown message type:', message.type);
    }
  }

  private sendSubscribe(marketId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        marketId,
        channels: ['price', 'orderbook', 'trade'],
      }));
    }
  }

  private sendUnsubscribe(marketId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        marketId,
      }));
    }
  }

  private syncSubscriptionCountToStore() {
    useTradingStore.getState().setWsSubscribedMarketCount(this.subscribedMarkets.size);
  }

  public subscribe(marketId: string) {
    if (!this.subscribedMarkets.has(marketId)) {
      this.subscribedMarkets.add(marketId);
      this.sendSubscribe(marketId);
      console.log(`[TradingSocket] Subscribed to ${marketId}`);
      this.syncSubscriptionCountToStore();
    }
  }

  public unsubscribe(marketId: string) {
    if (this.subscribedMarkets.has(marketId)) {
      this.subscribedMarkets.delete(marketId);
      this.sendUnsubscribe(marketId);
      useTradingStore.getState().clearMarketData(marketId);
      console.log(`[TradingSocket] Unsubscribed from ${marketId}`);
      this.syncSubscriptionCountToStore();
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.subscribedMarkets.clear();
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    useTradingStore.getState().setWsStatus('offline');
    useTradingStore.getState().setWsSubscribedMarketCount(0);
  }

  public getConnectionState(): 'connected' | 'connecting' | 'offline' {
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'offline';
  }
}

// Singleton instance
let tradingSocketInstance: TradingSocketClient | null = null;

export function getTradingSocket(): TradingSocketClient {
  if (!tradingSocketInstance) {
    tradingSocketInstance = new TradingSocketClient();
  }
  return tradingSocketInstance;
}

export function disconnectTradingSocket() {
  if (tradingSocketInstance) {
    tradingSocketInstance.disconnect();
    tradingSocketInstance = null;
  }
}
