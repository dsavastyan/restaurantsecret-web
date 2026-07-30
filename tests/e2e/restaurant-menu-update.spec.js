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
        photo_transferred: false,
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
  await expect(page.getByRole('heading', { name: 'Добавьте фотографии (опционально)' })).toBeVisible()
  await expect(page.getByText('Существующие фотографии уже перенесены.')).toHaveCount(0)
  await expect(page.getByText('Загрузить несколько фото')).toHaveCount(0)

  await page.getByRole('button', { name: /Перейти к превью/ }).click()
  await expect(page.getByRole('heading', { name: 'Проверьте превью' })).toBeVisible()

  await page.getByRole('button', { name: 'Продолжить' }).click()
  await expect(page.getByRole('heading', { name: 'Отправьте обновления' })).toBeVisible()
  await expect(page.getByText(/QR-код появится/)).toHaveCount(0)
})

test('returning from preview keeps the prepared draft until source files change', async ({ page }) => {
  const payload = {
    draft: {
      id: 93,
      restaurant_id: 42,
      current_step: 3,
      status: 'editing',
      method: 'upload',
      source_kind: 'unstructured',
      revision: 2,
    },
    items: [{
      id: 9,
      dish_name: 'Томаты с брынзой',
      category: 'Закуски',
      price_rub: 620,
      composition_text: 'Томаты, брынза',
      photo_url: null,
      photo_changed: 0,
      photo_removed: 0,
      photo_transferred: false,
      change_type: 'added',
    }],
    photos: [],
    summary: { added: 1, updated: 0, deleted: 0, unchanged: 0, photos: 0 },
    revision: {
      id: 13,
      status: 'ready_for_restaurant',
      messages: [],
      source_files: [{
        id: 6,
        original_name: 'Меню — август.pdf',
        content_type: 'application/pdf',
        size_bytes: 204800,
        page_count: 5,
        sheet_count: null,
      }],
    },
  }
  let resetCalls = 0
  let sourceDeletes = 0
  let sourceUploads = 0

  await page.route('**/api/restaurant/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
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
    if (path === '/api/restaurant/menu/drafts/93/reset') {
      resetCalls += 1
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/menu/drafts/93/source') {
      sourceUploads += 1
      payload.draft.current_step = 1
      payload.draft.status = 'extracting'
      payload.revision.status = 'needs_preparation'
      payload.revision.source_files = [{
        id: 7,
        original_name: 'menu-september.pdf',
        content_type: 'application/pdf',
        size_bytes: 8,
        page_count: 1,
        sheet_count: null,
      }]
      await route.fulfill({ status: 202, json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/menu/drafts/93/revision/files/6' && request.method() === 'DELETE') {
      sourceDeletes += 1
      payload.draft.current_step = 1
      payload.draft.status = 'extracting'
      payload.revision.status = 'needs_preparation'
      payload.revision.source_files = []
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/menu/drafts/93' && request.method() === 'PATCH') {
      payload.draft = { ...payload.draft, ...request.postDataJSON() }
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    if (path === '/api/restaurant/menu/drafts/93') {
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/partners/upload?draft=93')
  await expect(page.getByRole('heading', { name: 'Проверьте превью' })).toBeVisible()

  const menuStep = page.locator('.partners-update__step').filter({ hasText: 'Меню' }).getByRole('button')
  const photosStep = page.locator('.partners-update__step').filter({ hasText: 'Фотографии' }).getByRole('button')
  const previewStep = page.locator('.partners-update__step').filter({ hasText: 'Превью' }).getByRole('button')
  await menuStep.click()

  await expect(page.getByRole('heading', { name: 'Файлы меню' })).toBeVisible()
  await expect(page.getByText('Меню — август.pdf')).toBeVisible()
  await expect(page.getByText('Текущий черновик сохранён')).toBeVisible()
  await expect(photosStep).toBeEnabled()
  await expect(previewStep).toBeEnabled()
  expect(resetCalls).toBe(0)

  await previewStep.click()
  await expect(page.getByRole('heading', { name: 'Проверьте превью' })).toBeVisible()
  await menuStep.click()

  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('.partners-update__source-file').filter({ hasText: 'Меню — август.pdf' }).getByRole('button', { name: 'Удалить' }).click()

  await expect(page.getByRole('heading', { name: 'Добавьте файл меню' })).toBeVisible()
  await expect(photosStep).toBeDisabled()
  await expect(previewStep).toBeDisabled()
  expect(sourceDeletes).toBe(1)

  await page.locator('.partners-update__source-file-add input').setInputFiles({
    name: 'menu-september.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  })

  await expect(page.getByRole('heading', { name: 'Меню загружено — ожидает подготовки' })).toBeVisible()
  await expect(photosStep).toBeDisabled()
  await expect(previewStep).toBeDisabled()
  expect(sourceUploads).toBe(1)
  expect(sourceDeletes).toBe(1)
  expect(resetCalls).toBe(0)
})

test('photo step explains transferred photos and loads them through the authenticated API', async ({ page }) => {
  const payload = {
    draft: {
      id: 92,
      restaurant_id: 42,
      current_step: 2,
      status: 'editing',
      method: 'manual',
      source_kind: null,
      revision: 1,
    },
    items: [{
      id: 8,
      dish_name: 'Цезарь с курицей',
      category: 'Салаты',
      photo_url: '/DishPhotos/aero-menu/8.webp',
      photo_changed: 0,
      photo_removed: 0,
      photo_transferred: true,
      photo_attention: true,
      change_type: 'updated',
    }],
    photos: [],
    summary: { added: 0, updated: 1, deleted: 0, unchanged: 0, photos: 0 },
  }

  await page.route('**/api/restaurant/**', async (route) => {
    const path = new URL(route.request().url()).pathname
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
    if (path === '/api/restaurant/menu/drafts/92/items/8/photo') {
      await route.fulfill({ body: 'photo', contentType: 'image/webp' })
      return
    }
    if (path === '/api/restaurant/menu/drafts/92') {
      await route.fulfill({ json: { ok: true, ...payload } })
      return
    }
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/partners/upload?draft=92')

  await expect(page.getByRole('heading', { name: 'Проверьте фотографии' })).toBeVisible()
  await expect(page.getByText('Существующие фотографии уже перенесены. Загрузите новые только там, где это необходимо.')).toBeVisible()
  await expect(page.getByText('Загрузить несколько фото')).toHaveCount(0)
  await expect(page.locator('.partners-update__photo-card img')).toHaveAttribute(
    'src',
    'https://tg.restaurantsecret.ru/api/restaurant/menu/drafts/92/items/8/photo',
  )
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
  const sourceFile = page.locator('.partners-update__source-file').filter({ hasText: 'Меню — июль.pdf' })
  const sourceLink = sourceFile.getByRole('link', { name: 'Скачать' })
  await expect(sourceFile).toContainText('150 КБ · 4 стр.')
  await expect(sourceLink).toBeVisible()
  await expect(sourceLink).toHaveAttribute('href', /\/api\/restaurant\/menu\/drafts\/91\/revision\/files\/5$/)

  const chat = page.locator('.partners-update__chat')
  await expect(chat.getByText('Переписка со специалистом')).toBeVisible()
  await expect(chat.getByText('Нужно уточнение')).toBeVisible()
  await expect(chat.getByText('КБЖУ блюда 12 расходится с фактом')).toHaveCount(1)
  await expect(chat.getByPlaceholder('Напишите комментарий для специалиста')).toBeVisible()
})
