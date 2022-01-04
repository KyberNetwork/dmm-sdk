import { Token, Price, TokenAmount, BigintIsh, sqrt, ChainId } from '@vutien/sdk-core'
// import { TokenAmount, Price } from './fractions'
import invariant from 'tiny-invariant'
import JSBI from 'jsbi'

import { MINIMUM_LIQUIDITY, ZERO, ONE, PRECISION } from '../constants'
import { InsufficientReservesError, InsufficientInputAmountError } from '../errors'
// import { Token } from './token'

//TODO: rename to Pool object
export class Pair {
  public readonly liquidityToken: Token
  private readonly tokenAmounts: [TokenAmount, TokenAmount]
  private readonly virtualTokenAmounts: [TokenAmount, TokenAmount]
  public readonly fee: JSBI
  public readonly address: string
  public readonly amp: JSBI

  public constructor(
    address: string,
    tokenAmountA: TokenAmount,
    tokenAmountB: TokenAmount,
    virtualTokenAmountA: TokenAmount,
    virtualTokenAmountB: TokenAmount,
    fee: JSBI,
    amp: JSBI
  ) {
    this.address = address
    const tokenAmounts = tokenAmountA.currency.sortsBefore(tokenAmountB.currency) // does safety checks
      ? [tokenAmountA, tokenAmountB]
      : [tokenAmountB, tokenAmountA]
    const virtualTokenAmounts = tokenAmountA.currency.sortsBefore(tokenAmountB.currency) // does safety checks
      ? [virtualTokenAmountA, virtualTokenAmountB]
      : [virtualTokenAmountB, virtualTokenAmountA]

    this.liquidityToken = new Token(tokenAmounts[0].currency.chainId, address, 18, 'DMM-LP', 'DMM LP')
    this.tokenAmounts = tokenAmounts as [TokenAmount, TokenAmount]
    this.virtualTokenAmounts = virtualTokenAmounts as [TokenAmount, TokenAmount]
    this.fee = fee
    this.amp = amp
  }

  /**
   * Returns true if the token is either token0 or token1
   * @param token to check
   */
  public involvesToken(token: Token): boolean {
    return token.equals(this.token0) || token.equals(this.token1)
  }

  /**
   * Returns the current mid price of the pair in terms of token0, i.e. the ratio of reserve1 to reserve0
   */
  public get token0Price(): Price<Token, Token> {
    const result = this.virtualTokenAmounts[1].divide(this.virtualTokenAmounts[0])
    return new Price(this.token0, this.token1, result.denominator, result.numerator)
  }

  /**
   * Returns the current mid price of the pair in terms of token1, i.e. the ratio of reserve0 to reserve1
   */
  public get token1Price(): Price<Token, Token> {
    const result = this.virtualTokenAmounts[0].divide(this.virtualTokenAmounts[1])
    return new Price(this.token1, this.token0, result.denominator, result.numerator)
  }

  /**
   * Return the price of the given token in terms of the other token in the pair.
   * @param token token to return price of
   */
  public priceOf(token: Token): Price<Token, Token> {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.token0Price : this.token1Price
  }

  public priceOfReal(token: Token): Price<Token, Token> {
    invariant(this.involvesToken(token), 'TOKEN')
    const r1 = this.tokenAmounts[1].divide(this.tokenAmounts[0])
    const r2 = this.tokenAmounts[0].divide(this.tokenAmounts[1])
    return token.equals(this.token0)
      ? new Price(this.token0, this.token1, r1.denominator, r1.numerator)
      : new Price(this.token1, this.token0, r2.denominator, r2.numerator)
  }

  /**
   * Returns the chain ID of the tokens in the pair.
   */
  public get chainId(): ChainId {
    return this.token0.chainId
  }

  public get token0(): Token {
    return this.tokenAmounts[0].currency
  }

  public get token1(): Token {
    return this.tokenAmounts[1].currency
  }

  public get reserve0(): TokenAmount {
    return this.tokenAmounts[0]
  }

  public get reserve1(): TokenAmount {
    return this.tokenAmounts[1]
  }

  public get virtualReserve0(): TokenAmount {
    return this.virtualTokenAmounts[0]
  }

  public get virtualReserve1(): TokenAmount {
    return this.virtualTokenAmounts[1]
  }

  public reserveOf(token: Token): TokenAmount {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.reserve0 : this.reserve1
  }

  public virtualReserveOf(token: Token): TokenAmount {
    invariant(this.involvesToken(token), 'TOKEN')
    return token.equals(this.token0) ? this.virtualReserve0 : this.virtualReserve1
  }

  public getOutputAmount(inputAmount: TokenAmount): [TokenAmount, TokenAmount[]] {
    invariant(this.involvesToken(inputAmount.currency), 'TOKEN')
    if (JSBI.equal(this.reserve0.quotient, ZERO) || JSBI.equal(this.reserve1.quotient, ZERO)) {
      throw new InsufficientReservesError()
    }

    const outputToken = inputAmount.currency.equals(this.token0) ? this.token1 : this.token0
    const inputReserve = this.virtualReserveOf(inputAmount.currency)
    const outputReserve = this.virtualReserveOf(outputToken)

    const inputAmountWithFee = JSBI.divide(
      JSBI.multiply(inputAmount.quotient, JSBI.subtract(PRECISION, this.fee)),
      PRECISION
    )

    const numerator = JSBI.multiply(inputAmountWithFee, outputReserve.quotient)
    const denominator = JSBI.add(inputReserve.quotient, inputAmountWithFee)

    const outputAmount = TokenAmount.fromRawAmount(outputToken, JSBI.divide(numerator, denominator))

    if (JSBI.greaterThanOrEqual(outputAmount.quotient, this.reserveOf(outputToken).quotient)) {
      throw new InsufficientReservesError()
    }

    if (JSBI.equal(outputAmount.quotient, ZERO)) {
      throw new InsufficientInputAmountError()
    }
    return [outputAmount, [inputReserve.add(inputAmount), outputReserve.subtract(outputAmount)]]
  }

  public getInputAmount(outputAmount: TokenAmount): [TokenAmount, TokenAmount[]] {
    invariant(this.involvesToken(outputAmount.currency), 'TOKEN')
    if (
      JSBI.equal(this.reserve0.quotient, ZERO) ||
      JSBI.equal(this.reserve1.quotient, ZERO) ||
      JSBI.greaterThanOrEqual(outputAmount.quotient, this.reserveOf(outputAmount.currency).quotient)
    ) {
      throw new InsufficientReservesError()
    }

    const inputToken = outputAmount.currency.equals(this.token0) ? this.token1 : this.token0

    const outputReserve = this.virtualReserveOf(outputAmount.currency)
    const inputReserve = this.virtualReserveOf(inputToken)
    ///
    let numerator = JSBI.multiply(inputReserve.quotient, outputAmount.quotient)
    let denominator = JSBI.subtract(outputReserve.quotient, outputAmount.quotient)
    const inputAmountWithFee = JSBI.add(JSBI.divide(numerator, denominator), ONE)

    numerator = JSBI.multiply(inputAmountWithFee, PRECISION)
    denominator = JSBI.subtract(PRECISION, this.fee)

    const inputAmount = TokenAmount.fromRawAmount(
      inputToken,
      JSBI.divide(JSBI.subtract(JSBI.add(numerator, denominator), ONE), denominator)
    )
    return [inputAmount, [inputReserve.add(inputAmount), outputReserve.subtract(outputAmount)]]
  }

  public getLiquidityMinted(
    totalSupply: TokenAmount,
    tokenAmountA: TokenAmount,
    tokenAmountB: TokenAmount
  ): TokenAmount {
    invariant(totalSupply.currency.equals(this.liquidityToken), 'LIQUIDITY')
    const tokenAmounts = tokenAmountA.currency.sortsBefore(tokenAmountB.currency) // does safety checks
      ? [tokenAmountA, tokenAmountB]
      : [tokenAmountB, tokenAmountA]
    invariant(tokenAmounts[0].currency.equals(this.token0) && tokenAmounts[1].currency.equals(this.token1), 'TOKEN')

    let liquidity: JSBI
    if (JSBI.equal(totalSupply.quotient, ZERO)) {
      liquidity = JSBI.subtract(
        sqrt(JSBI.multiply(tokenAmounts[0].quotient, tokenAmounts[1].quotient)),
        MINIMUM_LIQUIDITY
      )
    } else {
      const amount0 = JSBI.divide(JSBI.multiply(tokenAmounts[0].quotient, totalSupply.quotient), this.reserve0.quotient)
      const amount1 = JSBI.divide(JSBI.multiply(tokenAmounts[1].quotient, totalSupply.quotient), this.reserve1.quotient)
      liquidity = JSBI.lessThanOrEqual(amount0, amount1) ? amount0 : amount1
    }
    if (!JSBI.greaterThan(liquidity, ZERO)) {
      throw new InsufficientInputAmountError()
    }
    return TokenAmount.fromRawAmount(this.liquidityToken, liquidity)
  }

  public getLiquidityValue(
    token: Token,
    totalSupply: TokenAmount,
    liquidity: TokenAmount,
    feeBps: JSBI = ZERO,
    kLast?: BigintIsh
  ): TokenAmount {
    invariant(this.involvesToken(token), 'TOKEN')
    invariant(totalSupply.currency.equals(this.liquidityToken), 'TOTAL_SUPPLY')
    invariant(liquidity.currency.equals(this.liquidityToken), 'LIQUIDITY')
    invariant(JSBI.lessThanOrEqual(liquidity.quotient, totalSupply.quotient), 'LIQUIDITY')

    let totalSupplyAdjusted: TokenAmount
    if (JSBI.equal(feeBps, ZERO)) {
      totalSupplyAdjusted = totalSupply
    } else {
      invariant(!!kLast, 'K_LAST')
      const kLastParsed = JSBI.BigInt(kLast)
      if (!JSBI.equal(kLastParsed, ZERO)) {
        const rootK = sqrt(JSBI.multiply(this.virtualReserve0.quotient, this.virtualReserve1.quotient))
        const rootKLast = sqrt(kLastParsed)
        if (JSBI.greaterThan(rootK, rootKLast)) {
          const numerator = JSBI.multiply(JSBI.multiply(totalSupply.quotient, JSBI.subtract(rootK, rootKLast)), feeBps)
          const denominator = JSBI.multiply(JSBI.add(rootK, rootKLast), JSBI.BigInt(5000))
          const feeLiquidity = JSBI.divide(numerator, denominator)
          totalSupplyAdjusted = totalSupply.add(TokenAmount.fromRawAmount(this.liquidityToken, feeLiquidity))
        } else {
          totalSupplyAdjusted = totalSupply
        }
      } else {
        totalSupplyAdjusted = totalSupply
      }
    }

    return TokenAmount.fromRawAmount(
      token,
      JSBI.divide(JSBI.multiply(liquidity.quotient, this.reserveOf(token).quotient), totalSupplyAdjusted.quotient)
    )
  }
}
