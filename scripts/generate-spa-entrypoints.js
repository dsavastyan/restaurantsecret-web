import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const distDir = resolve('dist')
const source = resolve(distDir, 'index.html')
const spaRoutes = [
  'partners',
  'partners/login',
  'partners/dashboard',
  'partners/upload',
  'partners/photos',
  'admin',
  'admin/login',
  'admin/menu-revisions',
]

await Promise.all(
  spaRoutes.map(async (route) => {
    const routeDir = resolve(distDir, route)
    await mkdir(routeDir, { recursive: true })
    await copyFile(source, resolve(routeDir, 'index.html'))
  }),
)

console.log(`Generated ${spaRoutes.length} portal SPA entrypoints`)
