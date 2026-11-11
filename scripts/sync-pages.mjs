import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')

function syncTo(target) {
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  cpSync(dist, target, { recursive: true })
  writeFileSync(join(target, '.nojekyll'), '')
}

// GitHub Pages may serve from main `/` (legacy) as well as `docs/`.
syncTo(join(root, 'docs'))
cpSync(join(dist, 'index.html'), join(root, 'index.html'))

rmSync(join(root, 'assets'), { recursive: true, force: true })
if (existsSync(join(dist, 'assets'))) {
  cpSync(join(dist, 'assets'), join(root, 'assets'), { recursive: true })
}

for (const name of [
  'favicon.svg',
  'pilix-logo.jpg',
  'live-stream4.css',
  'live-stream4.js',
  'app-shell.css',
  '.nojekyll',
]) {
  const from = join(dist, name)
  if (existsSync(from)) cpSync(from, join(root, name))
}

rmSync(join(root, 'js'), { recursive: true, force: true })
if (existsSync(join(dist, 'js'))) {
  cpSync(join(dist, 'js'), join(root, 'js'), { recursive: true })
}

rmSync(join(root, 'ranker'), { recursive: true, force: true })
if (existsSync(join(dist, 'ranker'))) {
  cpSync(join(dist, 'ranker'), join(root, 'ranker'), { recursive: true })
}

writeFileSync(join(root, '.nojekyll'), '')

console.log('Synced production build to / and docs/ for pilixtv.github.io')
