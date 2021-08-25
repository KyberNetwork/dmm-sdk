# Example to calculate slippage rate

- Update the params in `src/slippageRate.json`

  - `baseAmount` and `quoteAmount` are the amount of token to put in the reserve (in wei)
  - `ampBps` is the amplification factor in basic point
  - `baseDecimals` and `quoteDecimals` are the decimals of base and quote token
  - `amount` and `slippageAmount` are the amount to query the rate (in wei), compute the diff and we get slippage rate

```json
{
    "baseAmount": "15696472493555971572446",
    "quoteAmount": "49046616430683",
    "ampBps": 12000,
    "baseDecimals": 18,
    "quoteDecimals": 6,
    "amount": "100000000",
    "slippageAmount": "100000000000"
}
```

- install

```shell
yarn install
```

- run the script

```shell
yarn tsc && node --experimental-json-modules dist/src/index.js
```
