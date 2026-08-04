export const emptyAddress = '0x0000000000000000000000000000000000000000'

export const GRACE_PERIOD = 90 * 24 * 60 * 60 * 1000

export const FAUCET_WORKER_URL = 'https://ens-faucet.ens-cf.workers.dev'

// Electroneum's WalletConnect project (overridable via env)
export const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'e8b39cfa38197aaacbb414e39c83c2e0'

// 102% of price as buffer for fluctuations
export const CURRENCY_FLUCTUATION_BUFFER_PERCENTAGE = 102n

export const IS_DEV_ENVIRONMENT =
  process.env.NEXT_PUBLIC_ENSJS_DEBUG ||
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_PROVIDER

export const INVALID_NAME = '[Invalid ENS Name]'

export const ENS_LINKS = {
  X: 'https://x.com/electroneum',
  DISCORD: 'https://discord.com/invite/electroneum-999612117521010768',
  //  MIRROR: 'https://ens.mirror.xyz',
  //  DISCOURSE: 'https://discuss.ens.domains',
  TELEGRAM: 'https://t.me/electroneum',
  GITHUB: 'https://github.com/electroneum',
  EMAIL: 'mailto:support@electroneum.com',
  HOMEPAGE: 'https://ens.electroneum.com/',
  YOUTUBE: 'https://www.youtube.com/electroneum',
}

export const DISCONNECTED_PLACEHOLDER_ADDRESS =
  '0x0000000000000000000000000000000000001234' as const
