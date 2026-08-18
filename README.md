# Mining Weight Indicator

Sudo mini app for mining weight status. Verifies signed `initData` on the backend and shows the live Sudo user name, username, and avatar.

## Local

```bash
cp .env.example .env
# set SUDO_BOT_TOKEN=botId:secret
npm install
npm run dev
```

## Production

The app runs as a Node server (`@astrojs/node`) on port `4321`.

```bash
SUDO_BOT_TOKEN=botId:secret npm run build
HOST=0.0.0.0 PORT=4321 node dist/server/entry.mjs
```

Push to `main` deploys to the host via GitHub Actions. Keep host credentials in GitHub secrets (`HOST`, `USERNAME`, `PASSWORD`), never in the repo.
