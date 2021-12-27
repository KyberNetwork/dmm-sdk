import JSBI from 'jsbi'
import { Pair, Route } from '../src'
import { Token, WETH, ChainId, TokenAmount, Ether } from '@vutien/sdk-core'

describe('Route', () => {
  const ETHER = Ether.onChain(1)
  const pairAddress = '0x0000000000000000000000000000000000000003'
  const token0 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000001', 18, 't0')
  const token1 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000002', 18, 't1')
  const weth = WETH[ChainId.MAINNET]
  const fee = JSBI.BigInt(3e15)
  const ampBps = JSBI.BigInt(10000)
  const pair_0_1 = new Pair(
    pairAddress,
    TokenAmount.fromRawAmount(token0, '100'),
    TokenAmount.fromRawAmount(token1, '200'),
    TokenAmount.fromRawAmount(token0, '100'),
    TokenAmount.fromRawAmount(token1, '200'),
    fee,
    ampBps
  )
  const pair_0_weth = new Pair(
    pairAddress,
    TokenAmount.fromRawAmount(token0, '100'),
    TokenAmount.fromRawAmount(weth, '100'),
    TokenAmount.fromRawAmount(token0, '100'),
    TokenAmount.fromRawAmount(weth, '100'),
    fee,
    ampBps
  )
  const pair_1_weth = new Pair(
    pairAddress,
    TokenAmount.fromRawAmount(token1, '175'),
    TokenAmount.fromRawAmount(weth, '100'),
    TokenAmount.fromRawAmount(token1, '175'),
    TokenAmount.fromRawAmount(weth, '100'),
    fee,
    ampBps
  )

  it('constructs a path from the tokens', () => {
    const route = new Route([pair_0_1], token0, token1)
    expect(route.pairs).toEqual([pair_0_1])
    expect(route.path).toEqual([token0, token1])
    expect(route.input).toEqual(token0)
    expect(route.output).toEqual(token1)
    expect(route.chainId).toEqual(ChainId.MAINNET)
  })

  it('can have a token as both input and output', () => {
    const route = new Route([pair_0_weth, pair_0_1, pair_1_weth], weth, weth)
    expect(route.pairs).toEqual([pair_0_weth, pair_0_1, pair_1_weth])
    expect(route.input).toEqual(weth)
    expect(route.output).toEqual(weth)
  })

  it('supports ether input', () => {
    const route = new Route([pair_0_weth], ETHER, token0)
    expect(route.pairs).toEqual([pair_0_weth])
    expect(route.input).toEqual(ETHER)
    expect(route.output).toEqual(token0)
  })

  it('supports ether output', () => {
    const route = new Route([pair_0_weth], token0, ETHER)
    expect(route.pairs).toEqual([pair_0_weth])
    expect(route.input).toEqual(token0)
    expect(route.output).toEqual(ETHER)
  })
})
