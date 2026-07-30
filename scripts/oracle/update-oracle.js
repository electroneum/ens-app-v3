import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const electroneumMainnet = {
  id: 52014,
  name: 'Electroneum Mainnet',
  nativeCurrency: { name: 'Electroneum', symbol: 'ETN', decimals: 18 },
  rpcUrls: { default: { http: [process.env.RPC_URL] } },
}

const oracleAbi = parseAbi([
  'function set(int256 _value) public',
  'function latestAnswer() public view returns (int256)',
])

const MIN_SANE_USD = 0.00001
const MAX_SANE_USD = 0.1
const MAX_DEVIATION_PERCENT = 50
const isDryRun = process.env.DRY_RUN === 'true'

async function fetchEtnPriceUsd() {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=electroneum&vs_currencies=usd',
  )
  if (!res.ok) throw new Error(`CoinGecko fetch failed: ${res.status}`)
  const data = await res.json()
  const price = data?.electroneum?.usd
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    throw new Error(`Unexpected CoinGecko response: ${JSON.stringify(data)}`)
  }
  return price
}

async function main() {
  console.log(isDryRun ? '--- DRY RUN (no on-chain write) ---' : '--- LIVE RUN ---')

  const publicClient = createPublicClient({ chain: electroneumMainnet, transport: http() })

  const priceUsd = await fetchEtnPriceUsd()
  console.log(`Fetched ETN price: $${priceUsd}`)

  if (priceUsd < MIN_SANE_USD || priceUsd > MAX_SANE_USD) {
    throw new Error(`Price $${priceUsd} outside sane bounds [$${MIN_SANE_USD}, $${MAX_SANE_USD}] — aborting`)
  }

  const newValue = BigInt(Math.round(priceUsd * 1e8))

  const currentValue = await publicClient.readContract({
    address: process.env.ORACLE_ADDRESS,
    abi: oracleAbi,
    functionName: 'latestAnswer',
  })

  console.log(`Current on-chain value: ${currentValue}`)
  console.log(`Computed new value:     ${newValue}`)

  if (currentValue > 0n) {
    const diffPercent =
      Number(((newValue - currentValue) * 10000n) / currentValue) / 100
    console.log(`Deviation: ${diffPercent.toFixed(2)}%`)
    if (Math.abs(diffPercent) > MAX_DEVIATION_PERCENT) {
      throw new Error(
        `New value ${newValue} deviates ${diffPercent.toFixed(1)}% from current ${currentValue} — aborting (possible bad fetch)`,
      )
    }
  }

  if (isDryRun) {
    console.log('Dry run complete — no transaction sent.')
    return
  }

  if (!process.env.ORACLE_OWNER_PRIVATE_KEY) {
    throw new Error('ORACLE_OWNER_PRIVATE_KEY is not set — cannot perform live write.')
  }

  const account = privateKeyToAccount(process.env.ORACLE_OWNER_PRIVATE_KEY)
  const walletClient = createWalletClient({
    account,
    chain: electroneumMainnet,
    transport: http(),
  })

  console.log(`Setting oracle: ${currentValue} -> ${newValue}`)

  const hash = await walletClient.writeContract({
    address: process.env.ORACLE_ADDRESS,
    abi: oracleAbi,
    functionName: 'set',
    args: [newValue],
  })

  console.log(`Tx sent: ${hash}`)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(`Confirmed in block ${receipt.blockNumber}, status: ${receipt.status}`)
}

main().catch((err) => {
  console.error('Oracle update failed:', err)
  process.exit(1)
})