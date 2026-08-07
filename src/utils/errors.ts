import {
  BaseError,
  decodeErrorResult,
  EstimateGasExecutionError,
  formatEther,
  RawContractError,
  RpcRequestError,
  TransactionRejectedRpcError,
} from 'viem'

import {
  dnsRegistrarErrors,
  ethRegistrarControllerErrors,
  nameWrapperErrors,
} from '@ensdomains/ensjs/contracts'

type ReadableErrorType = 'insufficientFunds' | 'contract' | 'unknown'
type ReadableError = {
  message: string
  type: ReadableErrorType
}

export const getViemRevertErrorData = (err: unknown) => {
  if (!(err instanceof BaseError)) return undefined
  const error = err.walk() as RawContractError
  return typeof error.data === 'object' ? error.data.data : error.data
}

export const allContractErrors = [
  ...ethRegistrarControllerErrors,
  ...nameWrapperErrors,
  ...dnsRegistrarErrors,
]

const insufficientFundsRegex =
  /insufficient funds for gas \* price \+ value: address (?<address>0x[a-fA-F0-9]{40}) have (?<availableBalance>\d*) want (?<requiredBalance>\d*)/

// Wallet providers (eg. MetaMask) rewrap node errors in shapes viem classes
// don't cover — an insufficient-funds estimate can surface as
// InvalidParamsRpcError, rendering the cryptic "Missing or invalid
// parameters" banner. Walk the whole cause chain textually so the detection
// is wrapper-agnostic.
const collectErrorChainText = (err: unknown, depth = 0): string => {
  if (!err || typeof err !== 'object' || depth > 10) return ''
  const e = err as { message?: unknown; details?: unknown; cause?: unknown }
  return [
    typeof e.message === 'string' ? e.message : '',
    typeof e.details === 'string' ? e.details : '',
    collectErrorChainText(e.cause, depth + 1),
  ].join('\n')
}

const getInsufficientFundsError = (err: unknown): ReadableError | null => {
  const chainText = collectErrorChainText(err)
  const data = insufficientFundsRegex.exec(chainText)
  if (data?.groups) {
    const { requiredBalance } = data.groups
    return {
      message: `Wallet balance too low. Minimum required balance: ${formatEther(
        BigInt(requiredBalance),
      )} ETN`,
      type: 'insufficientFunds',
    }
  }
  if (/insufficient funds/i.test(chainText)) {
    return {
      message: 'Not enough ETN in the connected wallet to cover gas',
      type: 'insufficientFunds',
    }
  }
  return null
}

const getEstimateGasExecutionErrorMessage = (err: EstimateGasExecutionError) => {
  const originError = err.walk()
  const data = insufficientFundsRegex.exec(originError.message)
  if (data?.groups) {
    const { requiredBalance } = data.groups
    return {
      message: `Wallet balance too low. Minimum required balance: ${formatEther(
        BigInt(requiredBalance),
      )} ETN`,
      type: 'insufficientFunds',
    } as const
  }

  return null
}

const getTransactionRejectedRpcErrorMessage = (
  err: TransactionRejectedRpcError | RpcRequestError,
) => {
  if (err.details.toLowerCase().includes('insufficient funds'))
    return {
      message: 'Not enough ETN',
      type: 'contract',
    } satisfies ReadableError

  return {
    message: err.details || err.shortMessage,
    type: 'contract',
  } satisfies ReadableError
}

export const getReadableError = (err: unknown): ReadableError | null => {
  const insufficientFundsError = getInsufficientFundsError(err)
  if (insufficientFundsError) return insufficientFundsError
  if (err instanceof EstimateGasExecutionError) return getEstimateGasExecutionErrorMessage(err)
  if (err instanceof TransactionRejectedRpcError) return getTransactionRejectedRpcErrorMessage(err)
  if (err instanceof RpcRequestError) return getTransactionRejectedRpcErrorMessage(err)
  const data = getViemRevertErrorData(err)
  if (!data) return null
  const decodedError = decodeErrorResult({
    abi: allContractErrors,
    data,
  })
  if (!decodedError) return null
  return {
    message: decodedError.errorName,
    type: 'contract',
  } as const
}
