import invariant from 'tiny-invariant'
import { Pair, Route, Router, Trade } from '../src'
import { ChainId, CurrencyAmount, Ether, Percent, Token, TokenAmount, WETH } from '@vutien/sdk-core'
import JSBI from 'jsbi'

function checkDeadline(deadline: string[] | string): void {
  expect(typeof deadline).toBe('string')
  invariant(typeof deadline === 'string')
  // less than 5 seconds on the deadline
  expect(new Date().getTime() / 1000 - parseInt(deadline)).toBeLessThanOrEqual(5)
}

describe('Router', () => {
  const ETHER = Ether.onChain(1)
  const token0 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000001', 18, 't0')
  const token1 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000002', 18, 't1')
  const ampBps = JSBI.BigInt(10000)

  const pair_0_1 = new Pair(
    '0x0000000000000000000000000000000000000005',
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(1000)),
    TokenAmount.fromRawAmount(token1, JSBI.BigInt(1000)),
    TokenAmount.fromRawAmount(token0, JSBI.BigInt(1000)),
    TokenAmount.fromRawAmount(token1, JSBI.BigInt(1000)),
    JSBI.BigInt(3e15),
    ampBps
  )

  const pair_weth_0 = new Pair(
    '0x0000000000000000000000000000000000000006',
    TokenAmount.fromRawAmount(WETH[ChainId.MAINNET], '1000'),
    TokenAmount.fromRawAmount(token0, '1000'),
    TokenAmount.fromRawAmount(WETH[ChainId.MAINNET], '1000'),
    TokenAmount.fromRawAmount(token0, '1000'),
    JSBI.BigInt(3e15),
    ampBps
  )

  describe('#swapCallParameters', () => {
    describe('exact in', () => {
      it('ether to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactIn(
            new Route([pair_weth_0, pair_0_1], ETHER, token1),
            CurrencyAmount.fromRawAmount(ETHER, JSBI.BigInt(100))
          ),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapExactETHForTokens')
        expect(result.args.slice(0, -1)).toEqual([
          '0x50',
          [pair_weth_0.address, pair_0_1.address],
          [WETH[ChainId.MAINNET].address, token0.address, token1.address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x64')
        checkDeadline(result.args[result.args.length - 1])
      })

      it('deadline specified', () => {
        const result = Router.swapCallParameters(
          Trade.exactIn(
            new Route([pair_weth_0, pair_0_1], ETHER, token1),
            CurrencyAmount.fromRawAmount(ETHER, JSBI.BigInt(100))
          ),
          {
            deadline: 50,
            recipient: '0x0000000000000000000000000000000000000004',
            allowedSlippage: new Percent('1', '100')
          }
        )
        expect(result.methodName).toEqual('swapExactETHForTokens')
        expect(result.args).toEqual([
          '0x50',
          [pair_weth_0.address, pair_0_1.address],
          [WETH[ChainId.MAINNET].address, token0.address, token1.address],
          '0x0000000000000000000000000000000000000004',
          '0x32'
        ])
        expect(result.value).toEqual('0x64')
      })

      it('token1 to ether', () => {
        const result = Router.swapCallParameters(
          Trade.exactIn(
            new Route([pair_0_1, pair_weth_0], token1, ETHER),
            TokenAmount.fromRawAmount(token1, JSBI.BigInt(100))
          ),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapExactTokensForETH')
        expect(result.args.slice(0, -1)).toEqual([
          '0x64',
          '0x50',
          [pair_0_1.address, pair_weth_0.address],
          [token1.address, token0.address, WETH[ChainId.MAINNET].address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
        checkDeadline(result.args[result.args.length - 1])
      })
      it('token0 to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactIn(new Route([pair_0_1], token0, token1), TokenAmount.fromRawAmount(token0, JSBI.BigInt(100))),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapExactTokensForTokens')
        expect(result.args.slice(0, -1)).toEqual([
          '0x64',
          '0x59',
          [pair_0_1.address],
          [token0.address, token1.address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
        checkDeadline(result.args[result.args.length - 1])
      })
    })
    describe('exact out', () => {
      it('ether to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactOut(
            new Route([pair_weth_0, pair_0_1], ETHER, token1),
            TokenAmount.fromRawAmount(token1, JSBI.BigInt(100))
          ),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapETHForExactTokens')
        expect(result.args.slice(0, -1)).toEqual([
          '0x64',
          [pair_weth_0.address, pair_0_1.address],
          [WETH[ChainId.MAINNET].address, token0.address, token1.address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x82')
        checkDeadline(result.args[result.args.length - 1])
      })
      it('token1 to ether', () => {
        const result = Router.swapCallParameters(
          Trade.exactOut(
            new Route([pair_0_1, pair_weth_0], token1, ETHER),
            CurrencyAmount.fromRawAmount(ETHER, JSBI.BigInt(100))
          ),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapTokensForExactETH')
        expect(result.args.slice(0, -1)).toEqual([
          '0x64',
          '0x82',
          [pair_0_1.address, pair_weth_0.address],
          [token1.address, token0.address, WETH[ChainId.MAINNET].address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
        checkDeadline(result.args[result.args.length - 1])
      })
      it('token0 to token1', () => {
        const result = Router.swapCallParameters(
          Trade.exactOut(new Route([pair_0_1], token0, token1), TokenAmount.fromRawAmount(token1, JSBI.BigInt(100))),
          { ttl: 50, recipient: '0x0000000000000000000000000000000000000004', allowedSlippage: new Percent('1', '100') }
        )
        expect(result.methodName).toEqual('swapTokensForExactTokens')
        expect(result.args.slice(0, -1)).toEqual([
          '0x64',
          '0x72',
          [pair_0_1.address],
          [token0.address, token1.address],
          '0x0000000000000000000000000000000000000004'
        ])
        expect(result.value).toEqual('0x0')
        checkDeadline(result.args[result.args.length - 1])
      })
    })
    describe('supporting fee on transfer', () => {
      describe('exact in', () => {
        it('ether to token1', () => {
          const result = Router.swapCallParameters(
            Trade.exactIn(
              new Route([pair_weth_0, pair_0_1], ETHER, token1),
              CurrencyAmount.fromRawAmount(ETHER, JSBI.BigInt(100))
            ),
            {
              ttl: 50,
              recipient: '0x0000000000000000000000000000000000000004',
              allowedSlippage: new Percent('1', '100'),
              feeOnTransfer: true
            }
          )
          expect(result.methodName).toEqual('swapExactETHForTokensSupportingFeeOnTransferTokens')
          expect(result.args.slice(0, -1)).toEqual([
            '0x50',
            [pair_weth_0.address, pair_0_1.address],
            [WETH[ChainId.MAINNET].address, token0.address, token1.address],
            '0x0000000000000000000000000000000000000004'
          ])
          expect(result.value).toEqual('0x64')
          checkDeadline(result.args[result.args.length - 1])
        })
        it('token1 to ether', () => {
          const result = Router.swapCallParameters(
            Trade.exactIn(
              new Route([pair_0_1, pair_weth_0], token1, ETHER),
              TokenAmount.fromRawAmount(token1, JSBI.BigInt(100))
            ),
            {
              ttl: 50,
              recipient: '0x0000000000000000000000000000000000000004',
              allowedSlippage: new Percent('1', '100'),
              feeOnTransfer: true
            }
          )
          expect(result.methodName).toEqual('swapExactTokensForETHSupportingFeeOnTransferTokens')
          expect(result.args.slice(0, -1)).toEqual([
            '0x64',
            '0x50',
            [pair_0_1.address, pair_weth_0.address],
            [token1.address, token0.address, WETH[ChainId.MAINNET].address],
            '0x0000000000000000000000000000000000000004'
          ])
          expect(result.value).toEqual('0x0')
          checkDeadline(result.args[result.args.length - 1])
        })
        it('token0 to token1', () => {
          const result = Router.swapCallParameters(
            Trade.exactIn(new Route([pair_0_1], token0, token1), TokenAmount.fromRawAmount(token0, JSBI.BigInt(100))),
            {
              ttl: 50,
              recipient: '0x0000000000000000000000000000000000000004',
              allowedSlippage: new Percent('1', '100'),
              feeOnTransfer: true
            }
          )
          expect(result.methodName).toEqual('swapExactTokensForTokensSupportingFeeOnTransferTokens')
          expect(result.args.slice(0, -1)).toEqual([
            '0x64',
            '0x59',
            [pair_0_1.address],
            [token0.address, token1.address],
            '0x0000000000000000000000000000000000000004'
          ])
          expect(result.value).toEqual('0x0')
          checkDeadline(result.args[result.args.length - 1])
        })
      })
      describe('exact out', () => {
        it('ether to token1', () => {
          expect(() =>
            Router.swapCallParameters(
              Trade.exactOut(
                new Route([pair_weth_0, pair_0_1], ETHER, token1),
                TokenAmount.fromRawAmount(token1, JSBI.BigInt(100))
              ),
              {
                ttl: 50,
                recipient: '0x0000000000000000000000000000000000000004',
                allowedSlippage: new Percent('1', '100'),
                feeOnTransfer: true
              }
            )
          ).toThrow('EXACT_OUT_FOT')
        })
        it('token1 to ether', () => {
          expect(() =>
            Router.swapCallParameters(
              Trade.exactOut(
                new Route([pair_0_1, pair_weth_0], token1, ETHER),
                CurrencyAmount.fromRawAmount(ETHER, JSBI.BigInt(100))
              ),
              {
                ttl: 50,
                recipient: '0x0000000000000000000000000000000000000004',
                allowedSlippage: new Percent('1', '100'),
                feeOnTransfer: true
              }
            )
          ).toThrow('EXACT_OUT_FOT')
        })
        it('token0 to token1', () => {
          expect(() =>
            Router.swapCallParameters(
              Trade.exactOut(
                new Route([pair_0_1], token0, token1),
                TokenAmount.fromRawAmount(token1, JSBI.BigInt(100))
              ),
              {
                ttl: 50,
                recipient: '0x0000000000000000000000000000000000000004',
                allowedSlippage: new Percent('1', '100'),
                feeOnTransfer: true
              }
            )
          ).toThrow('EXACT_OUT_FOT')
        })
      })
    })
  })
})
