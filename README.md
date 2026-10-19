# opt-helper-web

The one-page download site for [OptHelper](https://github.com/Omzee15/opt-helper). Plain HTML, no build step.

The app is served from this repo, not from GitHub releases. `releases/OptHelper.dmg` is always the newest build, and `releases/latest.json` holds its version, date and size, which the page shows under the download buttons.

To ship a new release:

1. Build the DMG in the app repo (`../opt_helper/package.sh`).
2. Run `./release.sh` here (or `./release.sh path/to/OptHelper.dmg`). It copies the DMG into `releases/` and rewrites `latest.json`, reading the version from the app inside the DMG.
3. Commit and deploy: `netlify deploy --prod`

Deploy: `netlify deploy --prod`
