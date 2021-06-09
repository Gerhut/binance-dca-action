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

  if (await isSold()) {
    const [quantity, quoteQuantity] = await buy();
    if (quantity || quoteQuantity) {
      const [totalQuantity, totalQuoteQuantity] = await create(quantity, quoteQuantity)
      await sell(totalQuantity, totalQuoteQuantity)
    }
  } else if (await shouldSkip()) {
    await skip()
  } else {
    const [quantity, quoteQuantity] = await buy();
    if (quantity || quoteQuantity) {
      const [totalQuantity, totalQuoteQuantity] = await async function () {
        if (await cancel()) {
          return append(quantity, quoteQuantity)
        } else {
          return create(quantity, quoteQuantity)
        }
      } ()
      await sell(totalQuantity, totalQuoteQuantity)
    }
  }

  async function isSold() {
    const { status } = await binance.getOrder({ symbol, origClientOrderId: clientOrderId })
    return status === "FILLED"
  }

  /**
   * @return {Promise<[string, string]>}
   */
  async function buy() {
    try {
      const { executedQty, cummulativeQuoteQty } = await binance.newOrder({
        symbol,
        side: 'BUY',
        type: 'MARKET',
        quoteOrderQty: quoteQuantity
      })

      console.log(`Bought ${executedQty} ${info.baseAsset} for ${cummulativeQuoteQty} ${info.quoteAsset}`)

      return [executedQty, cummulativeQuoteQty]
    } catch (error) {
      assert(error.response && error.response.data && error.response.data.code === -2010, error)

      console.log(`Not enough ${info.quoteAsset} to buy ${info.baseAsset}, skip`)

      return ['', '']
    }
  }

  /**
   * @param {BigNumber} totalQuantity
   * @param {BigNumber} totalQuoteQuantity
   */
  async function sell(totalQuantity, totalQuoteQuantity) {
    const averagePrice = totalQuoteQuantity.dividedBy(totalQuantity)
    console.log(`Average price: ${averagePrice} ${info.quoteAsset}/${info.baseAsset}`)

    let targetPrice = averagePrice.multipliedBy(1 + Number(targetProfit))

    const { balances } = await binance.accountInformation()
    const balance = balances.filter(({ asset }) => asset === info.baseAsset)[0]
    const freeQuantity = new BigNumber(balance.free)
    console.log(`There are ${freeQuantity} ${info.baseAsset} free in wallet.`)

    let targetQuantity = BigNumber.min(totalQuantity, freeQuantity)

    for (const filter of info.filters) {
      if (filter.filterType === 'PRICE_FILTER') {
        targetPrice = targetPrice
          .minus(filter.minPrice)
          .dividedToIntegerBy(filter.tickSize)
          .multipliedBy(filter.tickSize)
          .plus(filter.minPrice)
      } else if (filter.filterType === 'LOT_SIZE') {
        targetQuantity = targetQuantity
          .minus(filter.minQty)
          .dividedToIntegerBy(filter.stepSize)
          .multipliedBy(filter.stepSize)
          .plus(filter.minQty)
      }
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

  async function cancel() {
    try {
      await binance.cancelOrder({ symbol, origClientOrderId: clientOrderId })

      console.log(`Not sold yet`)

      return true
    } catch (error) {
      assert(error.response && error.response.data && error.response.data.code === -2011, error)

      console.log(`Sold already`)

      return false
    }
  }

  /**
   * @param {string} quantity
   * @param {string} quoteQuantity
   * @return {Promise<[BigNumber, BigNumber]>}
   */
  async function create(quantity, quoteQuantity) {
    await record.create(quantity, quoteQuantity)
    const [totalQuantity, totalQuoteQuantity] = await record.calculateTotalQuoteQuantity()

    console.log(`Totally bought ${totalQuantity} ${info.baseAsset} with ${totalQuoteQuantity} ${info.quoteAsset}`)

    return [totalQuantity, totalQuoteQuantity]
  }

  /**
   * @param {string} quantity
   * @param {string} quoteQuantity
   * @return {Promise<[BigNumber, BigNumber]>}
   */
  async function append(quantity, quoteQuantity) {
    await record.append(quantity, quoteQuantity)
    const [totalQuantity, totalQuoteQuantity] = await record.calculateTotalQuoteQuantity()

    console.log(`Totally bought ${totalQuantity} ${info.baseAsset} with ${totalQuoteQuantity} ${info.quoteAsset}`)

    return [totalQuantity, totalQuoteQuantity]
  }

  function skip() {
    console.log('Skip')

    return record.append('0', '0')
  }

  async function shouldSkip() {
    const [orders, tailSkipOrders] = await record.countOrders()

    console.log(`Bought ${orders} times and skipped ${tailSkipOrders} times after last bought.`)

    return orders < tailSkipOrders
  }
}
