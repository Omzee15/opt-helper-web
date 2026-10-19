# opt-helper-web

The one-page download site for [OptHelper](https://github.com/Omzee15/opt-helper). Plain HTML, no build step.

The app is served from this repo, not from GitHub releases. `releases/OptHelper.dmg` is always the newest build, and `releases/latest.json` holds its version, date and size, which the page shows under the download buttons.

To ship a new release:

1. Build the DMG in the app repo (`../opt_helper/package.sh`).
2. Run `./release.sh` here (or `./release.sh path/to/OptHelper.dmg`). It copies the DMG into `releases/` and rewrites `latest.json`, reading the version from the app inside the DMG.
3. Commit and deploy: `netlify deploy --prod`

## Waitlist or download

The `APP_LIVE` env variable in Netlify picks what the main buttons do:

- `false` (now): they show **Join Waitlist**, which asks for an email address, and the install steps are hidden.
- `true`: they show **Download for Mac** with the release line, and the install steps come back.

`netlify/edge-functions/app-live.js` reads it on each request for `/`, so there's no flash of the wrong button. To switch, run `netlify env:set APP_LIVE true`, then redeploy, since Netlify applies env changes on the next deploy. Locally, `netlify dev` only passes it to the edge function from a `.env` file (`APP_LIVE=true`), not from the shell.

### Waitlist entries

Emails go to `/api/waitlist` (`netlify/functions/waitlist.mjs`), which saves them in the `waitlist` [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/) store of this Netlify project. Nothing to set up. Each address is one entry: the key is the email, the value holds when they joined and their browser. An address that's already there isn't saved twice.

- See who's on it: `netlify blobs:list waitlist` (or the project's **Blobs** tab in the Netlify dashboard)
- One entry: `netlify blobs:get waitlist someone@example.com`
- Remove one: `netlify blobs:delete waitlist someone@example.com`

`netlify dev` keeps its own local store, so test sign-ups on localhost don't reach the live list.

## Try OptHelper

The **Try OptHelper** button next to the main button (and *Try it yourself* under the Mac) turns the Mac picture into a small working screen. The notch opens when the pointer gets near it. Select `Sunset.png` and hold ⌥ to get the Smart Wheel: the Convert list, then ⌥` for the quick actions, matching `SmartWheel.swift` and `FileConverter.swift` in the app for a single image. Results appear on the desktop, and *Add to notch shelf* puts the file in the island's shelf. On touch screens, a tap on the notch opens it and the on-screen ⌥ buttons stand in for the keys. It's all in `index.html`.

Deploy: `netlify deploy --prod`
