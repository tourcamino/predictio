import {
  getExpectedPredictioChain,
  getExpectedChainId,
  toWalletAddEthereumChainParameter,
} from "~/config/chains";
import type { Eip1193Provider } from "./eip1193Types";

const isDev =
  typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);

export function walletDevLog(
  tag: string,
  payload: Record<string, unknown>,
): void {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.debug(`[predictio:wallet] ${tag}`, payload);
}

function rpcErrorCode(err: unknown): number | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code?: unknown }).code;
    if (typeof c === "number") return c;
    if (typeof c === "string" && c.trim() !== "") {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function isUserRejected(err: unknown): boolean {
  const c = rpcErrorCode(err);
  if (c === 4001) return true;
  if (err && typeof err === "object" && "code" in err) {
    const raw = (err as { code?: unknown }).code;
    if (raw === "ACTION_REJECTED") return true;
  }
  return false;
}

/** Chain not added in wallet (MetaMask / EIP-1193). */
function isChainNotAdded(err: unknown): boolean {
  return rpcErrorCode(err) === 4902;
}

export function formatWalletSwitchUserMessage(err: unknown): string {
  if (isUserRejected(err)) {
    return "Request cancelled in wallet.";
  }
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Could not change network.";
  if (/wallet/i.test(msg) && /not/i.test(msg)) return msg;
  return msg.length > 160 ? `${msg.slice(0, 157)}…` : msg;
}

/**
 * `wallet_switchEthereumChain` then `wallet_addEthereumChain` on 4902.
 */
export async function switchToPredictioChain(
  provider: Eip1193Provider,
): Promise<void> {
  const target = getExpectedPredictioChain();
  const expectedId = getExpectedChainId();

  walletDevLog("switch_attempt", {
    expectedChainId: expectedId,
    expectedHex: target.chainIdHex,
  });

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: target.chainIdHex }],
    });
    walletDevLog("switch_ok", { chainId: expectedId });
    return;
  } catch (e) {
    walletDevLog("switch_error", {
      code: rpcErrorCode(e),
      message: e instanceof Error ? e.message : String(e),
    });
    if (isUserRejected(e)) throw e;
    if (!isChainNotAdded(e)) throw e;
  }

  walletDevLog("add_chain_attempt", { chainId: expectedId });
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [toWalletAddEthereumChainParameter(target)],
    });
    walletDevLog("add_chain_ok", { chainId: expectedId });
  } catch (e) {
    walletDevLog("add_chain_error", {
      code: rpcErrorCode(e),
      message: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

export async function readChainIdDecimal(
  provider: Eip1193Provider,
): Promise<number | null> {
  try {
    const hex = (await provider.request({ method: "eth_chainId" })) as string;
    if (typeof hex !== "string" || !hex.startsWith("0x")) return null;
    return parseInt(hex, 16);
  } catch {
    return null;
  }
}
