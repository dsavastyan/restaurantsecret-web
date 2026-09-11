import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.removeItem('catalog_city'))

  await page.route('**/cities', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [
        { id: 'Москва', name: 'Москва' },
        { id: 'Санкт-Петербург', name: 'Санкт-Петербург' },
      ],
    }),
  }))
})

test('offers the detected catalog city on the first visit', async ({ page }) => {
  await page.route('**/location', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ city: 'Санкт-Петербург' }),
  }))

  await page.goto('/')

  await expect(page.getByText('Ваш город —', { exact: false })).toContainText('Санкт-Петербург')
  await expect(page.getByRole('button', { name: 'Да', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Выбрать другой' })).toBeVisible()
})

test('allows previewing the first-visit prompt in local development', async ({ page }) => {
  await page.goto('/?detected_city=Минск')

  await expect(page.getByText('Ваш город —', { exact: false })).toContainText('Минск')
  await expect(page.getByRole('button', { name: 'Да', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('catalog_city')))
    .toBe(null)
})

test('offers Moscow when the city cannot be detected', async ({ page }) => {
  await page.route('**/location', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ city: null }),
  }))

  await page.goto('/')

  await expect(page.getByText('Ваш город —', { exact: false })).toContainText('Москва')
  await expect(page.getByRole('button', { name: 'Да', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('catalog_city')))
    .toBe(null)
})

test('offers Moscow when city detection fails', async ({ page }) => {
  await page.route('**/location', (route) => route.abort())

  await page.goto('/')

  await expect(page.getByText('Ваш город —', { exact: false })).toContainText('Москва')
})

test('does not replace a manual choice with a late location response', async ({ page }) => {
  let releaseLocation
  const locationReady = new Promise((resolve) => {
    releaseLocation = resolve
  })

  await page.route('**/location', async (route) => {
    await locationReady
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ city: 'Санкт-Петербург' }),
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Принять', exact: true }).click()
  await page.getByRole('button', { name: /Москва/ }).first().click()
  const cityDialog = page.getByRole('dialog', { name: 'Выберите город' })
  await cityDialog.getByRole('button', { name: /Москва/ }).click()
  releaseLocation()

  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('catalog_city')))
    .toBe('Москва')
  await expect(page.getByText('Ваш город —', { exact: false })).toHaveCount(0)
})
