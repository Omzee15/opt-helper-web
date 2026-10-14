# opt-helper-web

The one-page download site for [OptHelper](https://github.com/Omzee15/opt-helper). Plain HTML, no build step.

The download buttons point at `https://github.com/Omzee15/opt-helper/releases/latest/download/OptHelper.dmg`, so a new release in the app repo is picked up automatically as long as its asset is named `OptHelper.dmg`.

Deploy: `netlify deploy --prod`
