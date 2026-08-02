import { expect, test } from '@playwright/test'

test('dashboard places seasonal menus and dish photos beside the main menu', async ({ page }) => {
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
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/partners/dashboard')
  await expect(page.getByRole('heading', { name: 'Сезонные меню' })).toBeVisible()
  await expect(page.getByText('Временные позиции публикуются отдельно от основного меню')).toHaveCount(0)
  await expect(page.getByText('Добавьте временные блюда, не загружая основное меню заново.')).toHaveCount(0)
  await expect(page.getByText('Сезонных меню пока нет.', { exact: true })).toBeVisible()
  await expect(page.locator('#rs-splash')).toHaveAttribute('data-state', 'hidden')

  const mainMenuCard = await page.locator('.partners-dashboard__menu-card').boundingBox()
  const seasonalCard = await page.locator('.partners-seasonal').boundingBox()
  const photosCard = await page.locator('.partners-dashboard__photos-card').boundingBox()
  expect(mainMenuCard).not.toBeNull()
  expect(seasonalCard).not.toBeNull()
  expect(photosCard).not.toBeNull()
  expect(seasonalCard.x).toBeGreaterThan(mainMenuCard.x + mainMenuCard.width)
  expect(photosCard.x).toBe(seasonalCard.x)
  expect(photosCard.y).toBeGreaterThan(seasonalCard.y + seasonalCard.height)
  expect(Math.abs(mainMenuCard.height - (photosCard.y + photosCard.height - seasonalCard.y))).toBeLessThanOrEqual(1)
  expect(photosCard.height).toBeLessThan(250)

  await page.setViewportSize({ width: 900, height: 900 })
  const narrowMainMenuCard = await page.locator('.partners-dashboard__menu-card').boundingBox()
  const narrowSeasonalCard = await page.locator('.partners-seasonal').boundingBox()
  expect(narrowSeasonalCard.x).toBe(narrowMainMenuCard.x)
  expect(narrowSeasonalCard.y).toBeGreaterThan(narrowMainMenuCard.y + narrowMainMenuCard.height)
})
