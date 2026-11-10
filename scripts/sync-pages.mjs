import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')

function syncTo(target) {
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  cpSync(dist, target, { recursive: true })
  writeFileSync(join(target, '.nojekyll'), '')
}

// GitHub Pages is currently set to legacy deploy from main `/`.
syncTo(join(root, 'docs'))
cpSync(join(dist, 'index.html'), join(root, 'index.html'))
rmSync(join(root, 'assets'), { recursive: true, force: true })
cpSync(join(dist, 'assets'), join(root, 'assets'), { recursive: true })
cpSync(join(dist, 'favicon.svg'), join(root, 'favicon.svg'))
cpSync(join(dist, 'pilix-logo.jpg'), join(root, 'pilix-logo.jpg'))
writeFileSync(join(root, '.nojekyll'), '')

console.log('Synced production build to / and docs/ for pilixtv.github.io')
