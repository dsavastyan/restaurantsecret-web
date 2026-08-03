import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rs_consent_v1', JSON.stringify({
      analytics: 'denied',
      updatedAt: new Date().toISOString(),
      policyVersion: 'cookies_v1_2026-01-16',
    }))
  })
})

test('partner schedules a seasonal menu without replacing the main menu', async ({ page }) => {
  const payload = {
    menu: {
      id: 51,
      owner_restaurant_id: 42,
      name: 'Летнее меню',
      start_date: '2026-08-01',
      end_date: '2026-08-31',
      publication_state: 'draft',
      current_step: 1,
      source_filename: null,
      status: 'draft',
      outlets: [{ id: 42, name: 'AERO MENU ШЕРЕМЕТЬЕВО · Терминал B' }],
      dishes_count: 0,
      photos_count: 0,
      unresolved_duplicates: 0,
    },
    items: [],
  }
  let menuCreated = false

  await page.context().route('**/api/restaurant/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/restaurant/me') {
      await route.fulfill({
        json: {
          restaurant: { id: 42, name: 'AERO MENU ШЕРЕМЕТЬЕВО', slug: 'aero-menu', has_published_menu: true, menu_updated_at: '2026-07-21' },
          restaurants: [
            { id: 42, name: 'AERO MENU ШЕРЕМЕТЬЕВО · Терминал B' },
            { id: 43, name: 'AERO MENU ШЕРЕМЕТЬЕВО · Терминал C' },
          ],
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
        json: { versions: [{ id: 7, is_current: true, items_count: 124, dishes_count: 124, captured_at: '2026-07-21', action: 'uploaded' }] },
      })
      return
    }
    if (path === '/api/restaurant/seasonal-menus' && request.method() === 'GET') {
      await route.fulfill({ json: { menus: menuCreated && payload.menu.publication_state === 'published' ? [payload.menu] : [] } })
      return
    }
    if (path === '/api/restaurant/seasonal-menus' && request.method() === 'POST') {
      menuCreated = true
      Object.assign(payload.menu, request.postDataJSON())
      payload.menu.outlets = payload.menu.restaurant_ids.map((id) => ({
        id,
        name: id === 42 ? 'AERO MENU ШЕРЕМЕТЬЕВО · Терминал B' : 'AERO MENU ШЕРЕМЕТЬЕВО · Терминал C',
      }))
      await route.fulfill({ status: 201, json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/seasonal-menus/51/source') {
      payload.menu.source_filename = 'Летнее меню.xlsx'
      payload.menu.dishes_count = 2
      payload.menu.unresolved_duplicates = 1
      payload.items = [
        {
          id: 81,
          dish_name: 'Цезарь с курицей',
          category: 'Салаты',
          composition_text: 'Романо, курица, пармезан',
          price_rub: 790,
          kcal: 420,
          proteins_g: 28,
          fats_g: 25,
          carbs_g: 18,
          duplicate_resolution: 'pending',
          has_photo: false,
        },
        {
          id: 82,
          dish_name: 'Лисички со сметаной',
          category: 'Сезонные блюда',
          composition_text: 'Лисички, сметана, зелень',
          price_rub: 650,
          kcal: 310,
          proteins_g: 7,
          fats_g: 24,
          carbs_g: 16,
          duplicate_resolution: null,
          has_photo: false,
        },
      ]
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/seasonal-menus/51/items/81' && request.method() === 'PATCH') {
      payload.items[0].duplicate_resolution = request.postDataJSON().duplicate_resolution
      payload.menu.unresolved_duplicates = 0
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/seasonal-menus/51/submit') {
      payload.menu.publication_state = 'published'
      payload.menu.status = 'scheduled'
      payload.menu.current_step = 4
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/seasonal-menus/51' && request.method() === 'PATCH') {
      const body = request.postDataJSON()
      Object.assign(payload.menu, body)
      payload.menu.outlets = body.restaurant_ids.map((id) => ({
        id,
        name: id === 42 ? 'AERO MENU ШЕРЕМЕТЬЕВО · Терминал B' : 'AERO MENU ШЕРЕМЕТЬЕВО · Терминал C',
      }))
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/seasonal-menus/51') {
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/partners/dashboard')
  await expect(page.getByText('Основное меню', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Обновить меню' })).toBeVisible()
  await expect(page.locator('.partners-dash__chip')).toContainText('124')
  await expect(page.locator('.partners-dash__chip')).toContainText('блюда')
  await expect(page.getByRole('heading', { name: 'Сезонное меню' })).toBeVisible()
  await page.getByRole('link', { name: 'Добавить меню' }).first().click()

  await expect(page.getByRole('heading', { name: 'Добавьте сезонное меню' })).toBeVisible()
  await page.getByLabel('Название меню').fill('Летнее меню')
  await page.getByLabel('Начало').fill('2026-08-01')
  await page.getByLabel('Завершение').fill('2026-08-31')
  await page.getByLabel('AERO MENU ШЕРЕМЕТЬЕВО · Терминал C').check()
  await page.locator('input[type="file"][accept=".xlsx,.xls"]').setInputFiles({
    name: 'Летнее меню.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('seasonal-menu'),
  })

  await expect(page.getByText('«Цезарь с курицей» уже есть в основном меню.')).toBeVisible()
  await page.getByRole('button', { name: 'То же блюдо' }).click()
  await page.getByRole('button', { name: /Перейти к фотографиям/ }).click()

  await expect(page.getByRole('heading', { name: 'Добавьте фотографии сезонных блюд' })).toBeVisible()
  await expect(page.getByText('Цезарь с курицей')).toBeVisible()
  await expect(page.getByText('Лисички со сметаной')).toBeVisible()
  await expect(page.getByText(/фотографий основного меню здесь нет/)).toBeVisible()
  await page.getByRole('button', { name: /Проверить превью/ }).click()
  await expect(page.getByRole('heading', { name: 'Проверьте превью' })).toBeVisible()
  await expect(page.getByText('1 августа–31 августа 2026')).toBeVisible()
  await page.getByRole('button', { name: /К подтверждению/ }).click()

  await expect(page.getByRole('heading', { name: 'Летнее меню' })).toBeVisible()
  await expect(page.getByText('AERO MENU ШЕРЕМЕТЬЕВО · Терминал B, AERO MENU ШЕРЕМЕТЬЕВО · Терминал C')).toBeVisible()
  await page.getByRole('button', { name: 'Запланировать публикацию' }).click()
  await expect(page.getByText('Запланировано')).toBeVisible()
  await expect(page.getByText(/автоматически появится у гостей 1 августа 2026/)).toBeVisible()
  await page.getByRole('button', { name: 'Вернуться в кабинет' }).click()
  await expect(page.locator('.partners-seasonal__card', { hasText: 'Летнее меню' })).toBeVisible()
  await page.locator('.partners-seasonal__card', { hasText: 'Летнее меню' }).getByRole('link', { name: 'Посмотреть' }).click()
  await expect(page.getByRole('heading', { name: 'Проверьте превью' })).toBeVisible()
  await expect(page.getByText('Лисички со сметаной')).toBeVisible()
})
