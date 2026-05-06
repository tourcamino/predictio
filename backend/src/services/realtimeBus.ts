import { EventEmitter } from "node:events";

export type TradingWsMessage =
  | {
      type: "trade";
      marketId: string;
      data: unknown;
      timestamp: number;
    }
  | {
      type: "market";
      marketId: string;
      data: unknown;
      timestamp: number;
    };

class RealtimeBus extends EventEmitter {
  emitMessage(msg: TradingWsMessage) {
    this.emit("message", msg);
  }
}

export const realtimeBus = new RealtimeBus();

