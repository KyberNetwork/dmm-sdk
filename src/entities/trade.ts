import invariant from 'tiny-invariant'

import { ONE, ZERO } from '../constants'
// import { sortedInsert } from '../utils'
// import { Currency, ETHER } from './currency'
import {
  CurrencyAmount,
  Currency,
  Price,
  Percent,
  TradeType,
  TokenAmount,
  Fraction,
  sortedInsert,
  computePriceImpact
} from '@vutien/sdk-core'
// import { Fraction } from './fractions/fraction'
// import { Percent } from './fractions/percent'
// import { Price } from './fractions/price'
// import { TokenAmount } from './fractions/tokenAmount'
import { Pair } from './pair'
import { Route } from './route'
// import { currencyEquals, Token, WETH } from './token'

/**
 * Returns the percent difference between the mid price and the execution price, i.e. price impact.
 * @param midPrice mid price before the trade
 * @param inputAmount the input amount of the trade
 * @param outputAmount the output amount of the trade
 */
// export function computePriceImpact(
//   midPrice: Price,
//   inputAmount: CurrencyAmount,
//   outputAmount: CurrencyAmount
// ): Percent {
//   const exactQuote = midPrice.raw.multiply(inputAmount.raw)
//   // calculate slippage := (exactQuote - outputAmount) / exactQuote
//   const slippage = exactQuote.subtract(outputAmount.raw).divide(exactQuote)
//   return new Percent(slippage.numerator, slippage.denominator)
// }

// minimal interface so the input output comparator may be shared across types
interface InputOutput<TInput extends Currency, TOutput extends Currency> {
  readonly inputAmount: CurrencyAmount<TInput>
  readonly outputAmount: CurrencyAmount<TOutput>
}

// comparator function that allows sorting trades by their output amounts, in decreasing order, and then input amounts
// in increasing order. i.e. the best trades have the most outputs for the least inputs and are sorted first
export function inputOutputComparator<TInput extends Currency, TOutput extends Currency>(
  a: InputOutput<TInput, TOutput>,
  b: InputOutput<TInput, TOutput>
): number {
  // must have same input and output token for comparison
  invariant(a.inputAmount.currency.equals(b.inputAmount.currency), 'INPUT_CURRENCY')
  invariant(a.outputAmount.currency.equals(b.outputAmount.currency), 'OUTPUT_CURRENCY')
  if (a.outputAmount.equalTo(b.outputAmount)) {
    if (a.inputAmount.equalTo(b.inputAmount)) {
      return 0
    }
    // trade A requires less input than trade B, so A should come first
    if (a.inputAmount.lessThan(b.inputAmount)) {
      return -1
    } else {
      return 1
    }
  } else {
    // tradeA has less output than trade B, so should come second
    if (a.outputAmount.lessThan(b.outputAmount)) {
      return 1
    } else {
      return -1
    }
  }
}

// extension of the input output comparator that also considers other dimensions of the trade in ranking them
export function tradeComparator<TInput extends Currency, TOutput extends Currency, TTradeType extends TradeType>(
  a: Trade<TInput, TOutput, TTradeType>,
  b: Trade<TInput, TOutput, TTradeType>
) {
  //vutien
  const ioComp = inputOutputComparator(a, b)
  if (ioComp !== 0) {
    return ioComp
  }

  // consider lowest slippage next, since these are less likely to fail
  if (a.priceImpact.lessThan(b.priceImpact)) {
    return -1
  } else if (a.priceImpact.greaterThan(b.priceImpact)) {
    return 1
  }

  // finally consider the number of hops since each hop costs gas
  return a.route.path.length - b.route.path.length
}

export interface BestTradeOptions {
  // how many results to return
  maxNumResults?: number
  // the maximum number of hops a trade should contain
  maxHops?: number
}

/**
 * Given a currency amount and a chain ID, returns the equivalent representation as the token amount.
 * In other words, if the currency is ETHER, returns the WETH token amount for the given chain. Otherwise, returns
 * the input currency amount.
 */
// function wrappedAmount(currencyAmount: CurrencyAmount, chainId: ChainId): TokenAmount {
//   if (currencyAmount instanceof TokenAmount) return currencyAmount
//   if (currencyAmount.currency === ETHER) return new TokenAmount(WETH[chainId], currencyAmount.raw)
//   invariant(false, 'CURRENCY')
// }

// function wrappedCurrency(currency: Currency, chainId: ChainId): Token {
//   if (currency instanceof Token) return currency
//   if (currency === ETHER) return WETH[chainId]
//   invariant(false, 'CURRENCY')
// }

/**
 * Represents a trade executed against a list of pairs.
 * Does not account for slippage, i.e. trades that front run this trade and move the price.
 */
export class Trade<TInput extends Currency, TOutput extends Currency, TTradeType extends TradeType> {
  /**
   * The route of the trade, i.e. which pairs the trade goes through.
   */
  public readonly route: Route<TInput, TOutput>
  /**
   * The type of the trade, either exact in or exact out.
   */
  public readonly tradeType: TTradeType
  /**
   * The input amount for the trade assuming no slippage.
   */
  public readonly inputAmount: CurrencyAmount<TInput>
  /**
   * The output amount for the trade assuming no slippage.
   */
  public readonly outputAmount: CurrencyAmount<TOutput>
  /**
   * The price expressed in terms of output amount/input amount.
   */
  public readonly executionPrice: Price<TInput, TOutput>
  /**
   * The mid price after the trade executes assuming no slippage.
   */
  // public readonly nextMidPrice: Price<TInput, TOutput>
  /**
   * The percent difference between the mid price before the trade and the trade execution price.
   */
  public readonly priceImpact: Percent

  /**
   * Constructs an exact in trade with the given amount in and route
   * @param route route of the exact in trade
   * @param amountIn the amount being passed in
   */
  public static exactIn<TInput extends Currency, TOutput extends Currency>(
    route: Route<TInput, TOutput>,
    amountIn: CurrencyAmount<TInput>
  ): Trade<TInput, TOutput, TradeType.EXACT_INPUT> {
    return new Trade(route, amountIn, TradeType.EXACT_INPUT)
  }

  /**
   * Constructs an exact out trade with the given amount out and route
   * @param route route of the exact out trade
   * @param amountOut the amount returned by the trade
   */
  public static exactOut<TInput extends Currency, TOutput extends Currency>(
    route: Route<TInput, TOutput>,
    amountOut: CurrencyAmount<TOutput>
  ): Trade<TInput, TOutput, TradeType.EXACT_OUTPUT> {
    return new Trade(route, amountOut, TradeType.EXACT_OUTPUT)
  }

  public constructor(
    route: Route<TInput, TOutput>,
    amount: TTradeType extends TradeType.EXACT_INPUT ? CurrencyAmount<TInput> : CurrencyAmount<TOutput>,
    tradeType: TTradeType
  ) {
    const tokenAmounts: TokenAmount[] = new Array(route.path.length)
    const nextInputReserves: TokenAmount[] = new Array(route.pairs.length)
    const nextOutputReserves: TokenAmount[] = new Array(route.pairs.length)

    if (tradeType === TradeType.EXACT_INPUT) {
      invariant(amount.currency.equals(route.input), 'INPUT')
      tokenAmounts[0] = amount.wrapped
      for (let i = 0; i < route.path.length - 1; i++) {
        const pair = route.pairs[i]
        const [outputAmount, nextPair] = pair.getOutputAmount(tokenAmounts[i])

        tokenAmounts[i + 1] = outputAmount
        nextInputReserves[i] = nextPair[0]
        nextOutputReserves[i] = nextPair[1]
      }
    } else {
      invariant(amount.currency.equals(route.output), 'OUTPUT')
      tokenAmounts[tokenAmounts.length - 1] = amount.wrapped
      for (let i = route.path.length - 1; i > 0; i--) {
        const pair = route.pairs[i - 1]
        const [inputAmount, nextPair] = pair.getInputAmount(tokenAmounts[i])
        tokenAmounts[i - 1] = inputAmount
        nextInputReserves[i - 1] = nextPair[0]
        nextOutputReserves[i - 1] = nextPair[1]
      }
    }

    this.route = route
    this.tradeType = tradeType
    this.inputAmount =
      tradeType === TradeType.EXACT_INPUT
        ? CurrencyAmount.fromFractionalAmount(route.input, amount.numerator, amount.denominator)
        : CurrencyAmount.fromFractionalAmount(route.input, tokenAmounts[0].numerator, tokenAmounts[0].denominator)
    this.outputAmount =
      tradeType === TradeType.EXACT_OUTPUT
        ? CurrencyAmount.fromFractionalAmount(route.output, amount.numerator, amount.denominator)
        : CurrencyAmount.fromFractionalAmount(
            route.output,
            tokenAmounts[tokenAmounts.length - 1].numerator,
            tokenAmounts[tokenAmounts.length - 1].denominator
          )
    this.executionPrice = new Price(
      this.inputAmount.currency,
      this.outputAmount.currency,
      this.inputAmount.quotient,
      this.outputAmount.quotient
    )
    // this.nextMidPrice = Price.fromReserves(nextInputReserves, nextOutputReserves)
    this.priceImpact = computePriceImpact(route.midPrice, this.inputAmount, this.outputAmount)
  }

  /**
   * Get the minimum amount that must be received from this trade for the given slippage tolerance
   * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
   */
  public minimumAmountOut(slippageTolerance: Percent): CurrencyAmount<TOutput> {
    invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE')
    if (this.tradeType === TradeType.EXACT_OUTPUT) {
      return this.outputAmount
    } else {
      const slippageAdjustedAmountOut = new Fraction(ONE)
        .add(slippageTolerance)
        .invert()
        .multiply(this.outputAmount.quotient).quotient
      return CurrencyAmount.fromRawAmount(this.outputAmount.currency, slippageAdjustedAmountOut)
    }
  }

  /**
   * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
   * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
   */
  public maximumAmountIn(slippageTolerance: Percent): CurrencyAmount<TInput> {
    invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE')
    if (this.tradeType === TradeType.EXACT_INPUT) {
      return this.inputAmount
    } else {
      const slippageAdjustedAmountIn = new Fraction(ONE).add(slippageTolerance).multiply(this.inputAmount.quotient)
        .quotient
      return CurrencyAmount.fromRawAmount(this.inputAmount.currency, slippageAdjustedAmountIn)
    }
  }

  /**
   * Given a list of pairs, and a fixed amount in, returns the top `maxNumResults` trades that go from an input token
   * amount to an output token, making at most `maxHops` hops.
   * Note this does not consider aggregation, as routes are linear. It's possible a better route exists by splitting
   * the amount in among multiple routes.
   * @param pairs the pairs to consider in finding the best trade
   * @param currencyAmountIn exact amount of input currency to spend
   * @param currencyOut the desired currency out
   * @param maxNumResults maximum number of results to return
   * @param maxHops maximum number of hops a returned trade can make, e.g. 1 hop goes through a single pair
   * @param currentPairs used in recursion; the current list of pairs
   * @param originalAmountIn used in recursion; the original value of the currencyAmountIn parameter
   * @param bestTrades used in recursion; the current list of best trades
   */
  public static bestTradeExactIn<TInput extends Currency, TOutput extends Currency>(
    pairs: Pair[][],
    originalAmountIn: CurrencyAmount<TInput>,
    currencyOut: Currency,
    { maxNumResults = 3, maxHops = 3 }: BestTradeOptions = {},
    // used in recursion.
    currentPairs: Pair[] = [],
    currencyAmountIn: CurrencyAmount<Currency> = originalAmountIn,
    bestTrades: Trade<TInput, TOutput, TradeType.EXACT_INPUT>[] = []
  ): Trade<TInput, TOutput, TradeType.EXACT_INPUT>[] {
    invariant(pairs.length > 0, 'PAIRS')
    invariant(maxHops > 0, 'MAX_HOPS')
    invariant(originalAmountIn === currencyAmountIn || currentPairs.length > 0, 'INVALID_RECURSION')
    // const chainId: ChainId | undefined =
    //   currencyAmountIn instanceof TokenAmount
    //     ? currencyAmountIn.token.chainId
    //     : currencyOut instanceof Token
    //     ? currencyOut.chainId
    //     : undefined
    // invariant(chainId !== undefined, 'CHAIN_ID')

    const amountIn = currencyAmountIn.wrapped
    const tokenOut = currencyOut.wrapped
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i]
      invariant(pair.length > 0, 'PAIRS')

      // pair irrelevant
      if (!pair[0].token0.equals(amountIn.currency) && !pair[0].token1.equals(amountIn.currency)) continue
      const token0 = pair[0].token0
      const token1 = pair[0].token1

      // iterate each pool, find the best rate
      let bestPool: Pair | undefined
      let bestAmountOut: TokenAmount | undefined
      for (let j = 0; j < pair.length; j++) {
        const pool = pair[j]
        invariant(pool.token0.equals(token0), 'INVALID_PAIR')
        invariant(pool.token1.equals(token1), 'INVALID_PAIR')
        if (pool.reserve0.equalTo(ZERO) || pool.reserve1.equalTo(ZERO)) continue

        let amountOut: TokenAmount
        try {
          ;[amountOut] = pool.getOutputAmount(amountIn)
        } catch (error) {
          // input too low || not enough liquidity in this pair
          if (error.isInsufficientInputAmountError || error.isInsufficientReservesError) {
            continue
          }
          throw error
        }

        if (bestAmountOut === undefined) {
          bestAmountOut = amountOut
          bestPool = pool
        } else {
          if (amountOut.greaterThan(bestAmountOut)) {
            bestAmountOut = amountOut
            bestPool = pool
          }
        }
      }
      // not found any pool has rate

      if (bestAmountOut === undefined || bestPool === undefined) {
        continue
      }
      // we have arrived at the output token, so this is the final trade of one of the paths
      if (bestAmountOut.currency.equals(tokenOut)) {
        sortedInsert(
          bestTrades,
          new Trade(
            new Route([...currentPairs, bestPool], originalAmountIn.currency, currencyOut),
            originalAmountIn,
            TradeType.EXACT_INPUT
          ),
          maxNumResults,
          tradeComparator
        )
      } else if (maxHops > 1 && pairs.length > 1) {
        const pairsExcludingThisPair = pairs.slice(0, i).concat(pairs.slice(i + 1, pairs.length))

        // otherwise, consider all the other paths that lead from this token as long as we have not exceeded maxHops
        Trade.bestTradeExactIn(
          pairsExcludingThisPair,
          originalAmountIn,
          currencyOut,
          {
            maxNumResults,
            maxHops: maxHops - 1
          },
          [...currentPairs, bestPool],
          bestAmountOut,
          bestTrades
        )
      }
    }

    return bestTrades
  }

  /**
   * similar to the above method but instead targets a fixed output amount
   * given a list of pairs, and a fixed amount out, returns the top `maxNumResults` trades that go from an input token
   * to an output token amount, making at most `maxHops` hops
   * note this does not consider aggregation, as routes are linear. it's possible a better route exists by splitting
   * the amount in among multiple routes.
   * @param pairs the pairs to consider in finding the best trade
   * @param currencyIn the currency to spend
   * @param currencyAmountOut the exact amount of currency out
   * @param maxNumResults maximum number of results to return
   * @param maxHops maximum number of hops a returned trade can make, e.g. 1 hop goes through a single pair
   * @param currentPairs used in recursion; the current list of pairs
   * @param originalAmountOut used in recursion; the original value of the currencyAmountOut parameter
   * @param bestTrades used in recursion; the current list of best trades
   */
  public static bestTradeExactOut<TInput extends Currency, TOutput extends Currency>(
    pairs: Pair[][],
    currencyIn: TInput,
    originalAmountOut: CurrencyAmount<TOutput>,
    { maxNumResults = 3, maxHops = 3 }: BestTradeOptions = {},
    // used in recursion.
    currentPairs: Pair[] = [],
    currencyAmountOut: CurrencyAmount<Currency> = originalAmountOut,
    bestTrades: Trade<TInput, TOutput, TradeType.EXACT_OUTPUT>[] = []
  ): Trade<TInput, TOutput, TradeType.EXACT_OUTPUT>[] {
    invariant(pairs.length > 0, 'PAIRS')
    invariant(maxHops > 0, 'MAX_HOPS')
    invariant(originalAmountOut === currencyAmountOut || currentPairs.length > 0, 'INVALID_RECURSION')
    // const chainId: ChainId | undefined =
    //   currencyAmountOut instanceof TokenAmount
    //     ? currencyAmountOut.token.chainId
    //     : currencyIn instanceof Token
    //     ? currencyIn.chainId
    //     : undefined
    // invariant(chainId !== undefined, 'CHAIN_ID')

    const amountOut = currencyAmountOut.wrapped
    const tokenIn = currencyIn.wrapped
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i]

      invariant(pair.length > 0, 'PAIRS')

      // pair irrelevant
      if (!pair[0].token0.equals(amountOut.currency) && !pair[0].token1.equals(amountOut.currency)) continue
      const token0 = pair[0].token0
      const token1 = pair[0].token1

      // iterate each pool, find the best rate
      let bestPool: Pair | undefined
      let bestAmountIn: TokenAmount | undefined
      for (let j = 0; j < pair.length; j++) {
        let pool = pair[j]
        invariant(pool.token0.equals(token0), 'INVALID_PAIR')
        invariant(pool.token1.equals(token1), 'INVALID_PAIR')
        if (pool.reserve0.equalTo(ZERO) || pool.reserve1.equalTo(ZERO)) continue

        let amountIn: TokenAmount
        try {
          ;[amountIn] = pool.getInputAmount(amountOut)
        } catch (error) {
          // input too low || not enough liquidity in this pair
          if (error.isInsufficientInputAmountError || error.isInsufficientReservesError) {
            continue
          }
          throw error
        }

        if (bestAmountIn === undefined) {
          bestAmountIn = amountIn
          bestPool = pool
        } else {
          if (amountIn.lessThan(bestAmountIn)) {
            bestAmountIn = amountIn
            bestPool = pool
          }
        }
      }

      // not found any pool has rate
      if (bestAmountIn === undefined || bestPool === undefined) {
        continue
      }

      // we have arrived at the input token, so this is the first trade of one of the paths
      if (bestAmountIn.currency.equals(tokenIn)) {
        sortedInsert(
          bestTrades,
          new Trade(
            new Route([bestPool, ...currentPairs], currencyIn, originalAmountOut.currency),
            originalAmountOut,
            TradeType.EXACT_OUTPUT
          ),
          maxNumResults,
          tradeComparator
        )
      } else if (maxHops > 1 && pairs.length > 1) {
        const pairsExcludingThisPair = pairs.slice(0, i).concat(pairs.slice(i + 1, pairs.length))

        // otherwise, consider all the other paths that arrive at this token as long as we have not exceeded maxHops
        Trade.bestTradeExactOut(
          pairsExcludingThisPair,
          currencyIn,
          originalAmountOut,
          {
            maxNumResults,
            maxHops: maxHops - 1
          },
          [bestPool, ...currentPairs],
          bestAmountIn,
          bestTrades
        )
      }
    }

    return bestTrades
  }
}
