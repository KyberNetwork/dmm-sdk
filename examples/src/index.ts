// import * as fs from 'fs'
import JSBI from 'jsbi'

import { Pair, Price, Token, TokenAmount } from '@dynamic-amm/sdk'

import data from './slippageRate.json'

const BPS = JSBI.BigInt(10000)

const ampBps = JSBI.BigInt(data.ampBps)
let baseFeeInPrecision: JSBI

if (JSBI.lessThanOrEqual(ampBps, JSBI.BigInt(20000))) {
  baseFeeInPrecision = JSBI.BigInt(3000000000000000) // 30 bps
} else if (JSBI.lessThanOrEqual(ampBps, JSBI.BigInt(50000))) {
  baseFeeInPrecision = JSBI.BigInt(2000000000000000) // 20 bps
} else if (JSBI.lessThanOrEqual(ampBps, JSBI.BigInt(200000))) {
  baseFeeInPrecision = JSBI.BigInt(1000000000000000) // 10 bps
} else {
  baseFeeInPrecision = JSBI.BigInt(400000000000000) // 4 bps
}
console.log(`baseFeeInPrecision:${baseFeeInPrecision}`)

let baseToken = new Token(1, '0x0000000000000000000000000000000000000001', data.baseDecimals, 'b', 'base')
let quoteToken = new Token(1, '0x0000000000000000000000000000000000000002', data.quoteDecimals, 'q', 'quote')

let baseAmount = new TokenAmount(baseToken, data.baseAmount)
let quoteAmount = new TokenAmount(quoteToken, data.quoteAmount)
let vBaseAmount = new TokenAmount(baseToken, JSBI.divide(JSBI.multiply(baseAmount.raw, ampBps), BPS))
let vQuoteAmount = new TokenAmount(quoteToken, JSBI.divide(JSBI.multiply(quoteAmount.raw, ampBps), BPS))

console.log(baseAmount.raw.toString(), vBaseAmount.raw.toString())
console.log(quoteAmount.raw.toString(), vQuoteAmount.raw.toString())

let pair = new Pair(
  '0x0000000000000000000000000000000000000003',
  baseAmount,
  quoteAmount,
  vBaseAmount,
  vQuoteAmount,
  baseFeeInPrecision,
  ampBps
)

let amountIn = new TokenAmount(quoteToken, data.amount)
let amountOut = pair.getOutputAmount(amountIn)[0]
let baseBuyPrice = new Price(amountIn.token, amountOut.token, amountIn.raw, amountOut.raw)
console.log(`baseBuyPrice:${baseBuyPrice.adjusted.toSignificant(5)}`)

let slippageAmountIn = new TokenAmount(quoteToken, data.slippageAmount)
let slippageAmountOut = pair.getOutputAmount(slippageAmountIn)[0]

let slippageBuyPrice = new Price(
  slippageAmountIn.token,
  slippageAmountOut.token,
  slippageAmountIn.raw,
  slippageAmountOut.raw
)
console.log(`slippageBuyPrice:${slippageBuyPrice.adjusted.toSignificant(5)}`)

let slippageRate = baseBuyPrice
  .subtract(slippageBuyPrice)
  .multiply(JSBI.BigInt(100))
  .divide(baseBuyPrice)
  .toSignificant(4)

console.log(`buySlippageRate: ${slippageRate} %`)
