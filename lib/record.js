import { strict as assert } from 'assert'
import { createReadStream, createWriteStream } from 'fs'

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
