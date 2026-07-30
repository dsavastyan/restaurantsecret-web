import { expect, test } from '@playwright/test'

test('restaurant manages published dish photos from individual cards', async ({ page }) => {
  const dishes = [
    { id: 12, name: 'Омлет с форелью', category: 'Завтраки', photo_url: 'https://files.test/omelet.webp' },
    { id: 13, name: 'Сырники со сметаной', category: 'Завтраки', photo_url: null },
    { id: 14, name: 'Цезарь с курицей', category: 'Салаты', photo_url: 'https://files.test/caesar.webp' },
  ]
  const requests = []

  await page.route('https://files.test/**', async (route) => {
    await route.fulfill({
      body: Buffer.from('image'),
      contentType: 'image/webp',
    })
  })
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
    if (path === '/api/restaurant/menu/photos' && request.method() === 'GET') {
      await route.fulfill({ json: { ok: true, dishes } })
      return
    }
    if (path === '/api/restaurant/menu/photos/13' && request.method() === 'PUT') {
      requests.push(['replace', 13])
      dishes[1].photo_url = 'https://files.test/syrniki.webp'
      await route.fulfill({ json: { ok: true, dish_id: 13, photo_url: dishes[1].photo_url } })
      return
    }
    if (path === '/api/restaurant/menu/photos/12' && request.method() === 'DELETE') {
      requests.push(['delete', 12])
      dishes[0].photo_url = null
      await route.fulfill({ json: { ok: true, dish_id: 12 } })
      return
    }
    await route.fulfill({ json: { ok: true } })
  })

  await page.goto('/partners/photos')

  await expect(page.getByRole('heading', { name: 'Фото блюд' })).toBeVisible()
  await expect(page.locator('#rs-splash')).toHaveAttribute('data-state', 'hidden')
  const acceptCookies = page.getByRole('button', { name: 'Принять' })
  if (await acceptCookies.isVisible()) await acceptCookies.click()
  await expect(page.locator('.partners-photo-manager__card')).toHaveCount(3)

  await page.getByRole('button', { name: 'Без фото' }).click()
  await expect(page.locator('.partners-photo-manager__card')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Сырники со сметаной' })).toBeVisible()

  await page.getByLabel('Добавить фото блюда «Сырники со сметаной»').setInputFiles({
    name: 'syrniki.webp',
    mimeType: 'image/webp',
    buffer: Buffer.from('image'),
  })
  await expect(page.getByRole('status')).toContainText('Фото блюда «Сырники со сметаной» обновлено.')
  await expect(page.locator('.partners-photo-manager__card')).toHaveCount(0)

  await page.getByRole('button', { name: 'Все', exact: true }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('.partners-photo-manager__card', { hasText: 'Омлет с форелью' }).getByRole('button', { name: 'Удалить' }).click()
  await expect(page.getByRole('status')).toContainText('Фото блюда «Омлет с форелью» удалено.')

  expect(requests).toEqual([['replace', 13], ['delete', 12]])
})
