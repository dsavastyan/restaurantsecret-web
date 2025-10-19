import { expect, test } from '@playwright/test'

const waitForSuccessfulResponse = (page, predicate) =>
  page.waitForResponse((response) => {
    if (!predicate(response)) return false
    return response.ok()
  })

test('@smoke landing to restaurant flow is gated by paywall', async ({ page }) => {
  await page.goto('/')

  const cta = page.getByRole('link', { name: 'Посмотреть рестораны' })
  await expect(cta).toBeVisible()

  // Moving past the landing page should fetch the catalog data.
  const catalogResponsePromise = waitForSuccessfulResponse(page, (response) => {
    const url = response.url()
    return url.includes('/restaurants') && url.includes('limit=20') && response.request().method() === 'GET'
  })

  await Promise.all([
    page.waitForURL('**/restaurants'),
    cta.click()
  ])

  const catalogResponse = await catalogResponsePromise
  const catalogPayload = await catalogResponse.json()
  const firstRestaurant = catalogPayload?.items?.[0]
  expect(firstRestaurant?.slug).toBeTruthy()

  const cards = page.locator('.card')
  const firstCardButton = cards.first().locator('button.card-body')
  await expect(firstCardButton).toBeVisible()

  // Attempting to open a restaurant without access should mount the paywall.
  await firstCardButton.click()
  const paywall = page.getByRole('dialog', { name: 'Оформите подписку' })
  await expect(paywall).toBeVisible()

  // Simulate an activated subscription so the flow can continue.
  await page.evaluate(() => {
    const expires = new Date()
    expires.setMonth(expires.getMonth() + 1)
    const detail = {
      ok: true,
      isActive: true,
      expiresAt: expires.toISOString()
    }
    window.localStorage.setItem('rs_access_state', JSON.stringify(detail))
    window.dispatchEvent(new CustomEvent('rs-access-update', { detail }))
  })
  await expect(paywall).toBeHidden()

  const slug = firstRestaurant.slug
  const restaurantResponsePromise = waitForSuccessfulResponse(page, (response) => {
    const url = response.url()
    return url.includes(`/restaurants/${slug}/menu`) && response.request().method() === 'GET'
  })

  await Promise.all([
    page.waitForURL(`**/r/${slug}`),
    firstCardButton.click()
  ])

  await restaurantResponsePromise

  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toContainText(firstRestaurant.name || slug)
})
