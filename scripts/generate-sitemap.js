// scripts/generate-sitemap.js
// Запускать как: node scripts/generate-sitemap.js
// Требует Node 18+ (встроенный fetch)

import { writeFileSync } from 'fs'

const BASE_URL = 'https://restaurantsecret.ru'
const API_URL = 'https://pd.restaurantsecret.ru'

async function fetchAllRestaurants() {
  const res = await fetch(`${API_URL}/catalog?limit=2000`)
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
  const data = await res.json()
  return data.items ?? data ?? []
}

async function main() {
  console.log('🔍 Fetching restaurants from API...')
  const restaurants = await fetchAllRestaurants()
  console.log(`   Found ${restaurants.length} restaurants`)

  const today = new Date().toISOString().split('T')[0]

  const staticUrls = [
    { loc: `${BASE_URL}/`,             priority: '1.0', changefreq: 'weekly',  lastmod: today },
    { loc: `${BASE_URL}/catalog`,      priority: '0.9', changefreq: 'daily',   lastmod: today },
    { loc: `${BASE_URL}/how-it-works`, priority: '0.6', changefreq: 'monthly', lastmod: today },
    { loc: `${BASE_URL}/tariffs`,      priority: '0.6', changefreq: 'monthly', lastmod: today },
    { loc: `${BASE_URL}/contact`,      priority: '0.4', changefreq: 'monthly', lastmod: today },
  ]

  const restaurantUrls = restaurants
    .filter((r) => r.slug)
    .map((r) => ({
      loc: `${BASE_URL}/restaurants/${r.slug}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: r.updatedAt?.split('T')[0] ?? today,
    }))

  const allUrls = [...staticUrls, ...restaurantUrls]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
    <lastmod>${u.lastmod}</lastmod>
  </url>`,
  )
  .join('\n')}
</urlset>`

  writeFileSync('dist/sitemap.xml', xml, 'utf-8')
  console.log(`✅ Sitemap generated: ${allUrls.length} URLs → dist/sitemap.xml`)
}

main().catch((error) => {
  console.error('❌ Failed to generate sitemap:', error)
  process.exit(1)
})
