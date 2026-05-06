import { verifyTypedData, type TypedDataField } from "ethers";

export interface APIKeyRequestMessage {
  wallet: string;
  nonce: string;
  expires: number;
}

export const EIP712_DOMAIN = {
  name: "Predictio",
  version: "1",
  chainId: 8453, // Base
} as const;

export const API_KEY_REQUEST_TYPES: Record<string, TypedDataField[]> = {
  APIKeyRequest: [
    { name: "wallet", type: "address" },
    { name: "nonce", type: "bytes32" },
    { name: "expires", type: "uint256" },
  ],
};

export function verifyAPIKeySignature(
  message: APIKeyRequestMessage,
  signature: string
): string {
  try {
    const recoveredAddress = verifyTypedData(
      EIP712_DOMAIN,
      API_KEY_REQUEST_TYPES,
      message,
      signature
    );

    return recoveredAddress.toLowerCase();
  } catch {
    throw new Error("Invalid signature");
  }
}

export function generateChallengeMessage(
  walletAddress: string,
  nonce: string,
  expiresAt: number
): string {
  return `Generate Predictio API key for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} nonce: ${nonce.slice(0, 8)}... expires: ${new Date(expiresAt * 1000).toISOString()}`;
}

