# PiliX TV

[pilixtv.github.io](https://pilixtv.github.io) / `pilixtv.vercel.app` — **PBB collab 3.0 Livestream** (multi-cam player) and **PBB collab 3.0 Ranker** (Big 4 picker migrated from pbbcollab3.github.io), with the nominated housemates float on load.

## Develop

```bash
npm install
npm run dev
```

## Build / Pages

```bash
npm run build
```

Publishes `dist/`, syncs to repo root + `docs/` for GitHub Pages.

## Custom camera feeds

Paste ClearKey DASH feeds in the browser console (or a small settings helper):

```js
localStorage.setItem(
  'zv_custom_servers_v1',
  JSON.stringify({
    1: { mpdUrl: 'https://…/manifest.mpd', keyId: '…', key: '…' },
    2: { mpdUrl: 'https://…/manifest.mpd', keyId: '…', key: '…' },
    3: { mpdUrl: 'https://…/manifest.mpd', keyId: '…', key: '…' },
  }),
)
location.reload()
```

Default build ships public demo DASH clips so the player UI works without credentials. Official PBB All Access belongs on [iWantTFC](https://www.iwanttfc.com).
