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

test('waiting menu update shows uploaded source and lets the restaurant download it', async ({ page }) => {
  const payload = {
    draft: {
      id: 91,
      restaurant_id: 42,
      current_step: 1,
      status: 'extracting',
      method: 'upload',
      source_kind: 'unstructured',
      revision: 2,
    },
    items: [],
    photos: [],
    summary: { added: 0, updated: 0, deleted: 0, unchanged: 0, photos: 0 },
    revision: {
      id: 12,
      status: 'needs_preparation',
      messages: [{
        id: 18,
        sender_role: 'admin',
        message_type: 'clarification',
        body: 'КБЖУ блюда 12 расходится с фактом',
      }],
      source_files: [{
        id: 5,
        original_name: 'Меню — июль.pdf',
        content_type: 'application/pdf',
        size_bytes: 153600,
        page_count: 4,
        sheet_count: null,
      }],
    },
  }

  await page.route('**/api/restaurant/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/restaurant/me') {
      await route.fulfill({
        json: {
          restaurant: { id: 42, name: 'Aero Menu', has_published_menu: true },
          restaurants: [{ id: 42, name: 'Aero Menu' }],
          last_upload: { status: 'processing' },
        },
      })
      return
    }
    if (path === '/api/restaurant/menu/drafts/91/revision/files/5') {
      await route.fulfill({
        body: 'source file',
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="menu-july.pdf"',
        },
      })
      return
    }
    if (path === '/api/restaurant/menu/drafts/91') {
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/partners/upload?draft=91')

  await expect(page.getByText('Загруженный файл')).toBeVisible()
  const sourceLink = page.getByRole('link', { name: /Меню — июль\.pdf.*Скачать/ })
  await expect(sourceLink).toBeVisible()
  await expect(sourceLink).toContainText('150 КБ · 4 стр.')
  await expect(sourceLink).toHaveAttribute('href', /\/api\/restaurant\/menu\/drafts\/91\/revision\/files\/5$/)

  const chat = page.locator('.partners-update__chat')
  await expect(chat.getByText('Переписка со специалистом')).toBeVisible()
  await expect(chat.getByText('Нужно уточнение')).toBeVisible()
  await expect(chat.getByText('КБЖУ блюда 12 расходится с фактом')).toHaveCount(1)
  await expect(chat.getByPlaceholder('Напишите комментарий для специалиста')).toBeVisible()
})
