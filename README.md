# Mining Weight Indicator

Sudo mini app that scores **Proof of Useful Participation** from a verified WebApp session.

The gauge is Effective User Weight (`UBW × SybilGate`) on a 0.1–1.0 scale. Filter cards show live sub-scores from the economic design paper, not dummy design weights.

## Local

```bash
cp .env.example .env
# set SUDO_BOT_TOKEN=botId:secret
npm install
npm test
npm run dev
```

Open the mini app from the Sudo bot chat. A browser tab has no signed `initData`, so it can only show a preview score.

## Scoring

`POST /api/session` verifies `initData`, calls Bot API `getMe`, records a visit, then returns:

- `UBW = 0.20T + 0.12P + 0.12PN + 0.36W + 0.10R + 0.10C`
- `EUW = UBW × SybilGate`
- workpower `EUW / 100`

Premium tenure, swap volume, referral farms, and community allocation need protocol feeds that the Bot API does not expose. Those components stay at honest partial/neutral values until those feeds exist. Invalid or circular Web3 activity still scores zero via the validity gate.

## Production

The app runs as a Node server (`@astrojs/node`) on port `4321`.

```bash
SUDO_BOT_TOKEN=botId:secret npm run build
HOST=0.0.0.0 PORT=4321 node dist/server/entry.mjs
```

Push to `main` deploys to the host via GitHub Actions. Keep host credentials in GitHub secrets (`HOST`, `USERNAME`, `PASSWORD`), never in the repo.
