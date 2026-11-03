# Knock (web)

The web version of Knock: same tabs and flows as the iOS app, runs in Safari and installs to the
home screen. Free, no Apple developer account, no 7-day limit.

Plain HTML/CSS/JS — no build step. Map: MapLibre with free OpenFreeMap vector tiles, drawn with Knock's own
Apple Maps–inspired style (`mapstyle.js`, light and dark). Addresses: OpenStreetMap Nominatim.
Data: saved in the browser on the device (`localStorage`).

## Try it on your Mac

```bash
python3 -m http.server 8642 --directory web
```

Open http://localhost:8642. (GPS and "Add to Home Screen" need HTTPS, so use a host below for your phone.)

## Put it online for free (GitHub Pages)

1. Make a free account at github.com.
2. Create a new **public** repository, for example `knock`.
3. On the repo page: **Add file → Upload files**, drag in everything inside this `web` folder
   (`index.html`, `app.js`, `mapstyle.js`, `style.css`, `sw.js`, `manifest.webmanifest`, the `icons` folder), then **Commit**.
4. **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)` → **Save**.
5. After a minute your app is at `https://YOUR-USERNAME.github.io/knock/`.

Netlify Drop (app.netlify.com/drop — drag the `web` folder onto the page) or Cloudflare Pages work too.

## Install on your iPhone

1. Open the link in **Safari**.
2. Tap **Share → Add to Home Screen → Add**.
3. Open Knock from the home screen icon (not from a Safari tab) and allow location.

## Keeping your data safe

- Data lives only on that phone, inside the home screen app. Deleting the home screen icon deletes it.
- **Team → Statuses, pipeline & data → Export backup** saves a file (e.g. to Files or iCloud Drive).
  **Restore backup** loads it back, on the same phone or a new one.
- **Export houses as CSV** gives a spreadsheet of every house, status and customer.

## Updating

Change the files, upload them again (same repo), and reopen the app while online — it picks up
the new version. If it looks stale, close the app fully and reopen it.

## Limits

- GPS only while the app is open.
- The map needs a signal unless the area was viewed recently.
- The address lookup (Nominatim) is for light use, about one lookup per second.
- Map colors live in `MAP_PALETTE` at the top of `mapstyle.js` if you want to tweak them.
