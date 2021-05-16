import { getInput } from '@actions/core'
import start from './lib/index.js'

start({
  endpoint: getInput('endpoint', { required: true }),
  apiKey: getInput('api-key', { required: true }),
  secretKey: getInput('secret-key', { required: true }),
  symbol: getInput('symbol', { required: true }),
  quoteQuantity: getInput('quote-quantity', { required: true }),
  targetProfit: getInput('target-profit', { required: true }),
  clientOrderId: getInput('client-order-id', { required: true }),
  recordPath: getInput('record-path', { required: true })
}).catch(function (error) {
  console.error(error.stack)
  process.exit(1)
})
