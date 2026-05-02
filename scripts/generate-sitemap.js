// scripts/generate-sitemap.js
// Запускать как: node scripts/generate-sitemap.js
// Требует Node 18+ (встроенный fetch)

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

const BASE_URL = (process.env.SITEMAP_BASE_URL || 'https://restaurantsecret.ru').replace(/\/+$/, '')
const MENU_FETCH_CONCURRENCY = Math.max(1, Number(process.env.SITEMAP_MENU_FETCH_CONCURRENCY || 8))
const API_URLS = Array.from(
  new Set(
    [
      process.env.SITEMAP_API_URL,
      process.env.VITE_API_BASE_URL,
      process.env.VITE_API_BASE,
      process.env.VITE_API_URL,
      'https://api.restaurantsecret.ru/cf',
    ]
      .filter(Boolean)
      .map((url) => url.replace(/\/+$/, '')),
  ),
)

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function stripEmpty(value) {
  const text = String(value ?? '').trim()
  return text || undefined
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return NaN
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(',', '.').replace(/\s+/g, ''))
  return Number.isFinite(numeric) ? numeric : NaN
}

function formatNumeric(value) {
  const numeric = toNumber(value)
  return Number.isFinite(numeric) ? String(Math.round(numeric)) : '-'
}

function normalizeDishForSeo(dish = {}, categoryName = '') {
  return {
    name: stripEmpty(dish.name || dish.title || dish.canonical_name) || 'Блюдо',
    category: stripEmpty(dish.category || categoryName),
    kcal: toNumber(dish.kcal ?? dish.calories ?? dish.energy_kcal),
    protein: toNumber(dish.protein ?? dish.proteins ?? dish.proteins_g ?? dish.protein_g),
    fat: toNumber(dish.fat ?? dish.fats ?? dish.fats_g ?? dish.fat_g),
    carbs: toNumber(dish.carbs ?? dish.carb ?? dish.carbohydrates ?? dish.carbs_g ?? dish.carbohydrates_g),
  }
}

function flattenMenuForSeo(menu) {
  if (!menu) return []

  if (Array.isArray(menu.categories)) {
    return menu.categories.flatMap((category) => {
      const dishes = Array.isArray(category?.dishes) ? category.dishes : []
      return dishes.map((dish) => normalizeDishForSeo(dish, category?.name))
    })
  }

  if (Array.isArray(menu.items)) {
    return menu.items.map((dish) => normalizeDishForSeo(dish, dish?.category))
  }

  return []
}

function publicPathToFile(pathname) {
  const cleanPath = pathname.replace(/^\/+|\/+$/g, '')
  return cleanPath ? join('dist', cleanPath, 'index.html') : join('dist', 'index.html')
}

function writeRouteHtml(pathname, html) {
  const filePath = publicPathToFile(pathname)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, html, 'utf-8')
}

function upsertHeadTag(html, pattern, tag) {
  if (pattern.test(html)) {
    return html.replace(pattern, tag)
  }
  return html.replace('</head>', `    ${tag}\n  </head>`)
}

function injectBeforeHeadClose(html, tag) {
  return html.replace('</head>', `    ${tag}\n  </head>`)
}

function applySeoTags(baseHtml, route) {
  const title = escapeHtml(route.title)
  const description = escapeHtml(route.description)
  const canonical = escapeHtml(route.canonical)
  const robots = route.robots ? escapeHtml(route.robots) : null

  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)

  html = upsertHeadTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${description}" />`,
  )
  html = upsertHeadTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`,
  )
  html = upsertHeadTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${title}" />`,
  )
  html = upsertHeadTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${description}" />`,
  )
  html = upsertHeadTag(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonical}" />`,
  )
  html = upsertHeadTag(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${title}" />`,
  )
  html = upsertHeadTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${description}" />`,
  )

  if (robots) {
    html = upsertHeadTag(
      html,
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="robots" content="${robots}" />`,
    )
  }

  if (route.schema) {
    html = injectBeforeHeadClose(
      html,
      `<script id="restaurant-schema" type="application/ld+json">${JSON.stringify(route.schema)}</script>`,
    )
  }

  if (route.fallbackHtml) {
    html = html.replace('<div id="root"></div>', `<div id="root">${route.fallbackHtml}</div>`)
  }

  return html
}

function createRedirectHtml({ from, to, title = 'Переадресация — RestaurantSecret' }) {
  const escapedTo = escapeHtml(to)
  const canonical = `${BASE_URL}${to}`
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,follow" />
    <meta http-equiv="refresh" content="0; url=${escapedTo}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <title>${escapeHtml(title)}</title>
    <script>window.location.replace(${JSON.stringify(to)})</script>
  </head>
  <body>
    <p><a href="${escapedTo}">Перейти на страницу</a></p>
  </body>
</html>
`
}

function getRestaurantName(restaurant) {
  return stripEmpty(restaurant.name) || stripEmpty(restaurant.title) || stripEmpty(restaurant.slug) || 'Ресторан'
}

function getRestaurantDescription(restaurant) {
  const name = getRestaurantName(restaurant)
  const cuisine = stripEmpty(restaurant.cuisine)
  const metro = stripEmpty(restaurant.metro || restaurant.metroName || restaurant.metro_name)
  const parts = [`Меню ${name} с КБЖУ: калории, белки, жиры и углеводы блюд ресторана в одной таблице.`]
  if (cuisine) parts.push(`Кухня ресторана: ${cuisine}.`)
  if (metro) parts.push(`Рядом с метро ${metro}.`)
  parts.push(`Сравнивайте блюда ${name} по калорийности и макронутриентам перед посещением ресторана.`)
  return parts.join(' ')
}

function restaurantSchema(restaurant) {
  const slug = restaurant.slug
  const name = getRestaurantName(restaurant)
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name,
    url: `${BASE_URL}/restaurants/${slug}`,
    servesCuisine: stripEmpty(restaurant.cuisine),
    address: stripEmpty(restaurant.address)
      ? {
          '@type': 'PostalAddress',
          streetAddress: stripEmpty(restaurant.address),
          addressLocality: 'Москва',
          addressCountry: 'RU',
        }
      : undefined,
  }
}

function fallbackPage({ title, description, links = [] }) {
  const linkHtml = links
    .map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
    .join('')

  return `<main style="font-family:Inter,system-ui,sans-serif;max-width:760px;margin:0 auto;padding:48px 20px;line-height:1.5">
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  ${linkHtml ? `<nav><ul>${linkHtml}</ul></nav>` : ''}
</main>`
}

function restaurantFallback(restaurant, menu) {
  const slug = restaurant.slug
  const name = getRestaurantName(restaurant)
  const description = getRestaurantDescription(restaurant)
  const cuisine = stripEmpty(restaurant.cuisine)
  const metro = stripEmpty(restaurant.metro || restaurant.metroName || restaurant.metro_name)
  const dishes = flattenMenuForSeo(menu)
  const details = [
    cuisine ? `Кухня: ${cuisine}` : '',
    metro ? `Метро: ${metro}` : '',
    dishes.length ? `Блюд в меню: ${dishes.length}` : Number.isFinite(Number(restaurant.dishesCount)) ? `Блюд в меню: ${Number(restaurant.dishesCount)}` : '',
  ].filter(Boolean)
  const rows = dishes.length
    ? dishes
        .map((dish) => `<tr>
      <td>${escapeHtml(dish.name)}</td>
      <td>${escapeHtml(formatNumeric(dish.kcal))}</td>
      <td>${escapeHtml(formatNumeric(dish.protein))}</td>
      <td>${escapeHtml(formatNumeric(dish.fat))}</td>
      <td>${escapeHtml(formatNumeric(dish.carbs))}</td>
    </tr>`)
        .join('\n')
    : `<tr><td colspan="5">Данные КБЖУ для меню ресторана обновляются.</td></tr>`

  return `<main style="font-family:Inter,system-ui,sans-serif;max-width:760px;margin:0 auto;padding:48px 20px;line-height:1.5">
  <h1>Меню ${escapeHtml(name)} с КБЖУ</h1>
  <p>${escapeHtml(description)}</p>
  ${details.length ? `<ul>${details.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
  <table>
    <thead>
      <tr>
        <th>Блюдо</th>
        <th>Калории</th>
        <th>Белки</th>
        <th>Жиры</th>
        <th>Углеводы</th>
      </tr>
    </thead>
    <tbody>
    ${rows}
    </tbody>
  </table>
  <p><a href="/restaurants/${escapeHtml(slug)}/menu">Открыть меню ресторана</a></p>
  <p><a href="/catalog">Вернуться в каталог ресторанов</a></p>
</main>`
}

function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'RestaurantSecret',
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

function generateStaticRoutes(restaurants, menuBySlug) {
  const baseHtml = readFileSync('dist/index.html', 'utf-8')

  const staticRoutes = [
    {
      path: '/',
      title: 'Меню ресторанов с КБЖУ — RestaurantSecret',
      description: 'Все меню ресторанов Москвы с калориями, белками, жирами и углеводами. Фильтруйте по целям и выбирайте осознанно.',
      canonical: `${BASE_URL}/`,
      schema: websiteSchema(),
      fallbackHtml: fallbackPage({
        title: 'Меню ресторанов с КБЖУ',
        description: 'RestaurantSecret помогает выбирать блюда в ресторанах Москвы по калориям, белкам, жирам и углеводам.',
        links: [{ href: '/catalog', label: 'Открыть каталог ресторанов' }],
      }),
    },
    {
      path: '/catalog',
      title: 'Каталог ресторанов с КБЖУ — RestaurantSecret',
      description: 'Все рестораны Москвы с полным меню и данными КБЖУ. Фильтрация по кухне, метро и целям питания.',
      canonical: `${BASE_URL}/catalog`,
      fallbackHtml: fallbackPage({
        title: 'Каталог ресторанов с КБЖУ',
        description: 'Все рестораны Москвы с полным меню и данными КБЖУ. Фильтрация по кухне, метро и целям питания.',
      }),
    },
    {
      path: '/how-it-works',
      title: 'Как это работает — RestaurantSecret',
      description: 'Узнайте, как RestaurantSecret помогает следить КБЖУ в ресторанах Москвы. Реальные данные из меню каждого заведения, фильтры по целям питания.',
      canonical: `${BASE_URL}/how-it-works`,
      fallbackHtml: fallbackPage({
        title: 'Как это работает',
        description: 'RestaurantSecret собирает данные меню ресторанов и помогает находить блюда под ваши цели питания.',
        links: [{ href: '/catalog', label: 'Посмотреть рестораны' }],
      }),
    },
    {
      path: '/tariffs',
      title: 'Подписка и тарифы — RestaurantSecret',
      description: 'Бесплатный и премиум доступ к КБЖУ всех ресторанов Москвы. Пробный период 7 дней бесплатно.',
      canonical: `${BASE_URL}/tariffs`,
      fallbackHtml: fallbackPage({
        title: 'Подписка и тарифы',
        description: 'Бесплатный и премиум доступ к КБЖУ всех ресторанов Москвы. Пробный период 7 дней бесплатно.',
      }),
    },
    {
      path: '/contact',
      title: 'Контакты — RestaurantSecret',
      description: 'Контакты и реквизиты RestaurantSecret. Поддержка по подписке и общие вопросы.',
      canonical: `${BASE_URL}/contact`,
      fallbackHtml: fallbackPage({
        title: 'Контакты',
        description: 'Контакты и реквизиты RestaurantSecret. Поддержка по подписке и общие вопросы.',
      }),
    },
  ]

  for (const route of staticRoutes) {
    writeRouteHtml(route.path, applySeoTags(baseHtml, route))
  }

  writeRouteHtml('/restaurants', createRedirectHtml({ from: '/restaurants', to: '/catalog' }))

  let generatedCount = staticRoutes.length + 1

  for (const restaurant of restaurants.filter((r) => r.slug)) {
    const slug = restaurant.slug
    const name = getRestaurantName(restaurant)
    const description = getRestaurantDescription(restaurant)
    const menu = menuBySlug.get(slug)
    const title = `Меню ${name} с КБЖУ — калории, белки, жиры, углеводы`

    writeRouteHtml(
      `/restaurants/${slug}`,
      applySeoTags(baseHtml, {
        title,
        description,
        canonical: `${BASE_URL}/restaurants/${slug}`,
        schema: restaurantSchema(restaurant),
        fallbackHtml: restaurantFallback(restaurant, menu),
      }),
    )

    writeRouteHtml(
      `/restaurants/${slug}/menu`,
      applySeoTags(baseHtml, {
        title,
        description,
        canonical: `${BASE_URL}/restaurants/${slug}`,
        schema: restaurantSchema(restaurant),
        fallbackHtml: restaurantFallback(restaurant, menu),
      }),
    )

    writeRouteHtml(
      `/r/${slug}`,
      createRedirectHtml({
        from: `/r/${slug}`,
        to: `/restaurants/${slug}`,
        title: `${name} — меню с КБЖУ | RestaurantSecret`,
      }),
    )

    writeRouteHtml(
      `/r/${slug}/menu`,
      createRedirectHtml({
        from: `/r/${slug}/menu`,
        to: `/restaurants/${slug}/menu`,
        title: `${name} — меню с КБЖУ | RestaurantSecret`,
      }),
    )

    writeRouteHtml(
      `/restaurant/${slug}`,
      createRedirectHtml({
        from: `/restaurant/${slug}`,
        to: `/restaurants/${slug}`,
        title: `${name} — меню с КБЖУ | RestaurantSecret`,
      }),
    )

    writeRouteHtml(
      `/restaurant/${slug}/menu`,
      createRedirectHtml({
        from: `/restaurant/${slug}/menu`,
        to: `/restaurants/${slug}/menu`,
        title: `${name} — меню с КБЖУ | RestaurantSecret`,
      }),
    )

    generatedCount += 6
  }

  console.log(`✅ Static route entrypoints generated: ${generatedCount}`)
}

async function fetchAllRestaurants() {
  const errors = []

  for (const apiUrl of API_URLS) {
    const url = `${apiUrl}/restaurants?limit=2000`

    try {
      const res = await fetch(url)
      if (!res.ok) {
        errors.push(`${url}: ${res.status} ${res.statusText}`)
        continue
      }

      const data = await res.json()
      return data.items ?? data ?? []
    } catch (error) {
      errors.push(`${url}: ${error?.message ?? String(error)}`)
    }
  }

  throw new Error(`All restaurant API endpoints failed: ${errors.join('; ')}`)
}

async function fetchRestaurantMenu(slug) {
  const errors = []

  for (const apiUrl of API_URLS) {
    const url = `${apiUrl}/restaurants/${encodeURIComponent(slug)}/menu`

    try {
      const res = await fetch(url)
      if (!res.ok) {
        errors.push(`${url}: ${res.status} ${res.statusText}`)
        continue
      }

      return await res.json()
    } catch (error) {
      errors.push(`${url}: ${error?.message ?? String(error)}`)
    }
  }

  throw new Error(errors.join('; '))
}

async function fetchRestaurantMenus(restaurants) {
  const targets = restaurants.filter((restaurant) => restaurant.slug)
  const menuBySlug = new Map()
  let nextIndex = 0
  let failedCount = 0

  async function worker() {
    while (nextIndex < targets.length) {
      const restaurant = targets[nextIndex]
      nextIndex += 1

      try {
        const menu = await fetchRestaurantMenu(restaurant.slug)
        menuBySlug.set(restaurant.slug, menu)
      } catch (error) {
        failedCount += 1
        console.warn(`⚠️  Failed to fetch menu for ${restaurant.slug}: ${error?.message ?? String(error)}`)
      }
    }
  }

  const workerCount = Math.min(MENU_FETCH_CONCURRENCY, targets.length)
  await Promise.all(Array.from({ length: workerCount }, worker))
  console.log(`   Menus fetched: ${menuBySlug.size}/${targets.length}${failedCount ? `, failed: ${failedCount}` : ''}`)
  return menuBySlug
}

async function main() {
  console.log('🔍 Fetching restaurants from API...')
  const restaurants = await fetchAllRestaurants()
  console.log(`   Found ${restaurants.length} restaurants`)
  console.log('🔍 Fetching restaurant menus for prerender...')
  const menuBySlug = await fetchRestaurantMenus(restaurants)

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
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${escapeXml(u.changefreq)}</changefreq>
    <priority>${escapeXml(u.priority)}</priority>
    <lastmod>${escapeXml(u.lastmod)}</lastmod>
  </url>`,
  )
  .join('\n')}
</urlset>`

  writeFileSync('dist/sitemap.xml', xml, 'utf-8')
  console.log(`✅ Sitemap generated: ${allUrls.length} URLs → dist/sitemap.xml`)

  generateStaticRoutes(restaurants, menuBySlug)
}

main().catch((error) => {
  console.error('❌ Failed to generate sitemap:', error)
  process.exit(1)
})
