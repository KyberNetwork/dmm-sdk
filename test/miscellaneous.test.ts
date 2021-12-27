import { ZERO } from '../src/constants'
import JSBI from 'jsbi'
import { Pair, InsufficientInputAmountError } from '../src'
import { ChainId, Token, TokenAmount, sortedInsert } from '@vutien/sdk-core'

const ampBps = JSBI.BigInt(10000)

describe('miscellaneous', () => {
  it('getLiquidityMinted:0', async () => {
    const tokenA = new Token(ChainId.RINKEBY, '0x0000000000000000000000000000000000000001', 18)
    const tokenB = new Token(ChainId.RINKEBY, '0x0000000000000000000000000000000000000002', 18)
    const pair = new Pair(
      '0x0000000000000000000000000000000000000003',
      TokenAmount.fromRawAmount(tokenA, '0'),
      TokenAmount.fromRawAmount(tokenB, '0'),
      TokenAmount.fromRawAmount(tokenA, '0'),
      TokenAmount.fromRawAmount(tokenB, '0'),
      JSBI.BigInt(0),
      ampBps
    )

    expect(() => {
      pair.getLiquidityMinted(
        TokenAmount.fromRawAmount(pair.liquidityToken, '0'),
        TokenAmount.fromRawAmount(tokenA, '1000'),
        TokenAmount.fromRawAmount(tokenB, '1000')
      )
    }).toThrow(InsufficientInputAmountError)

    expect(() => {
      pair.getLiquidityMinted(
        TokenAmount.fromRawAmount(pair.liquidityToken, '0'),
        TokenAmount.fromRawAmount(tokenA, '1000000'),
        TokenAmount.fromRawAmount(tokenB, '1')
      )
    }).toThrow(InsufficientInputAmountError)

    const liquidity = pair.getLiquidityMinted(
      TokenAmount.fromRawAmount(pair.liquidityToken, '0'),
      TokenAmount.fromRawAmount(tokenA, '1001'),
      TokenAmount.fromRawAmount(tokenB, '1001')
    )

    expect(liquidity.quotient.toString()).toEqual('1')
  })

  it('getLiquidityMinted:!0', async () => {
    const tokenA = new Token(ChainId.RINKEBY, '0x0000000000000000000000000000000000000001', 18)
    const tokenB = new Token(ChainId.RINKEBY, '0x0000000000000000000000000000000000000002', 18)
    const pair = new Pair(
      '0x0000000000000000000000000000000000000003',
      TokenAmount.fromRawAmount(tokenA, '10000'),
      TokenAmount.fromRawAmount(tokenB, '10000'),
      TokenAmount.fromRawAmount(tokenA, '10000'),
      TokenAmount.fromRawAmount(tokenB, '10000'),
      JSBI.BigInt(0),
      ampBps
    )

    expect(
      pair
        .getLiquidityMinted(
          TokenAmount.fromRawAmount(pair.liquidityToken, '10000'),
          TokenAmount.fromRawAmount(tokenA, '2000'),
          TokenAmount.fromRawAmount(tokenB, '2000')
        )
        .quotient.toString()
    ).toEqual('2000')
  })

  it('getLiquidityValue:!feeOn', async () => {
    const tokenA = new Token(ChainId.RINKEBY, '0x0000000000000000000000000000000000000001', 18)
    const tokenB = new Token(ChainId.RINKEBY, '0x0000000000000000000000000000000000000002', 18)
    const pair = new Pair(
      '0x0000000000000000000000000000000000000003',
      TokenAmount.fromRawAmount(tokenA, '1000'),
      TokenAmount.fromRawAmount(tokenB, '1000'),
      TokenAmount.fromRawAmount(tokenA, '1000'),
      TokenAmount.fromRawAmount(tokenB, '1000'),
      JSBI.BigInt(0),
      ampBps
    )

    {
      const liquidityValue = pair.getLiquidityValue(
        tokenA,
        TokenAmount.fromRawAmount(pair.liquidityToken, '1000'),
        TokenAmount.fromRawAmount(pair.liquidityToken, '1000'),
        ZERO
      )
      expect(liquidityValue.currency.equals(tokenA)).toBe(true)
      expect(liquidityValue.quotient.toString()).toBe('1000')
    }

    // 500
    {
      const liquidityValue = pair.getLiquidityValue(
        tokenA,
        TokenAmount.fromRawAmount(pair.liquidityToken, '1000'),
        TokenAmount.fromRawAmount(pair.liquidityToken, '500'),
        ZERO
      )
      expect(liquidityValue.currency.equals(tokenA)).toBe(true)
      expect(liquidityValue.quotient.toString()).toBe('500')
    }

    // tokenB
    {
      const liquidityValue = pair.getLiquidityValue(
        tokenB,
        TokenAmount.fromRawAmount(pair.liquidityToken, '1000'),
        TokenAmount.fromRawAmount(pair.liquidityToken, '1000'),
        ZERO
      )
      expect(liquidityValue.currency.equals(tokenB)).toBe(true)
      expect(liquidityValue.quotient.toString()).toBe('1000')
    }
  })

  it('getLiquidityValue:feeOn', async () => {
    const tokenA = new Token(ChainId.RINKEBY, '0x0000000000000000000000000000000000000001', 18)
    const tokenB = new Token(ChainId.RINKEBY, '0x0000000000000000000000000000000000000002', 18)
    const pair = new Pair(
      '0x0000000000000000000000000000000000000003',
      TokenAmount.fromRawAmount(tokenA, '1000'),
      TokenAmount.fromRawAmount(tokenB, '1000'),
      TokenAmount.fromRawAmount(tokenA, '1000'),
      TokenAmount.fromRawAmount(tokenB, '1000'),
      JSBI.BigInt(0),
      ampBps
    )

    const liquidityValue = pair.getLiquidityValue(
      tokenA,
      TokenAmount.fromRawAmount(pair.liquidityToken, '500'),
      TokenAmount.fromRawAmount(pair.liquidityToken, '500'),
      JSBI.BigInt(1000),
      '250000' // 500 ** 2
    )
    expect(liquidityValue.currency.equals(tokenA)).toBe(true)
    expect(liquidityValue.quotient.toString()).toBe('938')
  })

  describe('#sortedInsert', () => {
    const comp = (a: number, b: number) => a - b

    it('throws if maxSize is 0', () => {
      expect(() => sortedInsert([], 1, 0, comp)).toThrow('MAX_SIZE_ZERO')
    })

    it('throws if items.length > maxSize', () => {
      expect(() => sortedInsert([1, 2], 1, 1, comp)).toThrow('ITEMS_SIZE')
    })

    it('adds if empty', () => {
      const arr: number[] = []
      expect(sortedInsert(arr, 3, 2, comp)).toEqual(null)
      expect(arr).toEqual([3])
    })

    it('adds if not full', () => {
      const arr: number[] = [1, 5]
      expect(sortedInsert(arr, 3, 3, comp)).toEqual(null)
      expect(arr).toEqual([1, 3, 5])
    })

    it('adds if will not be full after', () => {
      const arr: number[] = [1]
      expect(sortedInsert(arr, 0, 3, comp)).toEqual(null)
      expect(arr).toEqual([0, 1])
    })

    it('returns add if sorts after last', () => {
      const arr = [1, 2, 3]
      expect(sortedInsert(arr, 4, 3, comp)).toEqual(4)
      expect(arr).toEqual([1, 2, 3])
    })

    it('removes from end if full', () => {
      const arr = [1, 3, 4]
      expect(sortedInsert(arr, 2, 3, comp)).toEqual(4)
      expect(arr).toEqual([1, 2, 3])
    })

    it('uses comparator', () => {
      const arr = [4, 2, 1]
      expect(sortedInsert(arr, 3, 3, (a, b) => comp(a, b) * -1)).toEqual(1)
      expect(arr).toEqual([4, 3, 2])
    })

    describe('maxSize of 1', () => {
      it('empty add', () => {
        const arr: number[] = []
        expect(sortedInsert(arr, 3, 1, comp)).toEqual(null)
        expect(arr).toEqual([3])
      })
      it('full add greater', () => {
        const arr: number[] = [2]
        expect(sortedInsert(arr, 3, 1, comp)).toEqual(3)
        expect(arr).toEqual([2])
      })
      it('full add lesser', () => {
        const arr: number[] = [4]
        expect(sortedInsert(arr, 3, 1, comp)).toEqual(4)
        expect(arr).toEqual([3])
      })
    })
  })
})
