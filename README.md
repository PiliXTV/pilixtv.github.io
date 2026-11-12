# PiliX TV

[pilixtv.github.io](https://pilixtv.github.io) / `pilixtv.vercel.app` — **PBB collab 3.0 Livestream** and **PBB collab 3.0 Big 4 Ranker**, with the nominated housemates float on load.

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

Or connect this GitHub repo in the [Vercel dashboard](https://vercel.com/new): framework **Vite**, build `npm run build:vercel`, output `dist`. Name the project **`pilixtv`**.

Camera DASH overrides are set in the site UI (gear → Main / Dining / External) and saved in your browser only.

Default player uses public demo DASH clips. Official PBB All Access belongs on [iWantTFC](https://www.iwanttfc.com).
