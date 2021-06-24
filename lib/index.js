import { strict as assert } from 'assert'

import BigNumber from 'bignumber.js'

import Binance from './binance.js'
import Record from './record.js'

/**
 * @param {object} options
 * @param {string} options.endpoint
 * @param {string} options.apiKey
 * @param {string} options.secretKey
 * @param {string} options.symbol
 * @param {string} options.quoteQuantity
 * @param {string} options.targetProfit
 * @param {string} options.clientOrderId
 * @param {string} options.recordPath
 */
export default async function start({
  endpoint,
  apiKey,
  secretKey,
  symbol,
  quoteQuantity,
  targetProfit,
  clientOrderId,
  recordPath
}) {
  const binance = new Binance({ apiKey, secretKey, endpoint })

  assert(typeof symbol === 'string' && symbol)
  assert(Number.isFinite(Number(quoteQuantity)) && Number(quoteQuantity) > 0)
  assert(Number.isFinite(Number(targetProfit)) && Number(targetProfit) > 0)
  assert(typeof clientOrderId === 'string' && clientOrderId)

  const record = new Record(recordPath)

  const {
    symbols: [info]
  } = await binance.exchangeInformation({ symbol })
  assert.equal(info.symbol, symbol)

  let quantity = ''
  try {
    ;({ executedQty: quantity, cummulativeQuoteQty: quoteQuantity } = await binance.newOrder({
      symbol,
      side: 'BUY',
      type: 'MARKET',
      quoteOrderQty: quoteQuantity
    }))

    console.log(`Bought ${quantity} ${info.baseAsset} for ${quoteQuantity} ${info.quoteAsset}`)
  } catch (error) {
    assert(error.response && error.response.data && error.response.data.code === -2010, error)

    console.log(`Not enough ${info.quoteAsset} to buy ${info.baseAsset}, skip`)
  }

  try {
    await binance.cancelOrder({ symbol, origClientOrderId: clientOrderId })
    console.log('Not sold yet')
    if (quantity && quoteQuantity) {
      console.log('Append to current recordset')
      await record.append(quantity, quoteQuantity)
    }
  } catch (error) {
    assert(error.response && error.response.data && error.response.data.code === -2011, error)

    console.log('Sold already')
    if (quantity && quoteQuantity) {
      console.log('Create new recordset')
      await record.create(quantity, quoteQuantity)
    }
  }

  const [totalQuantity, totalQuoteQuantity] = await record.calculateTotalQuoteQuantity()
  console.log(`Totally bought ${totalQuantity} ${info.baseAsset} with ${totalQuoteQuantity} ${info.quoteAsset}`)

  const averagePrice = totalQuoteQuantity.dividedBy(totalQuantity)
  console.log(`Average price: ${averagePrice} ${info.quoteAsset}/${info.baseAsset}`)

  let targetPrice = averagePrice.multipliedBy(1 + Number(targetProfit))

  const { balances } = await binance.accountInformation()
  const balance = balances.filter(({ asset }) => asset === info.baseAsset)[0]
  const freeQuantity = new BigNumber(balance.free)
  console.log(`There are ${freeQuantity} ${info.baseAsset} free in wallet.`)

  let targetQuantity = BigNumber.min(totalQuantity, freeQuantity)

  console.log(`Will sell ${targetQuantity} ${info.baseAsset} by ${targetPrice} ${info.quoteAsset}/${info.baseAsset}`)

  const priceFilter = info.filters.filter(({ filterType }) => filterType === 'PRICE_FILTER')[0]
  const lotSize = info.filters.filter(({ filterType }) => filterType === 'LOT_SIZE')[0]
  const minNotional = info.filters.filter(({ filterType }) => filterType === 'MIN_NOTIONAL')[0]

  if (minNotional) {
    targetPrice = BigNumber.max(targetPrice, new BigNumber(minNotional.minNotional).dividedBy(targetQuantity))
    console.log(
      'Min notional filter:',
      `Will sell ${targetQuantity} ${info.baseAsset} by ${targetPrice} ${info.quoteAsset}/${info.baseAsset}`
    )
  }
  if (priceFilter) {
    targetPrice = targetPrice
      .minus(priceFilter.minPrice)
      .dividedToIntegerBy(priceFilter.tickSize)
      .plus(1)
      .multipliedBy(priceFilter.tickSize)
      .plus(priceFilter.minPrice)
    console.log(
      'Price filter:',
      `Will sell ${targetQuantity} ${info.baseAsset} by ${targetPrice} ${info.quoteAsset}/${info.baseAsset}`
    )
  }
  if (lotSize) {
    targetQuantity = targetQuantity
      .minus(lotSize.minQty)
      .dividedToIntegerBy(lotSize.stepSize)
      .multipliedBy(lotSize.stepSize)
      .plus(lotSize.minQty)
    console.log(
      'Lot size filter:',
      `Will sell ${targetQuantity} ${info.baseAsset} by ${targetPrice} ${info.quoteAsset}/${info.baseAsset}`
    )
  }

  await binance.newOrder({
    symbol,
    side: 'SELL',
    type: 'LIMIT',
    timeInForce: 'GTC',
    quantity: targetQuantity.toString(),
    price: targetPrice.toString(),
    newClientOrderId: clientOrderId
  })

  console.log(`Selling ${targetQuantity} ${info.baseAsset} by ${targetPrice} ${info.quoteAsset}/${info.baseAsset}`)
}
