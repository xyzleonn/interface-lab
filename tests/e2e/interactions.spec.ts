import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }))
})

async function chooseComponent(page: Page, component: string) {
  const selector = page.getByRole('navigation', { name: 'Choose a component' })
  await selector.getByRole('button').filter({ hasText: component }).click()
}

test('Select opens, chooses an option, and dismisses on outside click', async ({ page }) => {
  await page.goto('/#playground')
  await chooseComponent(page, 'Select')

  const preview = page.getByRole('region', { name: 'Select preview' })
  const combo = preview.getByRole('combobox', { name: /Workspace/ })
  await expect(combo).toHaveAttribute('aria-expanded', 'false')

  await combo.click()
  await expect(combo).toHaveAttribute('aria-expanded', 'true')
  await preview.getByRole('option', { name: 'Personal' }).click()
  await expect(combo).toContainText('Personal')
  await expect(combo).toHaveAttribute('aria-expanded', 'false')

  await combo.click()
  await expect(combo).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('heading', { level: 1 }).click()
  await expect(combo).toHaveAttribute('aria-expanded', 'false')
})

test('Select supports Space, arrows, Enter, Escape, and its disabled state', async ({ page }) => {
  await page.goto('/#playground')
  await chooseComponent(page, 'Select')

  const preview = page.getByRole('region', { name: 'Select preview' })
  const combo = preview.getByRole('combobox', { name: /Workspace/ })
  await combo.focus()
  await page.keyboard.press('Space')
  await expect(combo).toHaveAttribute('aria-expanded', 'true')

  await page.keyboard.press('ArrowDown')
  const personal = preview.getByRole('option', { name: 'Personal' })
  await expect(combo).toHaveAttribute('aria-activedescendant', await personal.getAttribute('id') ?? '')
  await page.keyboard.press('Enter')
  await expect(combo).toContainText('Personal')

  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Space')
  await expect(combo).toContainText('Experiments')

  await page.keyboard.press('Space')
  await expect(combo).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(combo).toHaveAttribute('aria-expanded', 'false')
  await expect(combo).toBeFocused()

  const properties = page.getByRole('complementary', { name: 'Select properties' })
  await properties.getByRole('switch', { name: 'Disabled' }).click()
  await expect(combo).toBeDisabled()
  await expect(combo).toHaveAttribute('aria-expanded', 'false')
})

test('Modal exposes dialog semantics, opens by keyboard, and restores focus on Escape', async ({ page }) => {
  await page.goto('/#playground')
  await chooseComponent(page, 'Modal')

  const preview = page.getByRole('region', { name: 'Modal preview' })
  const trigger = preview.getByRole('button', { name: 'Open dialog' })
  await trigger.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'A small moment' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await page.keyboard.press('Space')
  await expect(dialog).toBeVisible()
})

test('Modal traps Tab and Shift+Tab and closes through its button', async ({ page }) => {
  await page.goto('/#playground')
  await chooseComponent(page, 'Modal')

  const preview = page.getByRole('region', { name: 'Modal preview' })
  const trigger = preview.getByRole('button', { name: 'Open dialog' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'A small moment' })
  const closeButtons = dialog.getByRole('button', { name: 'Close dialog', exact: true })
  await expect(closeButtons).toHaveCount(2)
  const first = closeButtons.nth(0)
  const last = closeButtons.nth(1)

  await page.keyboard.press('Tab')
  await expect(first).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(last).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(first).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(last).toBeFocused()

  await last.click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('Modal closes on backdrop click but stays open for dialog content clicks', async ({ page }) => {
  await page.goto('/#playground')
  await chooseComponent(page, 'Modal')

  const preview = page.getByRole('region', { name: 'Modal preview' })
  const trigger = preview.getByRole('button', { name: 'Open dialog' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'A small moment' })

  await dialog.getByRole('heading', { name: 'A small moment' }).click()
  await expect(dialog).toBeVisible()

  await preview.locator('.editor-modal-backdrop').click({ position: { x: 5, y: 5 } })
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('keyboard navigation exposes a visible focus indicator and disabled buttons stay inactive', async ({ page }) => {
  await page.goto('/#playground')

  await page.keyboard.press('Tab')
  const homeLink = page.getByRole('link', { name: 'Interface Lab home' })
  await expect(homeLink).toBeFocused()
  await expect.poll(() => homeLink.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#overview$/)

  await page.goto('/#playground')
  await chooseComponent(page, 'Button')
  const properties = page.getByRole('complementary', { name: 'Button properties' })
  const state = properties.getByRole('combobox', { name: /Preview state/ })
  await state.click()
  await page.getByRole('option', { name: 'Disabled' }).click()

  const button = page.getByRole('region', { name: 'Button preview' }).getByRole('button', { name: 'Create project' })
  await expect(button).toBeDisabled()
})
