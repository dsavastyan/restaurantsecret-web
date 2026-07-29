import { expect, test } from '@playwright/test'

test('published restaurant opens the shared four-step menu update flow', async ({ page }) => {
  const payload = {
    draft: {
      id: 91,
      restaurant_id: 42,
      current_step: 1,
      status: 'editing',
      method: null,
      source_kind: null,
      revision: 1,
    },
    items: [
      {
        id: 7,
        dish_name: 'Омлет с форелью',
        category: 'Завтраки',
        price_rub: 790,
        per: 'portion',
        portion_g: 280,
        kcal: 420,
        proteins_g: 28,
        fats_g: 31,
        carbs_g: 8,
        composition_text: 'Яйца, форель',
        photo_url: null,
        photo_changed: 0,
        photo_removed: 0,
        change_type: 'unchanged',
      },
    ],
    photos: [],
    summary: { added: 0, updated: 0, deleted: 0, unchanged: 1, photos: 0 },
  }

  await page.route('**/api/restaurant/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/restaurant/me') {
      await route.fulfill({
        json: {
          restaurant: { id: 42, name: 'Aero Menu', has_published_menu: true },
          restaurants: [{ id: 42, name: 'Aero Menu' }],
          last_upload: { status: 'published' },
        },
      })
      return
    }
    if (path === '/api/restaurant/menu/drafts' && request.method() === 'POST') {
      await route.fulfill({ status: 201, json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/menu/drafts/91/reset') {
      const body = request.postDataJSON()
      payload.draft.method = body.method
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/menu/drafts/91' && request.method() === 'PATCH') {
      const body = request.postDataJSON()
      payload.draft = { ...payload.draft, ...body }
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/menu/drafts/91') {
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/partners/upload?new=1')
  await expect(page.getByRole('heading', { name: 'Как вы хотите обновить меню?' })).toBeVisible()

  await page.getByRole('button', { name: /Изменить отдельные блюда/ }).click()
  await expect(page.getByRole('heading', { name: 'Блюда меню' })).toBeVisible()
  await expect(page.getByText('Омлет с форелью')).toBeVisible()

  await page.getByRole('button', { name: /Перейти к фотографиям/ }).click()
  await expect(page.getByRole('heading', { name: 'Проверьте фотографии' })).toBeVisible()

  await page.getByRole('button', { name: /Перейти к превью/ }).click()
  await expect(page.getByRole('heading', { name: 'Проверьте превью' })).toBeVisible()

  await page.getByRole('button', { name: 'Продолжить' }).click()
  await expect(page.getByRole('heading', { name: 'Отправьте обновления' })).toBeVisible()
  await expect(page.getByText(/QR-код появится/)).toHaveCount(0)
})
