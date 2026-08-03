import type { Chain } from 'viem'

export const electroneumMainnet = {
  id: 52014,
  name: 'Electroneum',
  nativeCurrency: { name: 'Electroneum', symbol: 'ETN', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ETN_MAINNET_RPC_URL || 'https://rpc.ankr.electroneum.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Electroneum Explorer', url: 'https://blockexplorer.electroneum.com' },
  },
  formatters: undefined,
} as const satisfies Chain

export const electroneumTestnet = {
  id: 5201420,
  name: 'Electroneum Testnet',
  nativeCurrency: { name: 'Electroneum', symbol: 'ETN', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ETN_TESTNET_RPC_URL || 'https://rpc.ankr.com/electroneum_testnet',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Electroneum Testnet Explorer',
      url: 'https://testnet-blockexplorer.electroneum.com',
    },
  },
  testnet: true,
  formatters: undefined,
} as const satisfies Chain
