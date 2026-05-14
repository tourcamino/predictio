/**
 * ⚠️ NOT PART OF PAPER RUNTIME — DEV / LEGACY / SCRIPTS ONLY
 *
 * `executeBuy` / `executeSell` here are **not** used by the Predictio app for paper or guest demo.
 * Paper: `placePrediction` / `closePosition` (tRPC). Demo: `executeDemoTrade` + `demoStorage`.
 *
 * Do not wire these into product UI; on-chain live paths belong in a dedicated settlement module.
 */
import { isLiveMode } from '~/config/chain';
import { calculateSharesFromAmount, calculateAmountFromShares } from '../calculations';
import type { TxResult } from '~/store/tradingStore';

export interface SellParams {
  positionId: string;
  marketId: string;
  shares: number;
  price: number;
  slippageBps: number;
}

export interface BuyParams {
  marketId: string;
  outcome: 'YES' | 'NO' | 'DRAW';
  amountUSDC: number;
  price: number;
  slippageBps: number;
}

export async function executeSell(params: SellParams): Promise<TxResult> {
  if (!isLiveMode()) {
    return mockSellExecution(params);
  }

  return onChainSellExecution(params);
}

export async function executeBuy(params: BuyParams): Promise<TxResult> {
  if (!isLiveMode()) {
    return mockBuyExecution(params);
  }

  return onChainBuyExecution(params);
}

async function mockSellExecution(params: SellParams): Promise<TxResult> {
  await new Promise((resolve) => setTimeout(resolve, 180 + Math.random() * 120));

  const { net } = calculateAmountFromShares(params.shares, params.price, false);

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[legacy devMockExecution mock sell]', {
      positionId: params.positionId,
      shares: params.shares,
      price: params.price,
      proceeds: net,
    });
  }

  const mockTxHash = `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('')}`;

  return {
    success: true,
    txHash: mockTxHash,
    mode: 'demo',
  };
}

async function mockBuyExecution(params: BuyParams): Promise<TxResult> {
  await new Promise((resolve) => setTimeout(resolve, 180 + Math.random() * 120));

  const { shares, fee } = calculateSharesFromAmount(params.amountUSDC, params.price, true);

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[legacy devMockExecution mock buy]', {
      marketId: params.marketId,
      outcome: params.outcome,
      amount: params.amountUSDC,
      price: params.price,
      shares,
      fee,
    });
  }

  const mockTxHash = `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('')}`;

  return {
    success: true,
    txHash: mockTxHash,
    mode: 'demo',
  };
}

async function onChainSellExecution(_params: SellParams): Promise<TxResult> {
  throw new Error('Live mode not yet implemented. Contracts TBD.');
}

async function onChainBuyExecution(_params: BuyParams): Promise<TxResult> {
  throw new Error('Live mode not yet implemented. Contracts TBD.');
}
