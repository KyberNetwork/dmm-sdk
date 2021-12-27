import { Contract } from '@ethersproject/contracts'
import { getNetwork } from '@ethersproject/networks'
import { getDefaultProvider } from '@ethersproject/providers'
import { Token, TokenAmount } from '@vutien/sdk-core'
import { Pair } from './entities/pair'
import invariant from 'tiny-invariant'
import ERC20 from './abis/ERC20.json'
import DMMFactory from './abis/DMMFactory.json'
import DMMPool from './abis/DMMPool.json'

import { ChainId } from '@vutien/sdk-core'
import { JSBI } from '.'

let TOKEN_DECIMALS_CACHE: { [chainId: number]: { [address: string]: number } } = {
  [ChainId.MAINNET]: {
    '0xE0B7927c4aF23765Cb51314A0E0521A9645F0E2A': 9 // DGD
  }
}

let PAIR_ADDRESS_CACHE: { [chainId: number]: { [token0Address: string]: { [token1Address: string]: string[] } } } = {}

/**
 * Contains methods for constructing instances of pairs and tokens from on-chain data.
 */
export abstract class Fetcher {
  /**
   * Cannot be constructed.
   */
  private constructor() {}

  /**
   * Fetch information for a given token on the given chain, using the given ethers provider.
   * @param chainId chain of the token
   * @param address address of the token on the chain
   * @param provider provider used to fetch the token
   * @param symbol optional symbol of the token
   * @param name optional name of the token
   */
  public static async fetchTokenData(
    chainId: ChainId,
    address: string,
    provider = getDefaultProvider(getNetwork(chainId)),
    symbol?: string,
    name?: string
  ): Promise<Token> {
    const parsedDecimals =
      typeof TOKEN_DECIMALS_CACHE?.[chainId]?.[address] === 'number'
        ? TOKEN_DECIMALS_CACHE[chainId][address]
        : await new Contract(address, ERC20, provider).decimals().then((decimals: number): number => {
            TOKEN_DECIMALS_CACHE = {
              ...TOKEN_DECIMALS_CACHE,
              [chainId]: {
                ...TOKEN_DECIMALS_CACHE?.[chainId],
                [address]: decimals
              }
            }
            return decimals
          })
    return new Token(chainId, address, parsedDecimals, symbol, name)
  }

  /**
   * Fetches information about pairs and constructs pairs array from the given two tokens.
   * @param tokenA first token
   * @param tokenB second token
   * @param factoryAddress address of dmmFactory
   * @param provider the provider to use to fetch the data
   */
  public static async fetchPairData(
    tokenA: Token,
    tokenB: Token,
    factoryAddress: string,
    provider = getDefaultProvider(getNetwork(tokenA.chainId))
  ): Promise<Pair[]> {
    const addresses = await Fetcher.fetchPairAddresses(tokenA, tokenB, factoryAddress, provider)
    return Promise.all(
      addresses.map(async address => {
        let poolContract = new Contract(address, DMMPool.abi, provider)
        const [reserve0, reserve1, vReserve0, vReserve1, feeInPrecision] = await poolContract.getTradeInfo()
        const ampBps = await poolContract.ampBps()
        const balances = tokenA.sortsBefore(tokenB)
          ? [reserve0, reserve1, vReserve0, vReserve1]
          : [reserve1, reserve0, vReserve1, vReserve0]
        return new Pair(
          address,
          TokenAmount.fromRawAmount(tokenA, balances[0]),
          TokenAmount.fromRawAmount(tokenB, balances[1]),
          TokenAmount.fromRawAmount(tokenA, balances[2]),
          TokenAmount.fromRawAmount(tokenB, balances[3]),
          JSBI.BigInt(feeInPrecision),
          JSBI.BigInt(ampBps)
        )
      })
    )
  }

  /**
   * Fetches information about pair addresses from the given two tokens.
   * @param tokenA first token
   * @param tokenB second token
   * @param provider the provider to use to fetch the data
   */
  public static async fetchPairAddresses(
    tokenA: Token,
    tokenB: Token,
    factoryAddress: string,
    provider = getDefaultProvider(getNetwork(tokenA.chainId))
  ): Promise<string[]> {
    invariant(tokenA.chainId === tokenB.chainId, 'CHAIN_ID')
    const tokens = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA] // does safety checks
    const chainId = tokenA.chainId
    if (typeof PAIR_ADDRESS_CACHE?.[chainId]?.[tokens[1].address]?.[tokenB.address] == 'undefined') {
      const factory = await new Contract(factoryAddress, DMMFactory.abi, provider)
      PAIR_ADDRESS_CACHE = {
        ...PAIR_ADDRESS_CACHE,
        [chainId]: {
          ...PAIR_ADDRESS_CACHE?.[chainId],
          [tokens[0].address]: {
            ...PAIR_ADDRESS_CACHE?.[chainId]?.[tokens[0].address],
            [tokens[1].address]: await factory.getPools(tokens[0].address, tokens[1].address)
          }
        }
      }
    }
    return PAIR_ADDRESS_CACHE[chainId][tokens[0].address][tokens[1].address]
  }
}
