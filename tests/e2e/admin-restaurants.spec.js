import { expect, test } from '@playwright/test'

const loulou = {
  slug: 'loulou',
  name: 'Loulou',
  cities: ['Москва', 'Санкт-Петербург'],
  city_label: 'Москва, Санкт-Петербург',
  contacts: [{ id: 7, email: 'manager@loulou.test', invite_delivery_status: 'sent' }],
  menu_status: 'awaiting_admin',
  menu_status_label: 'Ждёт обработки администратором',
  partnership: 'partner',
  partnership_label: 'Партнёр',
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
  partnership: 'not_partner',
  partnership_label: 'Не партнёр',
  access_blocked: false,
  invite_error: false,
  last_activity_at: '2026-07-25T10:00:00.000Z',
  next_action: '—',
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
      return route.fulfill({ status: 200, json: { ok: true, slug: body.existing_slug, email_sent: true } })
    }
    if (/\/contacts\/7\/invite$/.test(path)) {
      const body = request.postDataJSON()
      return route.fulfill({ json: { ok: true, email_sent: body.send_email, invite_url: 'https://example.test/invite/new' } })
    }
    if (/\/access$/.test(path)) return route.fulfill({ json: { ok: true, access_blocked: true } })
    return route.fulfill({ json: { ok: true } })
  })

  await page.goto('/admin/restaurants')
  await expect(page.getByRole('heading', { name: 'Рестораны' })).toBeVisible()
  const table = page.getByRole('table')
  await expect(table.getByText('Ждёт обработки администратором')).toBeVisible()
  await expect(table.getByText('Не партнёр')).toBeVisible()
  await expect(table.getByText('Москва, Санкт-Петербург')).toBeVisible()

  await page.getByLabel('Партнёрство').selectOption('partner')
  await expect(table.getByRole('row').filter({ hasText: 'Sage' })).toHaveCount(0)
  await expect.poll(() => requests.some(({ path }) => path.includes('/api/admin/restaurants'))).toBeTruthy()

  await page.getByRole('button', { name: 'Добавить ресторан' }).click()
  await page.getByLabel('Название сети').fill('Sage')
  await page.getByLabel('Первый город').fill('Москва')
  await page.getByLabel('Контактный email').fill('owner@sage.test')
  await page.getByRole('button', { name: 'Создать и отправить приглашение' }).click()
  await expect(page.getByText('Похожая сеть уже есть')).toBeVisible()
  await page.getByRole('button', { name: /Sage/ }).click()
  await expect(page.getByText('Ресторан добавлен в CRM, приглашение отправлено.')).toBeVisible()
  expect(requests.some(({ body }) => body?.existing_slug === 'sage')).toBeTruthy()

  const row = page.getByRole('row').filter({ hasText: 'Loulou' })
  await row.getByText('Действия').click()
  await row.getByRole('button', { name: 'Отправить повторно' }).click()
  await expect(page.getByText('Приглашение отправлено на manager@loulou.test.')).toBeVisible()
  expect(requests.some(({ path, body }) => /contacts\/7\/invite$/.test(path) && body?.send_email === true)).toBeTruthy()
})
