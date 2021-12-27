import JSBI from 'jsbi'
import { Pair, Route, Trade } from '../src'

import { ChainId, Ether, CurrencyAmount, Percent, Token, TokenAmount, TradeType, WETH } from '@vutien/sdk-core'

describe('Trade', () => {
  const ETHER = Ether.onChain(1)
  const token0 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000001', 18, 't0')
  const token1 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000002', 18, 't1')
  const token2 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000003', 18, 't2')
  const token3 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000004', 18, 't3')
  const fee = JSBI.BigInt(3e15)
  const ampBps = JSBI.BigInt(10000)

  const pair_0_1 = new Pair(
    '0x0000000000000000000000000000000000000005',
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(1000e18)),
    TokenAmount.fromRawAmount(token1, JSBI.BigInt(1000e18)),
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(1000e18)),
    TokenAmount.fromRawAmount(token1, JSBI.BigInt(1000e18)),
    fee,
    ampBps
  )
  const pair_0_2 = new Pair(
    '0x0000000000000000000000000000000000000006',
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(1000e18)),
    TokenAmount.fromRawAmount(token2, JSBI.BigInt(1100e18)),
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(1000e18)),
    TokenAmount.fromRawAmount(token2, JSBI.BigInt(1100e18)),
    fee,
    ampBps
  )
  const pair_0_3 = new Pair(
    '0x0000000000000000000000000000000000000007',
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(1000e18)),
    TokenAmount.fromRawAmount(token3, JSBI.BigInt(900e18)),
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(1000e18)),
    TokenAmount.fromRawAmount(token3, JSBI.BigInt(900e18)),
    fee,
    ampBps
  )
  const pair_1_2 = new Pair(
    '0x0000000000000000000000000000000000000008',
    TokenAmount.fromRawAmount(token1, JSBI.BigInt(1200e18)),
    TokenAmount.fromRawAmount(token2, JSBI.BigInt(1000e18)),
    TokenAmount.fromRawAmount(token1, JSBI.BigInt(1200e18)),
    TokenAmount.fromRawAmount(token2, JSBI.BigInt(1000e18)),
    fee,
    ampBps
  )
  const pair_1_3 = new Pair(
    '0x0000000000000000000000000000000000000009',
    TokenAmount.fromRawAmount(token1, JSBI.BigInt(1200e18)),
    TokenAmount.fromRawAmount(token3, JSBI.BigInt(1300e18)),
    TokenAmount.fromRawAmount(token1, JSBI.BigInt(1200e18)),
    TokenAmount.fromRawAmount(token3, JSBI.BigInt(1300e18)),
    fee,
    ampBps
  )

  const pair_weth_0 = new Pair(
    '0x000000000000000000000000000000000000000A',
    TokenAmount.fromRawAmount(WETH[ChainId.MAINNET], JSBI.BigInt(1000e18)),
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(1000e18)),
    TokenAmount.fromRawAmount(WETH[ChainId.MAINNET], JSBI.BigInt(1000e18)),
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(1000e18)),
    fee,
    ampBps
  )

  const empty_pair_0_1 = new Pair(
    '0x000000000000000000000000000000000000000B',
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(0)),
    TokenAmount.fromRawAmount(token1, JSBI.BigInt(0)),
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(0)),
    TokenAmount.fromRawAmount(token1, JSBI.BigInt(0)),
    fee,
    ampBps
  )

  it('can be constructed with ETHER as input', () => {
    const trade = new Trade(
      new Route([pair_weth_0], ETHER, token0),
      CurrencyAmount.fromRawAmount(Ether.onChain(1), JSBI.BigInt(100)),
      TradeType.EXACT_INPUT
    )
    expect(trade.inputAmount.currency).toEqual(ETHER)
    expect(trade.outputAmount.currency).toEqual(token0)
  })
  it('can be constructed with ETHER as input for exact output', () => {
    const trade = new Trade(
      new Route([pair_weth_0], ETHER, token0),
      TokenAmount.fromRawAmount(token0, JSBI.BigInt(100)),
      TradeType.EXACT_OUTPUT
    )
    expect(trade.inputAmount.currency).toEqual(ETHER)
    expect(trade.outputAmount.currency).toEqual(token0)
  })

  it('can be constructed with ETHER as output', () => {
    const trade = new Trade(
      new Route([pair_weth_0], token0, ETHER),
      CurrencyAmount.fromRawAmount(Ether.onChain(1), JSBI.BigInt(100)),
      TradeType.EXACT_OUTPUT
    )
    expect(trade.inputAmount.currency).toEqual(token0)
    expect(trade.outputAmount.currency).toEqual(ETHER)
  })
  it('can be constructed with ETHER as output for exact input', () => {
    const trade = new Trade(
      new Route([pair_weth_0], token0, ETHER),
      TokenAmount.fromRawAmount(token0, JSBI.BigInt(100)),
      TradeType.EXACT_INPUT
    )
    expect(trade.inputAmount.currency).toEqual(token0)
    expect(trade.outputAmount.currency).toEqual(ETHER)
  })

  describe('#bestTradeExactIn', () => {
    it('throws with empty pairs', () => {
      expect(() => Trade.bestTradeExactIn([], TokenAmount.fromRawAmount(token0, JSBI.BigInt(100)), token2)).toThrow(
        'PAIRS'
      )
    })
    it('throws with max hops of 0', () => {
      expect(() =>
        Trade.bestTradeExactIn([[pair_0_2]], TokenAmount.fromRawAmount(token0, JSBI.BigInt(100)), token2, {
          maxHops: 0
        })
      ).toThrow('MAX_HOPS')
    })

    it('provides best route', () => {
      const result = Trade.bestTradeExactIn(
        [[pair_0_1], [pair_0_2], [pair_1_2]],
        TokenAmount.fromRawAmount(token0, JSBI.BigInt(100e18)),
        token2
      )
      expect(result).toHaveLength(2)
      expect(result[0].route.pairs).toHaveLength(1) // 0 -> 2 at 10:11
      expect(result[0].route.path).toEqual([token0, token2])
      expect(result[0].inputAmount).toEqual(TokenAmount.fromRawAmount(token0, JSBI.BigInt(100e18)))
      expect(result[0].outputAmount).toEqual(TokenAmount.fromRawAmount(token2, JSBI.BigInt('99727198326816404473')))
      expect(result[1].route.pairs).toHaveLength(2) // 0 -> 1 -> 2 at 12:12:10
      expect(result[1].route.path).toEqual([token0, token1, token2])
      expect(result[1].inputAmount).toEqual(TokenAmount.fromRawAmount(token0, JSBI.BigInt(100e18)))
      expect(result[1].outputAmount).toEqual(TokenAmount.fromRawAmount(token2, JSBI.BigInt('70047945763931117136')))
    })

    it('doesnt throw for zero liquidity pairs', () => {
      expect(
        Trade.bestTradeExactIn([[empty_pair_0_1]], TokenAmount.fromRawAmount(token0, JSBI.BigInt(100)), token1)
      ).toHaveLength(0)
    })

    it('respects maxHops', () => {
      const result = Trade.bestTradeExactIn(
        [[pair_0_1], [pair_0_2], [pair_1_2]],
        TokenAmount.fromRawAmount(token0, JSBI.BigInt(10)),
        token2,
        { maxHops: 1 }
      )
      expect(result).toHaveLength(1)
      expect(result[0].route.pairs).toHaveLength(1) // 0 -> 2 at 10:11
      expect(result[0].route.path).toEqual([token0, token2])
    })

    it.skip('insufficient input for one pair', () => {
      const result = Trade.bestTradeExactIn(
        [[pair_0_1], [pair_0_2], [pair_1_2]],
        TokenAmount.fromRawAmount(token0, JSBI.BigInt(1)),
        token2
      )
      expect(result).toHaveLength(1)
      expect(result[0].route.pairs).toHaveLength(1) // 0 -> 2 at 10:11
      expect(result[0].route.path).toEqual([token0, token2])
      expect(result[0].outputAmount).toEqual(TokenAmount.fromRawAmount(token2, JSBI.BigInt(1)))
    })

    it('respects n', () => {
      const result = Trade.bestTradeExactIn(
        [[pair_0_1], [pair_0_2], [pair_1_2]],
        TokenAmount.fromRawAmount(token0, JSBI.BigInt(10)),
        token2,
        { maxNumResults: 1 }
      )

      expect(result).toHaveLength(1)
    })

    it('no path', () => {
      const result = Trade.bestTradeExactIn(
        [[pair_0_1], [pair_0_3], [pair_1_3]],
        TokenAmount.fromRawAmount(token0, JSBI.BigInt(10)),
        token2
      )
      expect(result).toHaveLength(0)
    })

    it('works for ETHER currency input', () => {
      const result = Trade.bestTradeExactIn(
        [[pair_weth_0], [pair_0_1], [pair_0_3], [pair_1_3]],
        CurrencyAmount.fromRawAmount(ETHER, JSBI.BigInt(100)),
        token3
      )
      expect(result).toHaveLength(2)
      expect(result[0].inputAmount.currency).toEqual(ETHER)
      expect(result[0].route.path).toEqual([WETH[ChainId.MAINNET], token0, token1, token3])
      expect(result[0].outputAmount.currency).toEqual(token3)
      expect(result[1].inputAmount.currency).toEqual(ETHER)
      expect(result[1].route.path).toEqual([WETH[ChainId.MAINNET], token0, token3])
      expect(result[1].outputAmount.currency).toEqual(token3)
    })
    it('works for ETHER currency output', () => {
      const result = Trade.bestTradeExactIn(
        [[pair_weth_0], [pair_0_1], [pair_0_3], [pair_1_3]],
        TokenAmount.fromRawAmount(token3, JSBI.BigInt(100)),
        ETHER
      )
      expect(result).toHaveLength(2)
      expect(result[0].inputAmount.currency).toEqual(token3)
      expect(result[0].route.path).toEqual([token3, token0, WETH[ChainId.MAINNET]])
      expect(result[0].outputAmount.currency).toEqual(ETHER)
      expect(result[1].inputAmount.currency).toEqual(token3)
      expect(result[1].route.path).toEqual([token3, token1, token0, WETH[ChainId.MAINNET]])
      expect(result[1].outputAmount.currency).toEqual(ETHER)
    })
  })

  describe('#maximumAmountIn', () => {
    describe('tradeType = EXACT_INPUT', () => {
      const exactIn = new Trade(
        new Route([pair_0_1, pair_1_2], token0, token2),
        TokenAmount.fromRawAmount(token0, JSBI.BigInt(100e18)),
        TradeType.EXACT_INPUT
      )
      it('throws if less than 0', () => {
        expect(() => exactIn.maximumAmountIn(new Percent(JSBI.BigInt(-1), JSBI.BigInt(100)))).toThrow(
          'SLIPPAGE_TOLERANCE'
        )
      })
      it('returns exact if 0', () => {
        expect(exactIn.maximumAmountIn(new Percent(JSBI.BigInt(0), JSBI.BigInt(100)))).toEqual(exactIn.inputAmount)
      })
      it('returns exact if nonzero', () => {
        expect(exactIn.maximumAmountIn(new Percent(JSBI.BigInt(0), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token0, JSBI.BigInt(100e18))
        )
        expect(exactIn.maximumAmountIn(new Percent(JSBI.BigInt(5), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token0, JSBI.BigInt(100e18))
        )
        expect(exactIn.maximumAmountIn(new Percent(JSBI.BigInt(200), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token0, JSBI.BigInt(100e18))
        )
      })
    })
    describe('tradeType = EXACT_OUTPUT', () => {
      const exactOut = new Trade(
        new Route([pair_0_1, pair_1_2], token0, token2),
        TokenAmount.fromRawAmount(token2, JSBI.BigInt(100e18)),
        TradeType.EXACT_OUTPUT
      )

      it('throws if less than 0', () => {
        expect(() => exactOut.maximumAmountIn(new Percent(JSBI.BigInt(-1), JSBI.BigInt(100)))).toThrow(
          'SLIPPAGE_TOLERANCE'
        )
      })
      it('returns exact if 0', () => {
        expect(exactOut.maximumAmountIn(new Percent(JSBI.BigInt(0), JSBI.BigInt(100)))).toEqual(exactOut.inputAmount)
      })
      it('returns slippage amount if nonzero', () => {
        expect(exactOut.maximumAmountIn(new Percent(JSBI.BigInt(0), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token0, JSBI.BigInt('154845083300848125235'))
        )
        expect(exactOut.maximumAmountIn(new Percent(JSBI.BigInt(5), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token0, JSBI.BigInt('162587337465890531496'))
        )
        expect(exactOut.maximumAmountIn(new Percent(JSBI.BigInt(200), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token0, JSBI.BigInt('464535249902544375705'))
        )
      })
    })
  })

  describe('#minimumAmountOut', () => {
    describe('tradeType = EXACT_INPUT', () => {
      const exactIn = new Trade(
        new Route([pair_0_1, pair_1_2], token0, token2),
        TokenAmount.fromRawAmount(token0, JSBI.BigInt(100e18)),
        TradeType.EXACT_INPUT
      )
      it('throws if less than 0', () => {
        expect(() => exactIn.minimumAmountOut(new Percent(JSBI.BigInt(-1), JSBI.BigInt(100)))).toThrow(
          'SLIPPAGE_TOLERANCE'
        )
      })
      it('returns exact if 0', () => {
        expect(exactIn.minimumAmountOut(new Percent(JSBI.BigInt(0), JSBI.BigInt(100)))).toEqual(exactIn.outputAmount)
      })
      it('returns exact if nonzero', () => {
        expect(exactIn.minimumAmountOut(new Percent(JSBI.BigInt(0), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token2, JSBI.BigInt('70047945763931117136'))
        )
        expect(exactIn.minimumAmountOut(new Percent(JSBI.BigInt(5), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token2, JSBI.BigInt('66712329298982016320'))
        )
        expect(exactIn.minimumAmountOut(new Percent(JSBI.BigInt(200), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token2, JSBI.BigInt('23349315254643705712'))
        )
      })
    })
    describe('tradeType = EXACT_OUTPUT', () => {
      const exactOut = new Trade(
        new Route([pair_0_1, pair_1_2], token0, token2),
        TokenAmount.fromRawAmount(token2, JSBI.BigInt(100)),
        TradeType.EXACT_OUTPUT
      )

      it('throws if less than 0', () => {
        expect(() => exactOut.minimumAmountOut(new Percent(JSBI.BigInt(-1), JSBI.BigInt(100)))).toThrow(
          'SLIPPAGE_TOLERANCE'
        )
      })
      it('returns exact if 0', () => {
        expect(exactOut.minimumAmountOut(new Percent(JSBI.BigInt(0), JSBI.BigInt(100)))).toEqual(exactOut.outputAmount)
      })
      it('returns slippage amount if nonzero', () => {
        expect(exactOut.minimumAmountOut(new Percent(JSBI.BigInt(0), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token2, JSBI.BigInt(100))
        )
        expect(exactOut.minimumAmountOut(new Percent(JSBI.BigInt(5), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token2, JSBI.BigInt(100))
        )
        expect(exactOut.minimumAmountOut(new Percent(JSBI.BigInt(200), JSBI.BigInt(100)))).toEqual(
          TokenAmount.fromRawAmount(token2, JSBI.BigInt(100))
        )
      })
    })
  })

  describe('#bestTradeExactOut', () => {
    it('throws with empty pairs', () => {
      expect(() => Trade.bestTradeExactOut([], token0, TokenAmount.fromRawAmount(token2, JSBI.BigInt(100)))).toThrow(
        'PAIRS'
      )
    })
    it('throws with max hops of 0', () => {
      expect(() =>
        Trade.bestTradeExactOut([[pair_0_2]], token0, TokenAmount.fromRawAmount(token2, JSBI.BigInt(100)), {
          maxHops: 0
        })
      ).toThrow('MAX_HOPS')
    })

    it('provides best route', () => {
      const result = Trade.bestTradeExactOut(
        [[pair_0_1], [pair_0_2], [pair_1_2]],
        token0,
        TokenAmount.fromRawAmount(token2, JSBI.BigInt(100e18))
      )
      expect(result).toHaveLength(2)
      expect(result[0].route.pairs).toHaveLength(1) // 0 -> 2 at 10:11
      expect(result[0].route.path).toEqual([token0, token2])
      expect(result[0].inputAmount).toEqual(TokenAmount.fromRawAmount(token0, JSBI.BigInt('100300902708124373121')))
      expect(result[0].outputAmount).toEqual(TokenAmount.fromRawAmount(token2, JSBI.BigInt(100e18)))
      expect(result[1].route.pairs).toHaveLength(2) // 0 -> 1 -> 2 at 12:12:10
      expect(result[1].route.path).toEqual([token0, token1, token2])
      expect(result[1].inputAmount).toEqual(TokenAmount.fromRawAmount(token0, JSBI.BigInt('154845083300848125235')))
      expect(result[1].outputAmount).toEqual(TokenAmount.fromRawAmount(token2, JSBI.BigInt(100e18)))
    })

    it('doesnt throw for zero liquidity pairs', () => {
      expect(
        Trade.bestTradeExactOut([[empty_pair_0_1]], token1, TokenAmount.fromRawAmount(token1, JSBI.BigInt(100)))
      ).toHaveLength(0)
    })

    it('respects maxHops', () => {
      const result = Trade.bestTradeExactOut(
        [[pair_0_1], [pair_0_2], [pair_1_2]],
        token0,
        TokenAmount.fromRawAmount(token2, JSBI.BigInt(10)),
        { maxHops: 1 }
      )
      expect(result).toHaveLength(1)
      expect(result[0].route.pairs).toHaveLength(1) // 0 -> 2 at 10:11
      expect(result[0].route.path).toEqual([token0, token2])
    })

    it('insufficient liquidity', () => {
      const result = Trade.bestTradeExactOut(
        [[pair_0_1], [pair_0_2], [pair_1_2]],
        token0,
        TokenAmount.fromRawAmount(token2, JSBI.BigInt(1200e18))
      )
      expect(result).toHaveLength(0)
    })

    it('insufficient liquidity in one pair but not the other', () => {
      const result = Trade.bestTradeExactOut(
        [[pair_0_1], [pair_0_2], [pair_1_2]],
        token0,
        TokenAmount.fromRawAmount(token2, JSBI.BigInt(1050e18))
      )
      expect(result).toHaveLength(1)
    })

    it('respects n', () => {
      const result = Trade.bestTradeExactOut(
        [[pair_0_1], [pair_0_2], [pair_1_2]],
        token0,
        TokenAmount.fromRawAmount(token2, JSBI.BigInt(10)),
        { maxNumResults: 1 }
      )

      expect(result).toHaveLength(1)
    })

    it('no path', () => {
      const result = Trade.bestTradeExactOut(
        [[pair_0_1], [pair_0_3], [pair_1_3]],
        token0,
        TokenAmount.fromRawAmount(token2, JSBI.BigInt(10))
      )
      expect(result).toHaveLength(0)
    })

    it('works for ETHER currency input', () => {
      const result = Trade.bestTradeExactOut(
        [[pair_weth_0], [pair_0_1], [pair_0_3], [pair_1_3]],
        ETHER,
        TokenAmount.fromRawAmount(token3, JSBI.BigInt(100))
      )
      expect(result).toHaveLength(2)
      expect(result[0].inputAmount.currency).toEqual(ETHER)
      expect(result[0].route.path).toEqual([WETH[ChainId.MAINNET], token0, token1, token3])
      expect(result[0].outputAmount.currency).toEqual(token3)
      expect(result[1].inputAmount.currency).toEqual(ETHER)
      expect(result[1].route.path).toEqual([WETH[ChainId.MAINNET], token0, token3])
      expect(result[1].outputAmount.currency).toEqual(token3)
    })
    it('works for ETHER currency output', () => {
      const result = Trade.bestTradeExactOut(
        [[pair_weth_0], [pair_0_1], [pair_0_3], [pair_1_3]],
        token3,
        CurrencyAmount.fromRawAmount(ETHER, JSBI.BigInt(100))
      )
      expect(result).toHaveLength(2)
      expect(result[0].inputAmount.currency).toEqual(token3)
      expect(result[0].route.path).toEqual([token3, token0, WETH[ChainId.MAINNET]])
      expect(result[0].outputAmount.currency).toEqual(ETHER)
      expect(result[1].inputAmount.currency).toEqual(token3)
      expect(result[1].route.path).toEqual([token3, token1, token0, WETH[ChainId.MAINNET]])
      expect(result[1].outputAmount.currency).toEqual(ETHER)
    })
  })
})
