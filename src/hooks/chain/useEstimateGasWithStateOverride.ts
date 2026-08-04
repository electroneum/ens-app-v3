import { QueryFunctionContext } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  Address,
  BlockNumber,
  BlockTag,
  concatHex,
  formatEther,
  formatTransactionRequest,
  Hex,
  hexToBigInt,
  keccak256,
  padHex,
  parseEther,
  RpcTransactionRequest,
  toHex,
} from 'viem'
import { useConnectorClient } from 'wagmi'

import { useQueryOptions } from '@app/hooks/useQueryOptions'
import {
  createTransactionRequest,
  TransactionName,
  TransactionParameters,
} from '@app/transaction-flow/transaction'
import {
  ConfigWithEns,
  ConnectorClientWithEns,
  CreateQueryKey,
  Prettify,
  QueryConfig,
} from '@app/types'
import { DISCONNECTED_PLACEHOLDER_ADDRESS } from '@app/utils/constants'
import { getIsCachedData } from '@app/utils/getIsCachedData'
import { prepareQueryOptions } from '@app/utils/prepareQueryOptions'
import { useQuery } from '@app/utils/query/useQuery'

import { useGasPrice } from './useGasPrice'

type UserStateValue = {
  slot: number
  keys: Hex[]
  value: Hex | boolean | bigint
}

type UserStateOverrides = {
  address: Address
  /* Fake balance to set for the account before executing the call */
  balance?: bigint
  /* Fake nonce to set for the account before executing the call */
  nonce?: number
  /* Fake EVM bytecode to inject into the account before executing the call */
  code?: Hex
  /* Fake key-value mapping to override **all** slots in the account storage before executing the call */
  state?: UserStateValue[]
  /* Fake key-value mapping to override **individual** slots in the account storage before executing the call */
  stateDiff?: UserStateValue[]
}[]

type StateOverride<Quantity256 = bigint, Quantity = number> = {
  [address: Address]: {
    /* Fake balance to set for the account before executing the call */
    balance?: Quantity256
    /* Fake nonce to set for the account before executing the call */
    nonce?: Quantity
    /* Fake EVM bytecode to inject into the account before executing the call */
    code?: Hex
    /* Fake key-value mapping to override **all** slots in the account storage before executing the call */
    state?: {
      [slot: Hex]: Hex
    }
    /* Fake key-value mapping to override **individual** slots in the account storage before executing the call */
    stateDiff?: {
      [slot: Hex]: Hex
    }
  }
}

export type TransactionItem = {
  [TName in TransactionName]: Omit<TransactionParameters<TName>, 'client' | 'connectorClient'> & {
    name: TName
    stateOverride?: UserStateOverrides
  }
}[TransactionName]

export type UseEstimateGasWithStateOverrideParameters<
  TransactionItems extends TransactionItem[] | readonly TransactionItem[],
> = {
  transactions: TransactionItems
}

type GasEstimateArray<TransactionItems extends TransactionItem[] | readonly TransactionItem[]> =
  Prettify<{
    [n in keyof TransactionItems]: bigint
  }>

type UseEstimateGasWithStateOverrideReturnType<
  TransactionItems extends TransactionItem[] | readonly TransactionItem[] = TransactionItem[],
> = {
  reduced: bigint
  gasEstimates: GasEstimateArray<TransactionItems>
}

type UseEstimateGasWithStateOverrideConfig = QueryConfig<
  UseEstimateGasWithStateOverrideReturnType,
  Error
>

type QueryKey<
  TransactionItems extends TransactionItem[] | readonly TransactionItem[],
  TParams extends UseEstimateGasWithStateOverrideParameters<TransactionItems>,
> = CreateQueryKey<TParams, 'estimateGasWithStateOverride', 'standard'>

// Ankr's Electroneum RPC node doesn't support the stateOverride parameter on
// eth_estimateGas, so simulated gas estimates aren't possible for transactions
// that rely on it (e.g. registerName's commit-maturity time-travel trick).
// These are conservative static approximations used as a fallback in that case.
const FALLBACK_GAS_ESTIMATES: Partial<Record<TransactionName, bigint>> = {
  commitName: 80_000n,
  registerName: 300_000n,
}

const leftPadBytes32 = (hex: Hex) => padHex(hex, { dir: 'left', size: 32 })

const concatKey = (existing: Hex, key: Hex) => keccak256(concatHex([leftPadBytes32(key), existing]))
const calculateStorageValue = (value: UserStateValue['value']) => {
  if (typeof value === 'boolean') {
    return value ? leftPadBytes32('0x01') : leftPadBytes32('0x00')
  }

  if (typeof value === 'bigint') {
    return leftPadBytes32(toHex(value))
  }

  return leftPadBytes32(value)
}

const mapUserState = (state: UserStateValue[]) =>
  Object.fromEntries(
    state.map(({ slot, keys, value }) => {
      const storageKey = keys.reduce(concatKey, leftPadBytes32(toHex(slot)))
      const storageValue = calculateStorageValue(value)
      return [storageKey, storageValue]
    }),
  )

export const addStateOverride = <
  const TTransactionItem extends TransactionItem | Readonly<TransactionItem>,
  const TStateOverride extends UserStateOverrides,
>({
  item,
  stateOverride,
}: {
  item: TTransactionItem
  stateOverride: TStateOverride
}) =>
  ({
    ...item,
    stateOverride,
  }) as Prettify<TTransactionItem & { stateOverride: TStateOverride }>

const estimateIndividualGas = async <TName extends TransactionName>({
  data,
  name,
  stateOverride,
  connectorClient,
  client,
}: { name: TName; stateOverride?: UserStateOverrides } & TransactionParameters<TName>) => {
  const generatedRequest = await createTransactionRequest({
    client,
    connectorClient,
    data,
    name,
  })

  // Note: this doesn't use an access-list optimization for smart-contract-account
  // transfers, since that requires Shanghai (PUSH0) support, which isn't guaranteed
  // on all chains. This means SCA wallets may see a slightly higher gas estimate
  // than strictly necessary, but the estimate remains correct for all wallet types.
  const formattedRequest = formatTransactionRequest({
    ...generatedRequest,
    from: connectorClient.account.address,
  })
  const stateOverrideWithBalance = stateOverride?.find(
    (s) => s.address === connectorClient.account.address,
  )
    ? stateOverride
    : [
        ...(stateOverride || []),
        {
          address: connectorClient.account.address,
          balance:
            ('value' in generatedRequest && generatedRequest.value ? generatedRequest.value : 0n) +
            parseEther('10'),
        },
      ]

  const formattedOverrides = Object.fromEntries(
    (stateOverrideWithBalance || []).map(({ address, balance, nonce, code, state, stateDiff }) => [
      address,
      {
        ...(state ? { state: mapUserState(state) } : {}),
        ...(stateDiff ? { stateDiff: mapUserState(stateDiff) } : {}),
        ...(code ? { code } : {}),
        ...(balance ? { balance: toHex(balance) } : {}),
        ...(nonce ? { nonce: toHex(nonce) } : {}),
      },
    ]),
  )

  try {
    const gas = await client.request<{
      Method: 'eth_estimateGas'
      Parameters:
        | [transaction: RpcTransactionRequest]
        | [transaction: RpcTransactionRequest, block: BlockNumber | BlockTag]
        | [
            transaction: RpcTransactionRequest,
            block: BlockNumber | BlockTag,
            overrides: StateOverride<Hex, Hex>,
          ]
      ReturnType: Hex
    }>({
      method: 'eth_estimateGas',
      params: [formattedRequest, 'latest', formattedOverrides],
    })
    return hexToBigInt(gas)
  } catch (error) {
    const isUnsupportedParamsError =
      (error as { code?: number })?.code === -32602 ||
      /too many arguments/i.test((error as { details?: string })?.details || '')
    if (!isUnsupportedParamsError) throw error
    return FALLBACK_GAS_ESTIMATES[name] ?? 150_000n
  }
}

export const estimateGasWithStateOverrideQueryFn =
  (config: ConfigWithEns) =>
  (connectorClient: ConnectorClientWithEns | undefined) =>
  async <
    TransactionItems extends TransactionItem[] | readonly TransactionItem[],
    TParams extends UseEstimateGasWithStateOverrideParameters<TransactionItems>,
  >({
    queryKey: [{ transactions }, chainId],
  }: QueryFunctionContext<QueryKey<TransactionItems, TParams>>) => {
    const client = config.getClient({ chainId })

    const connectorClientWithAccount = {
      ...(connectorClient ?? client),
      ...(connectorClient?.account?.address
        ? {}
        : {
            account: {
              address: DISCONNECTED_PLACEHOLDER_ADDRESS,
              type: 'json-rpc',
            },
          }),
    } as ConnectorClientWithEns

    const gasEstimates = await Promise.all(
      transactions.map((t) =>
        estimateIndividualGas({
          ...t,
          client,
          connectorClient: connectorClientWithAccount,
        }),
      ),
    )

    return {
      reduced: gasEstimates.reduce((acc, curr) => acc + curr, 0n),
      gasEstimates,
    }
  }

export const useEstimateGasWithStateOverride = <
  const TransactionItems extends TransactionItem[] | readonly TransactionItem[],
>({
  // config
  enabled = true,
  gcTime,
  staleTime,
  scopeKey,
  // params
  ...params
}: UseEstimateGasWithStateOverrideParameters<TransactionItems> &
  UseEstimateGasWithStateOverrideConfig) => {
  const { data: connectorClient, isLoading: isConnectorLoading } =
    useConnectorClient<ConfigWithEns>()

  const initialOptions = useQueryOptions({
    params,
    scopeKey,
    functionName: 'estimateGasWithStateOverride',
    queryDependencyType: 'standard',
    queryFn: estimateGasWithStateOverrideQueryFn,
  })

  const preparedOptions = prepareQueryOptions({
    queryKey: initialOptions.queryKey,
    queryFn: initialOptions.queryFn(connectorClient),
    enabled: enabled && !isConnectorLoading,
    gcTime,
    staleTime,
  })

  const query = useQuery(preparedOptions)

  const {
    data: gasPrice,
    isLoading: isGasPriceLoading,
    isFetching: isGasPriceFetching,
  } = useGasPrice()

  const data = useMemo(() => {
    if (!gasPrice || !query.data) {
      const transactions = params.transactions ?? []
      return {
        gasEstimate: 0n,
        gasEstimateArray: transactions.map(() => 0n) as GasEstimateArray<TransactionItems>,
        gasCost: 0n,
        gasCostEth: '0',
      }
    }

    const gasEstimate = query.data.reduced
    const gasEstimateArray = query.data.gasEstimates as GasEstimateArray<TransactionItems>
    const gasCost_ = gasPrice * gasEstimate

    return {
      gasEstimate,
      gasEstimateArray,
      gasCost: gasCost_,
      gasCostEth: formatEther(gasCost_),
    }
  }, [gasPrice, params.transactions, query.data])

  const isLoading = query.isLoading || isGasPriceLoading || isConnectorLoading
  const isFetching = query.isFetching || isGasPriceFetching

  return useMemo(
    () => ({
      ...query,
      data,
      gasPrice,
      isLoading,
      isFetching,
      refetchIfEnabled: preparedOptions.enabled ? query.refetch : () => {},
      isCachedData: getIsCachedData(query),
    }),
    [data, gasPrice, isFetching, isLoading, query, preparedOptions.enabled],
  )
}
