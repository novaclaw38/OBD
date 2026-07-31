// Rasterizes public/icons/icon.svg into the PNG sizes a PWA manifest needs.
// Re-run with `npm run icons` whenever the source SVG changes.
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'public', 'icons', 'icon.svg')
const out = (name) => join(root, 'public', 'icons', name)

const svg = await readFile(src)

// Standard icons: artwork fills the tile.
await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'))

// Maskable: launchers crop to a circle/squircle, so the artwork is inset to
// the 80% safe zone and the brand purple bleeds to the edges.
await sharp(svg)
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#6d28d9' })
  .png()
  .toFile(out('icon-maskable-512.png'))

// Favicon: a 32px PNG is accepted by every current browser under the .ico name.
await sharp(svg).resize(32, 32).png().toFile(join(root, 'public', 'favicon.ico'))

console.log('icons written to public/icons/')
