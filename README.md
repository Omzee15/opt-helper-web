# opt-helper-web

The one-page download site for [OptHelper](https://github.com/Omzee15/opt-helper). Plain HTML, no build step.

New releases are picked up automatically, as long as the release's asset is named `OptHelper.dmg`. On load, the page asks the GitHub API for the latest release of the app repo, shows its version, date and size under the download buttons, and points the buttons at that release's DMG. If the API can't be reached (offline, or GitHub's 60 requests an hour limit for anonymous calls), the buttons keep their static link, `https://github.com/Omzee15/opt-helper/releases/latest/download/OptHelper.dmg`, which also always serves the newest release.

Deploy: `netlify deploy --prod`
