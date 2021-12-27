import JSBI from 'jsbi'
import { Pair } from '../src'

import { TokenAmount, WETH, Price, ChainId, Token } from '@vutien/sdk-core'

describe('Pair', () => {
  const PAIR_ADDRESS = '0x0000000000000000000000000000000000000003'
  const USDC = new Token(ChainId.MAINNET, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 18, 'USDC', 'USD Coin')
  const DAI = new Token(ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'DAI Stablecoin')
  const USDC_AMOUNT = TokenAmount.fromRawAmount(USDC, '101')
  const DAI_AMOUNT = TokenAmount.fromRawAmount(DAI, '100')
  const V_USDC_AMOUNT = TokenAmount.fromRawAmount(USDC, '202')
  const V_DAI_AMOUNT = TokenAmount.fromRawAmount(USDC, '200')

  const FEE = JSBI.BigInt(0)

  const ampBps = JSBI.BigInt(0)

  describe('constructor', () => {
    it('cannot be used for tokens on different chains', () => {
      expect(
        () =>
          new Pair(
            PAIR_ADDRESS,
            USDC_AMOUNT,
            TokenAmount.fromRawAmount(WETH[ChainId.RINKEBY], '100'),
            V_USDC_AMOUNT,
            TokenAmount.fromRawAmount(WETH[ChainId.RINKEBY], '100'),
            FEE,
            ampBps
          )
      ).toThrow('CHAIN_IDS')
    })
  })

  describe('#token0', () => {
    it('always is the token that sorts before', () => {
      expect(new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps).token0).toEqual(
        DAI
      )
      expect(new Pair(PAIR_ADDRESS, DAI_AMOUNT, USDC_AMOUNT, V_DAI_AMOUNT, V_USDC_AMOUNT, FEE, ampBps).token0).toEqual(
        DAI
      )
    })
  })
  describe('#token1', () => {
    it('always is the token that sorts after', () => {
      expect(new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps).token1).toEqual(
        USDC
      )
      expect(new Pair(PAIR_ADDRESS, DAI_AMOUNT, USDC_AMOUNT, V_DAI_AMOUNT, V_USDC_AMOUNT, FEE, ampBps).token1).toEqual(
        USDC
      )
    })
  })
  describe('#reserve0', () => {
    it('always comes from the token that sorts before', () => {
      expect(
        new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps).reserve0
      ).toEqual(DAI_AMOUNT)
      expect(
        new Pair(PAIR_ADDRESS, DAI_AMOUNT, USDC_AMOUNT, V_DAI_AMOUNT, V_USDC_AMOUNT, FEE, ampBps).reserve0
      ).toEqual(DAI_AMOUNT)
    })
  })
  describe('#reserve1', () => {
    it('always comes from the token that sorts after', () => {
      expect(
        new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps).reserve1
      ).toEqual(USDC_AMOUNT)
      expect(
        new Pair(PAIR_ADDRESS, DAI_AMOUNT, USDC_AMOUNT, V_DAI_AMOUNT, V_USDC_AMOUNT, FEE, ampBps).reserve1
      ).toEqual(USDC_AMOUNT)
    })
  })

  describe('#token0Price', () => {
    it('returns price of token0 in terms of token1', () => {
      expect(
        new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps).token0Price
      ).toEqual(new Price(DAI, USDC, '200', '202'))
      expect(
        new Pair(PAIR_ADDRESS, DAI_AMOUNT, USDC_AMOUNT, V_DAI_AMOUNT, V_USDC_AMOUNT, FEE, ampBps).token0Price
      ).toEqual(new Price(DAI, USDC, '200', '202'))
    })
  })

  describe('#token1Price', () => {
    it('returns price of token1 in terms of token0', () => {
      expect(
        new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps).token1Price
      ).toEqual(new Price(USDC, DAI, '202', '200'))
      expect(
        new Pair(PAIR_ADDRESS, DAI_AMOUNT, USDC_AMOUNT, V_DAI_AMOUNT, V_USDC_AMOUNT, FEE, ampBps).token1Price
      ).toEqual(new Price(USDC, DAI, '202', '200'))
    })
  })

  describe('#priceOf', () => {
    const pair = new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps)
    it('returns price of token in terms of other token', () => {
      expect(pair.priceOf(DAI)).toEqual(pair.token0Price)
      expect(pair.priceOf(USDC)).toEqual(pair.token1Price)
    })

    it('throws if invalid token', () => {
      expect(() => pair.priceOf(WETH[ChainId.MAINNET])).toThrow('TOKEN')
    })
  })

  describe('#reserveOf', () => {
    it('returns reserves of the given token', () => {
      expect(
        new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps).reserveOf(USDC)
      ).toEqual(USDC_AMOUNT)
      expect(
        new Pair(PAIR_ADDRESS, DAI_AMOUNT, USDC_AMOUNT, V_DAI_AMOUNT, V_USDC_AMOUNT, FEE, ampBps).reserveOf(USDC)
      ).toEqual(USDC_AMOUNT)
    })

    it('throws if not in the pair', () => {
      expect(() =>
        new Pair(PAIR_ADDRESS, DAI_AMOUNT, USDC_AMOUNT, V_DAI_AMOUNT, V_USDC_AMOUNT, FEE, ampBps).reserveOf(
          WETH[ChainId.MAINNET]
        )
      ).toThrow('TOKEN')
    })
  })

  describe('#chainId', () => {
    it('returns the token0 chainId', () => {
      expect(new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps).chainId).toEqual(
        ChainId.MAINNET
      )
      expect(new Pair(PAIR_ADDRESS, DAI_AMOUNT, USDC_AMOUNT, V_DAI_AMOUNT, V_USDC_AMOUNT, FEE, ampBps).chainId).toEqual(
        ChainId.MAINNET
      )
    })
  })
  describe('#involvesToken', () => {
    expect(
      new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps).involvesToken(USDC)
    ).toEqual(true)
    expect(
      new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps).involvesToken(DAI)
    ).toEqual(true)
    expect(
      new Pair(PAIR_ADDRESS, USDC_AMOUNT, DAI_AMOUNT, V_USDC_AMOUNT, V_DAI_AMOUNT, FEE, ampBps).involvesToken(
        WETH[ChainId.MAINNET]
      )
    ).toEqual(false)
  })
})
