# PiliX TV

Live multi-camera stream player for [pilixtv.github.io](https://pilixtv.github.io) — Main, Dining, External, and a 2×2 All grid. Layout and controls follow the PBB30 live player pattern (floating camera nav, theme toggle, zoom/pan).

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

## Vercel (`pilixtv.vercel.app`)

```bash
npm run build:vercel
npx vercel --prod
```

Or connect this GitHub repo in the [Vercel dashboard](https://vercel.com/new): framework **Vite**, build `npm run build:vercel`, output `dist`. Name the project **`pilixtv`** to get `https://pilixtv.vercel.app`.

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
