import { expect, test } from '@playwright/test'

const invalidEmails = [
  'partner @restaurant.ru',
  'партнер@restaurant.ru',
  'partner🙂@restaurant.ru',
  'partner@@restaurant.ru',
]

function makeMaxLengthEmail() {
  return `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`
}

test('partner login shows custom email validation instead of browser validation', async ({ page }) => {
  let requestCount = 0
  await page.route('**/api/restaurant/auth/request-link', async (route) => {
    requestCount += 1
    await route.fulfill({ json: { registered: true } })
  })

  await page.goto('/partners/login')
  const emailInput = page.locator('#partner-email')
  const submitButton = page.getByRole('button', { name: 'Получить ссылку' })

  await expect(page.locator('form.partners-login__form')).toHaveAttribute('novalidate', '')
  await expect(emailInput).toHaveAttribute('maxlength', '254')

  for (const invalidEmail of invalidEmails) {
    await emailInput.fill(invalidEmail)
    await submitButton.click()
    await expect(page.getByRole('alert')).toHaveText('Укажите корректный email.')
  }

  expect(requestCount).toBe(0)
})

test('partner login constrains long email values and keeps not-found title inside the card', async ({ page }) => {
  await page.route('**/api/restaurant/auth/request-link', async (route) => {
    await route.fulfill({ json: { registered: false } })
  })

  await page.goto('/partners/login')
  const emailInput = page.locator('#partner-email')

  await emailInput.fill(`${'x'.repeat(300)}@restaurant.ru`)
  await expect(emailInput).toHaveValue('x'.repeat(254))

  await emailInput.fill(makeMaxLengthEmail())
  await page.getByRole('button', { name: 'Получить ссылку' }).click()

  const heading = page.getByRole('heading', { name: /Email .* не найден/ })
  await expect(heading).toBeVisible()
  await expect(heading.locator('.partners-login__email-fragment')).toContainText('…')

  const cardBox = await page.locator('.partners-login').boundingBox()
  const headingBox = await heading.boundingBox()
  const headingFits = await heading.evaluate((element) => element.scrollWidth <= element.clientWidth)
  expect(cardBox).not.toBeNull()
  expect(headingBox).not.toBeNull()
  expect(headingFits).toBe(true)
  expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1)
})
