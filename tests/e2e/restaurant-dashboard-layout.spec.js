import { expect, test } from '@playwright/test'

test('dashboard stacks the main menu card above a row of secondary cards', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rs_consent_v1', JSON.stringify({
      analytics: 'denied',
      updatedAt: new Date().toISOString(),
      policyVersion: 'cookies_v1_2026-01-16',
    }))
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.route('**/api/restaurant/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/restaurant/me') {
      await route.fulfill({
        json: {
          restaurant: { id: 42, name: 'AERO MENU ШЕРЕМЕТЬЕВО', slug: 'aero-menu', has_published_menu: true, menu_updated_at: '2026-07-21' },
          restaurants: [{ id: 42, name: 'AERO MENU ШЕРЕМЕТЬЕВО' }],
          last_upload: { status: 'published', created_at: '2026-07-21' },
        },
      })
      return
    }
    if (path === '/api/restaurant/menu/drafts/active') {
      await route.fulfill({ json: { active_draft: null } })
      return
    }
    if (path === '/api/restaurant/menu/history') {
      await route.fulfill({
        json: { versions: [{ id: 7, is_current: true, items_count: 124, captured_at: '2026-07-21', action: 'uploaded' }] },
      })
      return
    }
    if (path === '/api/restaurant/seasonal-menus') {
      await route.fulfill({ json: { menus: [] } })
      return
    }
    if (path === '/api/restaurant/menu/photos') {
      await route.fulfill({
        json: {
          dishes: Array.from({ length: 10 }, (_, index) => ({
            id: index + 1,
            name: `Блюдо ${index + 1}`,
            photo_url: index < 6 ? 'https://example.test/photo.jpg' : null,
          })),
        },
      })
      return
    }
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/partners/dashboard')
  await expect(page.getByRole('heading', { name: 'Основное меню' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Сезонное меню' })).toBeVisible()
  await expect(page.getByText('Нет активного меню', { exact: true })).toBeVisible()
  await expect(page.getByText('6 из 10 позиций', { exact: true })).toBeVisible()
  await expect(page.locator('#rs-splash')).toHaveAttribute('data-state', 'hidden')

  const menuCard = await page.locator('.partners-dash__menu').boundingBox()
  const logoCard = await page.locator('.partners-dash__mini--logo').boundingBox()
  const seasonalCard = await page.locator('.partners-dash__mini--seasonal').boundingBox()
  const photosCard = await page.locator('.partners-dash__mini--photos').boundingBox()
  expect(menuCard).not.toBeNull()
  expect(logoCard).not.toBeNull()
  expect(seasonalCard).not.toBeNull()
  expect(photosCard).not.toBeNull()

  // Основное меню — во всю ширину сверху, три карточки — в один ряд под ним.
  expect(logoCard.y).toBeGreaterThan(menuCard.y + menuCard.height - 1)
  expect(logoCard.x).toBe(menuCard.x)
  expect(Math.abs(logoCard.x + logoCard.width - (menuCard.x + menuCard.width))).toBeGreaterThan(100)
  expect(seasonalCard.y).toBe(logoCard.y)
  expect(photosCard.y).toBe(logoCard.y)
  expect(seasonalCard.x).toBeGreaterThan(logoCard.x + logoCard.width - 1)
  expect(photosCard.x).toBeGreaterThan(seasonalCard.x + seasonalCard.width - 1)

  // На узком экране карточки перестраиваются в колонку.
  await page.setViewportSize({ width: 700, height: 900 })
  const narrowLogoCard = await page.locator('.partners-dash__mini--logo').boundingBox()
  const narrowSeasonalCard = await page.locator('.partners-dash__mini--seasonal').boundingBox()
  expect(narrowSeasonalCard.x).toBe(narrowLogoCard.x)
  expect(narrowSeasonalCard.y).toBeGreaterThan(narrowLogoCard.y + narrowLogoCard.height - 1)
})
