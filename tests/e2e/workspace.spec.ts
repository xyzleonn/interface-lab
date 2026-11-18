import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Keep UI checks deterministic and independent of the optional remote Manrope import.
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }))
})

test('loads the Overview dashboard', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Interface Lab/i)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good (morning|afternoon|evening)/)
  await expect(page.getByRole('link', { name: 'Open Theme Studio', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Component Playground', exact: true })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeVisible()
})

test('navigates between the workspace sections', async ({ page }) => {
  await page.goto('/')

  for (const section of [
    { label: 'Theme studio', hash: '#theme-studio', heading: 'Set the right mood.' },
    { label: 'Design tokens', hash: '#token-studio', heading: 'Design tokens' },
    { label: 'Playground', hash: '#playground', heading: 'Shape the details.' },
    { label: 'Settings', hash: '#settings', heading: 'Preferences, just so.' },
    { label: 'Overview', hash: '#overview', heading: /Good (morning|afternoon|evening)/ },
  ]) {
    const navigationLink = page.getByRole('link', { name: section.label, exact: true })
    await navigationLink.click()
    await expect(page).toHaveURL(new RegExp(`${section.hash}$`))
    await expect(navigationLink).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(section.heading)
  }
})

test('selects all eleven components and updates preview and properties', async ({ page }) => {
  await page.goto('/#playground')

  const components = [
    'Button', 'Card', 'Input field', 'Toggle', 'Slider', 'Badge', 'Alert', 'Select', 'Modal', 'Tooltip', 'Tabs',
  ]
  const selector = page.getByRole('navigation', { name: 'Choose a component' })

  await expect(selector.getByRole('button')).toHaveCount(components.length)

  for (const component of components) {
    const choice = selector.getByRole('button').filter({ hasText: component })
    await choice.click()
    await expect(choice).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('region', { name: `${component} preview` })).toBeVisible()
    await expect(page.getByRole('complementary', { name: `${component} properties` })).toBeVisible()
  }
})

test('preview state controls update the selected component immediately', async ({ page }) => {
  await page.goto('/#playground')

  const properties = page.getByRole('complementary', { name: 'Button properties' })
  const previewState = properties.getByRole('combobox', { name: /Preview state/ })
  await previewState.click()
  await page.getByRole('option', { name: 'Loading' }).click()

  await expect(previewState).toContainText('Loading')
  const previewButton = page.getByRole('region', { name: 'Button preview' }).getByRole('button', { name: 'Create project' })
  await expect(previewButton).toBeDisabled()
  await expect(previewButton).toHaveAttribute('aria-busy', 'true')
  await expect(previewButton.locator('.editor-button-spinner')).toBeVisible()
})

test('has no unexpected browser console or page errors while navigating the editor', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))

  await page.goto('/')
  await page.getByRole('link', { name: 'Playground', exact: true }).click()
  const selector = page.getByRole('navigation', { name: 'Choose a component' })

  for (const component of ['Badge', 'Alert', 'Select', 'Modal', 'Tooltip', 'Tabs']) {
    await selector.getByRole('button').filter({ hasText: component }).click()
    await expect(page.getByRole('region', { name: `${component} preview` })).toBeVisible()
  }

  expect(errors).toEqual([])
})
