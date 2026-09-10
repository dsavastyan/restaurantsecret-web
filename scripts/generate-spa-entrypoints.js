import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const distDir = resolve('dist')
const source = resolve(distDir, 'index.html')
const spaRoutes = [
  'legal/ios/privacy',
  'legal/ios/terms',
  'partners',
  'partners/login',
  'partners/dashboard',
  'partners/upload',
  'partners/photos',
  'admin',
  'admin/login',
  'admin/menu-revisions',
  'admin/restaurant-reviews',
  // City catalog pages are routable in previews, but intentionally stay out of
  // the production sitemap until the city rollout is approved.
  'catalog/moskva',
  'catalog/sankt-peterburg',
  'catalog/izhevsk',
]

await Promise.all(
  spaRoutes.map(async (route) => {
    const routeDir = resolve(distDir, route)
    await mkdir(routeDir, { recursive: true })
    await copyFile(source, resolve(routeDir, 'index.html'))
  }),
)

console.log(`Generated ${spaRoutes.length} portal SPA entrypoints`)
