import start from './lib/index.js'

const {
  BINANCE_ENDPOINT,
  BINANCE_API_KEY,
  BINANCE_SECRET_KEY,
  BINANCE_DCA_SYMBOL,
  BINANCE_DCA_QUOTE_QUANTITY,
  BINANCE_DCA_TARGET_PROFIT,
  BINANCE_DCA_CLIENT_ORDER_ID,
  BINANCE_DCA_RECORD_PATH,
} = process.env

start({
  endpoint: BINANCE_ENDPOINT,
  apiKey: BINANCE_API_KEY,
  secretKey: BINANCE_SECRET_KEY,
  symbol: BINANCE_DCA_SYMBOL,
  quoteQuantity: BINANCE_DCA_QUOTE_QUANTITY,
  targetProfit: BINANCE_DCA_TARGET_PROFIT,
  clientOrderId: BINANCE_DCA_CLIENT_ORDER_ID,
  recordPath: BINANCE_DCA_RECORD_PATH
}).catch(function (error) {
  console.error(error.stack)
  process.exit(1)
})
