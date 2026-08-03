import { expect, test } from '@playwright/test'

const loulou = {
  slug: 'loulou',
  name: 'Loulou',
  cities: ['Москва', 'Санкт-Петербург'],
  city_label: 'Москва, Санкт-Петербург',
  contacts: [{ id: 7, email: 'manager@loulou.test', invite_delivery_status: 'sent', invite_sent_at: '2026-07-21T10:01:00.000Z' }],
  menu_status: 'awaiting_admin',
  menu_status_label: 'Ждёт обработки администратором',
  partnership: 'partner',
  partnership_label: 'Партнёр',
  parsers: [],
  invited: true,
  access_blocked: false,
  invite_error: false,
  last_activity_at: '2026-08-02T10:00:00.000Z',
  next_action: 'Обработать меню',
  requires_action: true,
  has_published_menu: true,
  public_menu_url: '/restaurants/loulou/menu',
  active_revision_id: 12,
}

const sage = {
  slug: 'sage',
  name: 'Sage',
  cities: [],
  city_label: 'Город не указан',
  contacts: [],
  menu_status: 'published',
  menu_status_label: 'Опубликовано',
  partnership: 'parsing',
  partnership_label: 'Парсинг',
  parsers: ['sage'],
  invited: false,
  access_blocked: false,
  invite_error: false,
  last_activity_at: '2026-07-25T10:00:00.000Z',
  next_action: 'Пригласить ресторан',
  requires_action: false,
  has_published_menu: true,
  public_menu_url: '/restaurants/sage/menu',
  active_revision_id: null,
}

test('administrator filters networks, reuses a catalog restaurant and manages invitations', async ({ page }) => {
  const requests = []
  await page.route('**/api/admin/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    requests.push({ path, method: request.method(), body: request.postDataJSON?.() })
    if (path === '/api/admin/auth/me') return route.fulfill({ json: { ok: true, role: 'admin', csrf_token: 'csrf' } })
    if (path === '/api/admin/restaurants' && request.method() === 'GET') {
      const onlyPartners = url.searchParams.get('partnership') === 'partner'
      return route.fulfill({
        json: {
          ok: true,
          restaurants: onlyPartners ? [loulou] : [loulou, sage],
          filters: {
            cities: ['Москва', 'Санкт-Петербург'],
            menu_statuses: [
              { value: 'awaiting_admin', label: 'Ждёт обработки администратором' },
              { value: 'published', label: 'Опубликовано' },
            ],
            partnerships: [
              { value: 'partner', label: 'Партнёры' },
              { value: 'parsing', label: 'Парсинг' },
              { value: 'not_invited', label: 'Не приглашённые' },
              { value: 'not_partner', label: 'Не партнёры' },
            ],
          },
        },
      })
    }
    if (path === '/api/admin/restaurants' && request.method() === 'POST') {
      const body = request.postDataJSON()
      if (!body.existing_slug) {
        return route.fulfill({
          status: 409,
          json: {
            error: { code: 'existing_network_confirmation_required', message: 'Похожая сеть уже есть в базе.' },
            candidates: [{ slug: 'sage', name: 'Sage', cities: ['Москва'], partnership_label: 'Не партнёр' }],
          },
        })
      }
      return route.fulfill({ status: 200, json: { ok: true, slug: body.existing_slug, invited: false, email_sent: false } })
    }
    if (/\/contacts\/7\/invite$/.test(path)) {
      const body = request.postDataJSON()
      return route.fulfill({ json: { ok: true, email_sent: body.send_email, invite_url: 'https://example.test/invite/new' } })
    }
    if (/\/access$/.test(path)) return route.fulfill({ json: { ok: true, access_blocked: true } })
    return route.fulfill({ json: { ok: true } })
  })

  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('/admin/restaurants')
  await expect(page.getByRole('heading', { name: 'Рестораны' })).toBeVisible()
  const table = page.getByRole('table')
  await expect(table.getByText('Ждёт обработки администратором')).toBeVisible()
  await expect(table.getByText('Парсинг')).toBeVisible()
  await expect(table.getByText('Пригласить ресторан')).toBeVisible()
  await expect(table.getByText('Москва, Санкт-Петербург')).toBeVisible()

  await page.getByLabel('Партнёрство').selectOption('partner')
  await expect(table.getByRole('row').filter({ hasText: 'Sage' })).toHaveCount(0)
  await expect.poll(() => requests.some(({ path }) => path.includes('/api/admin/restaurants'))).toBeTruthy()

  await page.getByRole('button', { name: 'Добавить ресторан' }).click()
  await page.getByLabel('Название сети').fill('Sage')
  await page.getByLabel('Первый город').fill('Москва')
  await page.getByRole('button', { name: 'Создать ресторан' }).click()
  await expect(page.getByText('Похожая сеть уже есть')).toBeVisible()
  await page.getByRole('button', { name: /Sage/ }).click()
  await expect(page.getByText('Письмо не отправлено')).toBeVisible()
  expect(requests.some(({ body }) => body?.existing_slug === 'sage')).toBeTruthy()

  // # Сохранение перезагружает таблицу — дожидаемся её, иначе строка исчезнет из-под клика.
  const listCalls = () => requests.filter(({ path, method }) => path === '/api/admin/restaurants' && method === 'GET').length
  await expect.poll(listCalls).toBe(3)
  const row = page.getByRole('row').filter({ hasText: 'Loulou' })
  await expect(row).toHaveCount(1)
  await row.getByText('Действия').click()
  await row.getByRole('button', { name: 'Отправить повторно' }).click()
  await expect(page.getByText('Приглашение отправлено на manager@loulou.test.')).toBeVisible()
  expect(requests.some(({ path, body }) => /contacts\/7\/invite$/.test(path) && body?.send_email === true)).toBeTruthy()
})

test('administrator edits a restaurant row and adds emails without sending letters', async ({ page }) => {
  const requests = []
  await page.route('**/api/admin/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    requests.push({ path, method: request.method(), body: request.postDataJSON?.() })
    if (path === '/api/admin/auth/me') return route.fulfill({ json: { ok: true, role: 'admin', csrf_token: 'csrf' } })
    if (path === '/api/admin/restaurants' && request.method() === 'GET') {
      return route.fulfill({
        json: {
          ok: true,
          restaurants: [sage],
          filters: { cities: [], menu_statuses: [], partnerships: [] },
        },
      })
    }
    return route.fulfill({ json: { ok: true } })
  })

  await page.goto('/admin/restaurants')
  const row = page.getByRole('row').filter({ hasText: 'Sage' })
  await row.getByText('Действия').click()
  await row.getByRole('button', { name: 'Редактировать' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Название сети').fill('Sage Bistro')
  await dialog.getByLabel('Город').fill('Москва')
  await dialog.getByLabel('Новый email 1').fill('owner@sage.test')
  await dialog.getByRole('button', { name: 'Добавить email' }).click()
  await dialog.getByLabel('Новый email 2').fill('chef@sage.test')
  await dialog.getByRole('button', { name: 'Сохранить' }).click()

  await expect(page.getByText('Новые адреса добавлены без письма.')).toBeVisible()
  expect(requests.some(({ path, method, body }) => (
    path === '/api/admin/restaurants/sage' && method === 'PATCH' && body?.name === 'Sage Bistro' && body?.city === 'Москва'
  ))).toBeTruthy()
  const contactCalls = requests.filter(({ path, method }) => path === '/api/admin/restaurants/sage/contacts' && method === 'POST')
  expect(contactCalls.map(({ body }) => body.email)).toEqual(['owner@sage.test', 'chef@sage.test'])
  expect(contactCalls.every(({ body }) => body.send_invite === false)).toBeTruthy()
})
