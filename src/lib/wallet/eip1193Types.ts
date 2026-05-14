/** Minimal EIP-1193 provider surface used for chain switch / reads */

export type Eip1193RequestArgs = { method: string; params?: unknown[] };

export interface Eip1193Provider {
  request(args: Eip1193RequestArgs): Promise<unknown>;
  on?(event: "chainChanged", handler: (chainIdHex: string) => void): void;
  on?(event: "accountsChanged", handler: (accounts: string[]) => void): void;
  removeListener?(event: "chainChanged", handler: (chainIdHex: string) => void): void;
  removeListener?(
    event: "accountsChanged",
    handler: (accounts: string[]) => void,
  ): void;
}

export type InjectedEthereum = Eip1193Provider & {
  providers?: InjectedEthereum[];
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isBraveWallet?: boolean;
};
