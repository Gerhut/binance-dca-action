import { strict as assert } from 'assert'
import { createHmac } from 'crypto'

import axios from 'axios'
import Debug from 'debug'

const debug = Debug('Binance')

export default class Binance {
  /**
   * @param {object} options
   * @param {string} [options.apiKey]
   * @param {string} [options.secretKey]
   * @param {string} [options.endpoint="https://api.binance.com"]
   */
  constructor({ apiKey, secretKey, endpoint = 'https://api.binance.com' }) {
    assert(typeof endpoint === 'string' && endpoint)

    /** @private */
    this._apiKey = apiKey
    /** @private */
    this._secretKey = secretKey

    /** @private */
    this._axios = axios.create({ baseURL: endpoint })
    /** @private */
    this._uid = 0
  }

  /**
   * @private
   * @param {import('axios').AxiosRequestConfig} config
   */
  _addApiKey(config) {
    assert(typeof this._apiKey === 'string' && this._apiKey)
    if (config.headers === undefined) config.headers = {}
    config.headers['X-MBX-APIKEY'] = this._apiKey
  }

  /**
   * @private
   * @param {import('axios').AxiosRequestConfig} config
   */
  _sign({ params, data }) {
    assert(typeof this._secretKey === 'string' && this._secretKey)
    params.set('timestamp', String(Date.now()))

    const hmac = createHmac('sha256', this._secretKey)
    hmac.update(params.toString(), 'ascii')
    hmac.update(data.toString(), 'ascii')

    const signature = hmac.digest('hex')
    params.set('signature', signature)
  }

  /**
   * @param {string} url
   * @param {object} [config={}]
   * @param {import('axios').Method} [config.method='GET']
   * @param {Record<string, unknown>} [config.params]
   * @param {Record<string, unknown>} [config.data]
   * @param {boolean} [config.addApiKey=false]
   * @param {boolean} [config.sign=false]
   */
  async call(url, { method = 'GET', params, data, addApiKey = false, sign = false } = {}) {
    /** @type {import('axios').AxiosRequestConfig} */
    const config = { method, url, params, data }

    config.params = new URLSearchParams(config.params)
    config.data = new URLSearchParams(config.data)

    if (addApiKey) this._addApiKey(config)
    if (sign) this._sign(config)

    const uid = ++this._uid

    debug('(%d) %s %s <- %O', uid, method, url, { params, data })

    try {
      const response = await this._axios.request(config)

      debug('(%d) %s %s -> (%d) %O', uid, response.config.method, response.config.url, response.status, response.data)

      return response.data
    } catch (error) {
      const { response, config } = error

      if (response && config) {
        debug('(%d) %s %s -> (%d) %O', uid, method, url, response.status, response.data)
      }

      throw error
    }
  }

  /**
   * @param {Record<string, unknown>} params
   */
  exchangeInformation(params) {
    return this.call('/api/v3/exchangeInfo', { params })
  }

  accountInformation() {
    return this.call('/api/v3/account', { addApiKey: true, sign: true })
  }

  /**
   * @param {Record<string, unknown>} data
   */
   getOrder(data) {
    return this.call('/api/v3/order', {
      method: 'GET',
      data,
      addApiKey: true,
      sign: true
    })
  }

  /**
   * @param {Record<string, unknown>} data
   */
  newOrder(data) {
    return this.call('/api/v3/order', {
      method: 'POST',
      data,
      addApiKey: true,
      sign: true
    })
  }

  /**
   * @param {Record<string, unknown>} params
   */
  cancelOrder(params) {
    return this.call('/api/v3/order', {
      method: 'DELETE',
      params,
      addApiKey: true,
      sign: true
    })
  }
}
