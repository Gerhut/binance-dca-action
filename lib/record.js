import { strict as assert } from 'assert'
import { createReadStream, createWriteStream } from 'fs'
import { finished } from 'stream'
import { promisify } from 'util'

import csv from 'csv'
import BigNumber from 'bignumber.js'

const { stringify, parse } = csv

export default class Record {
  /**
   * @param {string} path
   */
  constructor(path) {
    assert(typeof path === 'string' && path)
    /** @private */
    this._path = path
  }

  /**
   * @private
   * @param {string} quantity
   * @param {string} quoteQuantity
   * @param {'w' | 'a'} flags
   */
  async _write(quantity, quoteQuantity, flags) {
    assert(Number.isFinite(Number(quantity)) && Number(quantity) > 0)
    assert(Number.isFinite(Number(quoteQuantity)) && Number(quoteQuantity) > 0)

    const stringifier = stringify()
    stringifier.pipe(createWriteStream(this._path, { flags }))
    stringifier.end([new Date().toISOString(), quantity, quoteQuantity])

    await promisify(finished)(stringifier)
  }

  /**
   * @returns {Promise<[orders: number, tailSkipOrders: number]>}
   */
  async countOrders() {
    const parser = createReadStream(this._path).pipe(parse())

    let orders = 0
    let tailSkipOrders = 0
    for await (const [, quantity, quoteQuantity] of parser) {
      if (quantity === '0' && quoteQuantity === '0') {
        tailSkipOrders += 1
      } else {
        orders += 1
        tailSkipOrders = 0
      }
    }

    return [orders, tailSkipOrders]
  }

  /**
   * @returns {Promise<[quantity: BigNumber, quoteQuantity: BigNumber]>}
   */
  async calculateTotalQuoteQuantity() {
    const parser = createReadStream(this._path).pipe(parse())

    let totalQuantity = new BigNumber(0)
    let totalQuoteQuantity = new BigNumber(0)
    for await (const [, quantity, quoteQuantity] of parser) {
      totalQuantity = totalQuantity.plus(quantity)
      totalQuoteQuantity = totalQuoteQuantity.plus(quoteQuantity)
    }

    return [totalQuantity, totalQuoteQuantity]
  }

  /**
   * @param {string} quantity
   * @param {string} quoteQuantity
   */
  async create(quantity, quoteQuantity) {
    await this._write(quantity, quoteQuantity, 'w')
  }

  /**
   * @param {string} quantity
   * @param {string} quoteQuantity
   */
  async append(quantity, quoteQuantity) {
    await this._write(quantity, quoteQuantity, 'a')
  }
}
