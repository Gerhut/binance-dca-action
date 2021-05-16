# binance-dca-action

Invest cryptocurrency on Binance using GitHub actions.

**Caution: Only for study, use as your own risks. I have not made any earnings by this DCA strategy.**

## Quick Start

1. [Register Binance account](https://accounts.binance.com/en/register)
2. Buy some USDT (10 at least)
3. [Create Binance API key](https://www.binance.com/en/my/settings/api-management)
4. [Create new GitHub repository](https://github.com/new)
5. In repository view, enter `Settings -> Secrets -> New repository secrets`,
   and put your **Binance API key** and **Binance Secret key** here as `BINANCE_API_KEY`
   and `BINANCE_SECRET_KEY`.
6. Create file `.github/workflows/dca.yaml` with:

```yaml
on:
    schedule:
        - cron: '0 * * * *' # Invest per hour

jobs:
    dca:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v2
            - uses: Gerhut/binance-dca-action@v1
                with:
                    api-key: {{ secrets.BINANCE_API_KEY }}
                    secret-key: {{ secrets.BINANCE_SECRET_KEY }}
            - run: |
                git config user.name "GitHub Actions"
                git config user.email actions@github.com
                git add --all
                git diff-index --quiet HEAD || git commit --message="Update DCA records"
                git push
```

## Configurations

```yaml
- uses: Gerhut/binance-dca-action@v1
    with:
        # Binance API endpoint.
        #
        # Default: https://api.binance.com
        endpoint: ''

        # Binance API key.
        # Created in https://www.binance.com/en/my/settings/api-management
        api-key: ''

        # Binance secret key.
        # Created in https://www.binance.com/en/my/settings/api-management
        secret-key: ''

        # Symbol to invest.
        #
        # Default: BTCUSDT (buy BTC with USDT)
        symbol: ''

        # Quote quantity cost each time.
        #
        # Default: 10 (buy BTC with 10 USDT each time, if the symbol is BTCUSDT)
        quote-quantity: ''

        # Target profit of the DCA.
        #
        # Default: 0.01 (the selling order will be published as 1.01 times total cost)
        target-profit: ''

        # Unique client order id of the trade.
        # If you are running multiple DCAs, keep the client order id different.
        #
        # Default: ${{ github.action }}-${{ github.job }}
        client-order-id: ''

        # The file to record the costs, used for calculation of total cost.
        #
        # Default ${{ github.action }}-${{ github.job }}.csv
        record-path: ''
```
