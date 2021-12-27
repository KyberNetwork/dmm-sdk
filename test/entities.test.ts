import invariant from 'tiny-invariant'
// import { ChainId, WETH as _WETH, TradeType, Rounding, Token, TokenAmount, Pair, Route, Trade, JSBI } from '../src'

import { ChainId, WETH as _WETH, Token, TokenAmount, Rounding, TradeType } from '@vutien/sdk-core'
import { Pair, Route, Trade } from '../src'
import JSBI from 'jsbi'
const ADDRESSES = [
  '0x0000000000000000000000000000000000000001',
  '0x0000000000000000000000000000000000000002',
  '0x0000000000000000000000000000000000000003'
]
const PAIR_ADDRESSES = [
  '0x0000000000000000000000000000000000000011',
  '0x0000000000000000000000000000000000000012',
  '0x0000000000000000000000000000000000000013'
]
const CHAIN_ID = ChainId.RINKEBY
const WETH = _WETH[ChainId.RINKEBY]
const DECIMAL_PERMUTATIONS: [number, number, number][] = [
  [3, 3, 3],
  [0, 9, 18],
  [18, 18, 18]
]
const TEST_FEE = JSBI.BigInt(3e15) // 0.3%
const ampBps = JSBI.BigInt(10000)

function decimalize(amount: number, decimals: number): JSBI {
  return JSBI.multiply(JSBI.BigInt(amount), JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals)))
}

describe('entities', () => {
  DECIMAL_PERMUTATIONS.forEach(decimals => {
    describe(`decimals permutation: ${decimals}`, () => {
      let tokens: Token[]
      it('Token', () => {
        tokens = ADDRESSES.map((address, i) => new Token(CHAIN_ID, address, decimals[i]))
        tokens.forEach((token, i) => {
          expect(token.chainId).toEqual(CHAIN_ID)
          expect(token.address).toEqual(ADDRESSES[i])
          expect(token.decimals).toEqual(decimals[i])
        })
      })

      let pairs: Pair[]
      it('Pair', () => {
        pairs = [
          new Pair(
            PAIR_ADDRESSES[0],
            TokenAmount.fromRawAmount(tokens[0], decimalize(1, tokens[0].decimals)),
            TokenAmount.fromRawAmount(tokens[1], decimalize(1, tokens[1].decimals)),
            TokenAmount.fromRawAmount(tokens[0], decimalize(1, tokens[0].decimals)),
            TokenAmount.fromRawAmount(tokens[1], decimalize(1, tokens[1].decimals)),
            TEST_FEE,
            ampBps
          ),
          new Pair(
            PAIR_ADDRESSES[1],
            TokenAmount.fromRawAmount(tokens[1], decimalize(1, tokens[1].decimals)),
            TokenAmount.fromRawAmount(tokens[2], decimalize(1, tokens[2].decimals)),
            TokenAmount.fromRawAmount(tokens[1], decimalize(1, tokens[1].decimals)),
            TokenAmount.fromRawAmount(tokens[2], decimalize(1, tokens[2].decimals)),
            TEST_FEE,
            ampBps
          ),
          new Pair(
            PAIR_ADDRESSES[2],
            TokenAmount.fromRawAmount(tokens[2], decimalize(1, tokens[2].decimals)),
            TokenAmount.fromRawAmount(WETH, decimalize(1234, WETH.decimals)),
            TokenAmount.fromRawAmount(tokens[2], decimalize(1, tokens[2].decimals)),
            TokenAmount.fromRawAmount(WETH, decimalize(1234, WETH.decimals)),
            TEST_FEE,
            ampBps
          )
        ]
      })

      let route: Route<Token, Token>
      it('Route', () => {
        route = new Route(pairs, tokens[0], WETH)
        expect(route.pairs).toEqual(pairs)
        expect(route.path).toEqual(tokens.concat([WETH]))
        expect(route.input).toEqual(tokens[0])
        expect(route.output).toEqual(WETH)
      })

      it('Price:Route.midPrice', () => {
        invariant(route.input instanceof Token)
        invariant(route.output instanceof Token)
        expect(
          route.midPrice.quote(TokenAmount.fromRawAmount(route.input, decimalize(1, route.input.decimals))).toExact()
        ).toEqual(TokenAmount.fromRawAmount(route.output, decimalize(1234, route.output.decimals)).toExact())
        expect(
          route.midPrice
            .invert()
            .quote(TokenAmount.fromRawAmount(route.output, decimalize(1234, route.output.decimals)))
            .toExact()
        ).toEqual(TokenAmount.fromRawAmount(route.input, decimalize(1, route.input.decimals)).toExact())

        expect(route.midPrice.toSignificant(1)).toEqual('1000')
        expect(route.midPrice.toSignificant(2)).toEqual('1200')
        expect(route.midPrice.toSignificant(3)).toEqual('1230')
        expect(route.midPrice.toSignificant(4)).toEqual('1234')
        expect(route.midPrice.toSignificant(5)).toEqual('1234')
        expect(route.midPrice.toSignificant(5, { groupSeparator: ',' })).toEqual('1,234')
        expect(route.midPrice.invert().toSignificant(1)).toEqual('0.0008')
        expect(route.midPrice.invert().toSignificant(2)).toEqual('0.00081')
        expect(route.midPrice.invert().toSignificant(3)).toEqual('0.00081')
        expect(route.midPrice.invert().toSignificant(4)).toEqual('0.0008104')
        expect(route.midPrice.invert().toSignificant(4, undefined, Rounding.ROUND_DOWN)).toEqual('0.0008103')
        expect(route.midPrice.invert().toSignificant(5)).toEqual('0.00081037')

        expect(route.midPrice.toFixed(0)).toEqual('1234')
        expect(route.midPrice.toFixed(1)).toEqual('1234.0')
        expect(route.midPrice.toFixed(2)).toEqual('1234.00')
        expect(route.midPrice.toFixed(2, { groupSeparator: ',' })).toEqual('1,234.00')
        expect(route.midPrice.invert().toFixed(0)).toEqual('0')
        expect(route.midPrice.invert().toFixed(1)).toEqual('0.0')
        expect(route.midPrice.invert().toFixed(2)).toEqual('0.00')
        expect(route.midPrice.invert().toFixed(3)).toEqual('0.001')
        expect(route.midPrice.invert().toFixed(4)).toEqual('0.0008')
        expect(route.midPrice.invert().toFixed(5)).toEqual('0.00081')
        expect(route.midPrice.invert().toFixed(6)).toEqual('0.000810')
        expect(route.midPrice.invert().toFixed(7)).toEqual('0.0008104')
        expect(route.midPrice.invert().toFixed(7, undefined, Rounding.ROUND_DOWN)).toEqual('0.0008103')
        expect(route.midPrice.invert().toFixed(8)).toEqual('0.00081037')
      })

      describe('Trade', () => {
        let route: Route<Token, Token>
        it('TradeType.EXACT_INPUT', () => {
          route = new Route(
            [
              new Pair(
                PAIR_ADDRESSES[0],
                TokenAmount.fromRawAmount(tokens[1], decimalize(5, tokens[1].decimals)),
                TokenAmount.fromRawAmount(WETH, decimalize(10, WETH.decimals)),
                TokenAmount.fromRawAmount(tokens[1], decimalize(5, tokens[1].decimals)),
                TokenAmount.fromRawAmount(WETH, decimalize(10, WETH.decimals)),
                TEST_FEE,
                ampBps
              )
            ],
            tokens[1],
            WETH
          )
          const inputAmount = TokenAmount.fromRawAmount(tokens[1], decimalize(1, tokens[1].decimals))
          const expectedOutputAmount = TokenAmount.fromRawAmount(WETH, '1662497915624478906')
          const trade = new Trade(route, inputAmount, TradeType.EXACT_INPUT)
          expect(trade.route).toEqual(route)
          expect(trade.tradeType).toEqual(TradeType.EXACT_INPUT)
          expect(trade.inputAmount).toEqual(inputAmount)
          expect(trade.outputAmount).toEqual(expectedOutputAmount)

          expect(trade.executionPrice.toSignificant(18)).toEqual('1.66249791562447891')
          expect(trade.executionPrice.invert().toSignificant(18)).toEqual('0.601504513540621866')
          expect(trade.executionPrice.quote(inputAmount).quotient).toEqual(expectedOutputAmount.quotient)
          expect(trade.executionPrice.invert().quote(expectedOutputAmount).quotient).toEqual(inputAmount.quotient)

          // expect(trade.nextMidPrice.toSignificant(18)).toEqual('1.38958368072925352')
          // expect(trade.nextMidPrice.invert().toSignificant(18)).toEqual('0.71964')

          expect(trade.priceImpact.toSignificant(18)).toEqual('16.8751042187760547')
        })

        it('TradeType.EXACT_OUTPUT', () => {
          const outputAmount = TokenAmount.fromRawAmount(WETH, '1662497915624478906')
          const expectedInputAmount = TokenAmount.fromRawAmount(tokens[1], decimalize(1, tokens[1].decimals))
          const trade = new Trade(route, outputAmount, TradeType.EXACT_OUTPUT)
          expect(trade.route).toEqual(route)
          expect(trade.tradeType).toEqual(TradeType.EXACT_OUTPUT)
          expect(trade.outputAmount).toEqual(outputAmount)
          expect(trade.inputAmount).toEqual(expectedInputAmount)

          expect(trade.executionPrice.toSignificant(18)).toEqual('1.66249791562447891')
          expect(trade.executionPrice.invert().toSignificant(18)).toEqual('0.601504513540621866')
          expect(trade.executionPrice.quote(expectedInputAmount).quotient).toEqual(outputAmount.quotient)
          expect(trade.executionPrice.invert().quote(outputAmount).quotient).toEqual(expectedInputAmount.quotient)

          // expect(trade.nextMidPrice.toSignificant(18)).toEqual('1.38958368072925352')
          // expect(trade.nextMidPrice.invert().toSignificant(18)).toEqual('0.71964')

          expect(trade.priceImpact.toSignificant(18)).toEqual('16.8751042187760547')
        })

        it('minimum TradeType.EXACT_INPUT', () => {
          if ([9, 18].includes(tokens[1].decimals)) {
            const route = new Route(
              [
                new Pair(
                  PAIR_ADDRESSES[1],
                  TokenAmount.fromRawAmount(tokens[1], decimalize(1, tokens[1].decimals)),
                  TokenAmount.fromRawAmount(
                    WETH,
                    JSBI.add(
                      decimalize(10, WETH.decimals),
                      tokens[1].decimals === 9 ? JSBI.BigInt('30090280812437312') : JSBI.BigInt('30090270812437322')
                    )
                  ),
                  TokenAmount.fromRawAmount(tokens[1], decimalize(1, tokens[1].decimals)),
                  TokenAmount.fromRawAmount(
                    WETH,
                    JSBI.add(
                      decimalize(10, WETH.decimals),
                      tokens[1].decimals === 9 ? JSBI.BigInt('30090280812437312') : JSBI.BigInt('30090270812437322')
                    )
                  ),
                  TEST_FEE,
                  ampBps
                )
              ],
              tokens[1],
              WETH
            )
            const outputAmount = TokenAmount.fromRawAmount(tokens[1], '1000')
            const trade = new Trade(route, outputAmount, TradeType.EXACT_INPUT)

            expect(trade.priceImpact.toSignificant(18)).toEqual(
              tokens[1].decimals === 9 ? '0.300099400810170898' : '0.3099700000000001'
            )
          }
        })
      })

      it('TokenAmount', () => {
        const amount = TokenAmount.fromRawAmount(WETH, '1234567000000000000000')
        expect(amount.toExact()).toEqual('1234.567')
        expect(amount.toExact({ groupSeparator: ',' })).toEqual('1,234.567')
      })
    })
  })
})
