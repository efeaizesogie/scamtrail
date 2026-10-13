export type Chain = {
  id: number;
  name: string;
  /** Chain slug used by DexScreener. */
  dex: string;
  /** Platform key used by CoinGecko. */
  coingecko: string;
  explorer: string;
  rpc: string;
};

export const CHAINS: Chain[] = [
  { id: 1, name: "Ethereum", dex: "ethereum", coingecko: "ethereum", explorer: "https://etherscan.io", rpc: "https://ethereum-rpc.publicnode.com" },
  { id: 8453, name: "Base", dex: "base", coingecko: "base", explorer: "https://basescan.org", rpc: "https://base-rpc.publicnode.com" },
  { id: 56, name: "BNB Chain", dex: "bsc", coingecko: "binance-smart-chain", explorer: "https://bscscan.com", rpc: "https://bsc-rpc.publicnode.com" },
  { id: 42161, name: "Arbitrum", dex: "arbitrum", coingecko: "arbitrum-one", explorer: "https://arbiscan.io", rpc: "https://arbitrum-one-rpc.publicnode.com" },
  { id: 137, name: "Polygon", dex: "polygon", coingecko: "polygon-pos", explorer: "https://polygonscan.com", rpc: "https://polygon-bor-rpc.publicnode.com" },
];

export const chainById = (id: number) => CHAINS.find((c) => c.id === id);
export const chainByDex = (slug: string) => CHAINS.find((c) => c.dex === slug);

export const explorerAddress = (chainId: number, addr: string) => `${chainById(chainId)?.explorer ?? CHAINS[0].explorer}/address/${addr}`;
export const explorerTx = (chainId: number, hash: string) => `${chainById(chainId)?.explorer ?? CHAINS[0].explorer}/tx/${hash}`;
export const explorerBlock = (chainId: number, block: string | number) => `${chainById(chainId)?.explorer ?? CHAINS[0].explorer}/block/${block}`;
