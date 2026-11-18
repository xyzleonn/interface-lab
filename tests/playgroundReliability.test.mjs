import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test, { beforeEach } from 'node:test'
import { generateComponentCss, generateComponentHtml, generateComponentTsx, getSafeTabsLabels } from '../src/features/playground/componentExport.ts'
import { loadPresets, savePresets } from '../src/features/playground/presetStorage.ts'
import { getAppearancePreviewVariables } from '../src/features/tokens/appearancePreview.ts'
import { createFontFingerprint, extractFontMetadata, fontStackUsesFamily, hasDuplicateFingerprint, makeCustomCssFamily, validateFontFile, validateFontSignature } from '../src/features/tokens/customFontFiles.ts'
import { adjustTypographyWeights, findFontByStack, FONT_CATALOG, getFontWeightDomain, nearestSupportedWeight, searchFonts, updateTypographyFont } from '../src/features/tokens/fontCatalog.ts'
import { loadStoredCustomFonts } from '../src/features/tokens/customFontStorage.ts'
import { defaultDesignTokens } from '../src/features/tokens/tokenDefaults.ts'
import { designTokensToCss } from '../src/features/tokens/tokenCss.ts'
import { generateTypographyFontCss } from '../src/features/tokens/typographyExport.ts'
import { getNextOverviewHeadlineIndex, overviewHeadlines } from '../src/features/dashboard/overviewHeadlines.ts'

const components = ['button', 'card', 'input', 'toggle', 'slider', 'badge', 'alert', 'select', 'modal', 'tooltip', 'tabs']
const exportClasses = {
  button: 'il-export-button', card: 'il-export-card', input: 'il-export-input',
  toggle: 'il-export-toggle', slider: 'il-export-slider', badge: 'il-export-badge', alert: 'il-export-alert',
  select: 'il-export-select', modal: 'il-export-modal', tooltip: 'il-export-tooltip', tabs: 'il-export-tabs',
}

function createSettings() {
  return {
    button: { variant: 'primary', size: 'medium', radius: 9, padding: 18, fontSize: 14, text: 'Create project', previewState: 'default' },
    card: { variant: 'default', size: 'medium', radius: 16, padding: 26, shadow: 34, borderVisible: true },
    input: { placeholder: 'Your email address', variant: 'outlined', radius: 9, size: 'medium', disabled: false, previewState: 'default' },
    toggle: { size: 22, accent: '#a997f5', defaultOn: true, previewState: 'default' },
    slider: { min: 0, max: 100, value: 64, accent: '#a997f5', previewState: 'default' },
    badge: { text: 'New', variant: 'soft', color: 'primary', size: 'medium', showDot: true },
    alert: { variant: 'info', size: 'medium', title: 'Heads up', description: 'New features are ready.', dismissible: true },
    select: { label: 'Workspace', placeholder: 'Choose a workspace', options: ['Interface Lab', 'Personal'], value: 'Interface Lab', disabled: false, previewState: 'default' },
    modal: { triggerText: 'Open dialog', title: 'A small moment', description: 'A focused space.', size: 'medium' },
    tooltip: { triggerText: 'Hover or focus me', content: 'A little context.', placement: 'top' },
    tabs: { labels: ['Overview', 'Activity', 'Settings'], contents: ['A clear view of your workspace.', 'Recent changes and activity.', 'Preferences for your creative space.'], activeIndex: 0, previewState: 'default' },
  }
}

class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, String(value)) }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: new MemoryStorage() })
})

test('empty Select options survive preset save and restore without fabrication', () => {
  const settings = createSettings()
  const preset = {
    id: 'empty-select', name: 'Empty Select', savedAt: Date.now(), component: 'select',
    properties: { ...settings.select, options: [], value: '' },
  }

  assert.equal(savePresets([preset]), true)
  const [restored] = loadPresets()
  assert.deepEqual(restored.properties.options, [])
  assert.equal(restored.properties.value, '')

  const restoredSettings = { ...settings, select: restored.properties }
  assert.doesNotMatch(generateComponentHtml('select', restoredSettings), /Option 1/)
  assert.match(generateComponentTsx('select', restoredSettings), /options = \[\]/)
})

test('preset round trips preserve Select and Tabs property values exactly', () => {
  const settings = createSettings()
  settings.select = { ...settings.select, options: ['One', 'Two'], value: 'Two' }
  settings.tabs = { labels: ['Overview', '', ' Settings '], contents: ['First panel', '', 'Third panel'], activeIndex: 2, previewState: 'default' }
  const presets = [
    { id: 'select', name: 'Select setup', savedAt: Date.now(), component: 'select', properties: settings.select },
    { id: 'tabs', name: 'Tabs setup', savedAt: Date.now(), component: 'tabs', properties: settings.tabs },
  ]

  assert.equal(savePresets(presets), true)
  const restored = loadPresets()
  assert.deepEqual(restored[0].properties, settings.select)
  assert.deepEqual(restored[1].properties, settings.tabs)
})

test('legacy Badge presets migrate semantic variants and preserve appearance', () => {
  localStorage.setItem('interface-lab-component-presets-v1', JSON.stringify([
    { id: 'legacy-badge', name: 'Legacy badge', savedAt: Date.now(), component: 'badge', properties: { text: 'Ready', variant: 'accent', size: 'medium', showDot: true } },
  ]))

  const [preset] = loadPresets()
  assert.equal(preset.component, 'badge')
  assert.deepEqual(preset.properties, { text: 'Ready', variant: 'solid', color: 'primary', size: 'medium', showDot: true })
})

test('legacy Tabs presets receive compatible default panel content', () => {
  localStorage.setItem('interface-lab-component-presets-v1', JSON.stringify([
    { id: 'legacy-tabs', name: 'Legacy tabs', savedAt: Date.now(), component: 'tabs', properties: { labels: ['Overview', 'Activity'], activeIndex: 1 } },
  ]))
  const [preset] = loadPresets()
  assert.deepEqual(preset.properties.contents, ['This panel is showing the Overview view.', 'This panel is showing the Activity view.'])
})

test('legacy interactive presets migrate to semantic default preview states', () => {
  const settings = createSettings()
  const legacy = ['button', 'input', 'toggle', 'slider', 'select', 'tabs'].map((component) => {
    const properties = { ...settings[component] }
    delete properties.previewState
    return { id: `legacy-${component}`, name: `Legacy ${component}`, savedAt: Date.now(), component, properties }
  })
  localStorage.setItem('interface-lab-component-presets-v1', JSON.stringify(legacy))

  assert.deepEqual(loadPresets().map((preset) => preset.properties.previewState), Array(6).fill('default'))
})

test('preview state configuration survives presets and is represented in generated exports', () => {
  const settings = createSettings()
  settings.button.previewState = 'loading'
  settings.input.previewState = 'error'
  settings.toggle.previewState = 'disabled'
  settings.slider.previewState = 'active'
  settings.select.previewState = 'open'
  settings.tabs.previewState = 'focus'
  const presets = ['button', 'input', 'toggle', 'slider', 'select', 'tabs'].map((component) => ({
    id: component, name: `${component} state`, savedAt: Date.now(), component, properties: settings[component],
  }))
  assert.equal(savePresets(presets), true)
  assert.deepEqual(loadPresets().map((preset) => preset.properties.previewState), ['loading', 'error', 'disabled', 'active', 'open', 'focus'])

  assert.match(generateComponentHtml('button', settings), /aria-busy="true"/)
  assert.match(generateComponentHtml('button', settings), /il-export-button__spinner/)
  assert.match(generateComponentHtml('input', settings), /aria-invalid="true"/)
  assert.match(generateComponentHtml('toggle', settings), /data-preview-state="disabled" disabled/)
  assert.match(generateComponentHtml('slider', settings), /data-preview-state="active"/)
  assert.match(generateComponentHtml('select', settings), /static HTML cannot force their popup open/)
  assert.match(generateComponentHtml('tabs', settings), /data-preview-state="focus"/)
  assert.match(generateComponentCss('button', settings), /data-preview-state="active"/)
  assert.match(generateComponentCss('input', settings), /\[aria-invalid="true"\]/)
  assert.match(generateComponentTsx('button', settings), /previewState\?: 'default' \| 'hover' \| 'focus' \| 'active' \| 'disabled' \| 'loading'/)
  assert.match(generateComponentTsx('toggle', settings), /disabled=\{previewState === 'disabled'\}/)
  assert.match(generateComponentTsx('tabs', settings), /data-preview-state=\{previewState\}/)
})

test('Playground preview styles provide distinct semantic state treatments', () => {
  const css = readFileSync(new URL('../src/features/playground/VisualComponentEditor.css', import.meta.url), 'utf8')
  for (const selector of [
    "data-preview-state='hover'", "data-preview-state='focus'", "data-preview-state='active'",
    "data-preview-state='error'", "button:disabled", "state-hover", "state-focus",
  ]) assert.ok(css.includes(selector), `Missing preview style for ${selector}`)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})

test('export copy feedback is announced, timed safely, and distinguishes failures', () => {
  const jsx = readFileSync(new URL('../src/features/playground/VisualComponentEditor.tsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/features/playground/VisualComponentEditor.css', import.meta.url), 'utf8')
  assert.match(jsx, /role="status" aria-live="polite">\{copyNotice\}/)
  assert.match(jsx, /copyNoticeTimeoutRef\.current !== null\) window\.clearTimeout/)
  assert.match(jsx, /showCopyNotice\('Copied to clipboard', 'success', 1800\)/)
  assert.match(jsx, /showCopyNotice\('Clipboard access is unavailable here', 'error', 2500\)/)
  assert.match(css, /data-copy-state='success'/)
  assert.match(css, /data-copy-state='error'/)
})

test('preview variant changes transition surfaces without implying a card click action', () => {
  const css = readFileSync(new URL('../src/features/playground/VisualComponentEditor.css', import.meta.url), 'utf8')
  const interactiveCardRule = css.match(/\.editor-card-preview\.is-interactive \{([^}]*)\}/)?.[1] ?? ''
  assert.doesNotMatch(interactiveCardRule, /cursor:\s*pointer/)
  assert.match(css, /\.editor-card-preview \{[^}]*background var\(--transition-fast\)/)
  assert.match(css, /\.editor-input-preview \{[^}]*background var\(--transition-fast\)/)
  assert.match(css, /\.editor-alert-preview \{[^}]*background var\(--transition-fast\)/)
})

test('Card interactive variant is visual-only and consistent across preview and exports', () => {
  const settings = createSettings()
  settings.card = { ...settings.card, variant: 'interactive' }
  const previewSource = readFileSync(new URL('../src/features/playground/VisualComponentEditor.tsx', import.meta.url), 'utf8')
  const previewCard = previewSource.match(/if \(selected === 'card'\)([\s\S]*?)if \(selected === 'input'\)/)?.[1] ?? ''
  const html = generateComponentHtml('card', settings)
  const css = generateComponentCss('card', settings)
  const tsx = generateComponentTsx('card', settings)

  assert.match(previewCard, /<article className=\{`editor-card-preview il-card is-\$\{card\.variant\}/)
  assert.doesNotMatch(previewCard, /editor-card-link|href=|<a\b|<button\b|onClick=/)
  assert.match(html, /<article class="il-export-card il-export-card--interactive/)
  assert.doesNotMatch(html, /href\s*=|il-export-card__link|Take a look/)
  assert.match(tsx, /<article className=\{`il-export-card il-export-card--\$\{variant\}/)
  assert.doesNotMatch(tsx, /href\s*=|il-export-card__link|onClick/)
  assert.doesNotMatch(css, /cursor\s*:\s*pointer/)
  assert.doesNotMatch(css, /\.il-export-card:hover/)
  assert.match(css, /\.il-export-card--interactive:hover \{[^}]*border-color:[^}]*box-shadow:[^}]*transform:\s*translateY\(-2px\)/)

  for (const variant of ['default', 'elevated', 'outlined', 'interactive']) {
    settings.card = { ...settings.card, variant }
    assert.match(generateComponentHtml('card', settings), new RegExp(`il-export-card--${variant}`))
    assert.match(generateComponentCss('card', settings), new RegExp(`il-export-card--${variant}`))
    assert.match(generateComponentTsx('card', settings), new RegExp(`variant = "${variant}"`))
  }
})

test('Button loading preview renders a sized, contrasting spinner and disables activation', () => {
  const jsx = readFileSync(new URL('../src/features/playground/VisualComponentEditor.tsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/features/playground/VisualComponentEditor.css', import.meta.url), 'utf8')
  assert.match(jsx, /isBusy && <span className="editor-button-spinner" aria-hidden="true" \/>/)
  assert.match(jsx, /disabled=\{isDisabled\} ariaBusy=\{isBusy\}/)
  assert.match(css, /\.editor-button-spinner \{[^}]*width: 13px; height: 13px;[^}]*border: 2px solid var\(--color-accent\);[^}]*border-radius: 50%;[^}]*animation: editor-button-spin \.7s linear infinite/s)
  assert.match(css, /\.editor-button-preview\.demo-button\.primary\[aria-busy='true'\] \.editor-button-spinner \{ border-color: currentColor;/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.editor-button-spinner \{ animation: none;/)
})

test('Design Token reset icons replay once per click and honor reduced motion', () => {
  const jsx = readFileSync(new URL('../src/features/tokens/TokenStudio.tsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/features/tokens/TokenStudio.css', import.meta.url), 'utf8')
  assert.match(jsx, /setAnimationId\(\(current\) => current \+ 1\)/)
  assert.match(jsx, /<span key=\{animationId\} className="token-reset-icon"/)
  assert.equal((jsx.match(/<ResetTokenButton label=/g) ?? []).length, 4)
  assert.match(css, /animation: token-reset-turn 400ms ease-in-out both/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.token-reset-icon \{ animation: none; \} \}/)
})

test('Badge appearance and Alert properties round trip and export all formats', () => {
  const settings = createSettings()
  settings.badge = { text: 'Ready', variant: 'outline', color: 'warning', size: 'large', showDot: false }
  settings.alert = { variant: 'error', size: 'small', title: 'Careful <now>', description: 'Use & check "details".', dismissible: true }
  const presets = [
    { id: 'new-badge', name: 'Outlined warning', savedAt: Date.now(), component: 'badge', properties: settings.badge },
    { id: 'alert', name: 'Error alert', savedAt: Date.now(), component: 'alert', properties: settings.alert },
  ]

  assert.equal(savePresets(presets), true)
  assert.deepEqual(loadPresets().map(({ properties }) => properties), [settings.badge, settings.alert])

  for (const component of ['badge', 'alert']) {
    const html = generateComponentHtml(component, settings)
    const css = generateComponentCss(component, settings)
    const tsx = generateComponentTsx(component, settings)
    assert.match(html, /il-export-/)
    assert.match(css, /il-export-/)
    assert.match(tsx, /export interface/)
  }

  assert.match(generateComponentHtml('badge', settings), /il-export-badge--outline il-export-badge--warning il-export-badge--large/)
  assert.doesNotMatch(generateComponentHtml('alert', settings), /Careful <now>/)
  assert.match(generateComponentHtml('alert', settings), /Careful &lt;now&gt;/)
  assert.match(generateComponentHtml('alert', settings), /role="alert" aria-live="assertive"/)
  assert.match(generateComponentCss('alert', settings), /--color-error/)
  assert.match(generateComponentTsx('badge', settings), /export type BadgeColor = 'neutral' \| 'primary' \| 'success' \| 'warning' \| 'error'/)
  assert.match(generateComponentTsx('alert', settings), /onDismiss\?: \(\) => void/)
})

test('component variants and semantic sizes persist and appear in every export format', () => {
  const settings = createSettings()
  settings.button = { ...settings.button, variant: 'danger', size: 'large' }
  settings.card = { ...settings.card, variant: 'interactive', size: 'small' }
  settings.input = { ...settings.input, variant: 'underlined', size: 'large' }
  settings.badge = { ...settings.badge, variant: 'solid', size: 'small' }
  settings.alert = { ...settings.alert, variant: 'warning', size: 'large' }
  const presetRecords = ['button', 'card', 'input', 'badge', 'alert'].map((component) => ({
    id: component, name: `${component} variant`, savedAt: Date.now(), component, properties: settings[component],
  }))
  assert.equal(savePresets(presetRecords), true)
  assert.deepEqual(loadPresets().map(({ properties }) => properties), presetRecords.map(({ properties }) => properties))

  const expectedClasses = {
    button: ['il-export-button--danger'],
    card: ['il-export-card--interactive', 'il-export-card--small'],
    input: ['il-export-input--underlined'],
    badge: ['il-export-badge--solid', 'il-export-badge--small'],
    alert: ['il-export-alert--warning', 'il-export-alert--large'],
  }
  for (const [component, classes] of Object.entries(expectedClasses)) {
    const html = generateComponentHtml(component, settings)
    const css = generateComponentCss(component, settings)
    const tsx = generateComponentTsx(component, settings)
    for (const className of classes) {
      assert.ok(html.includes(className), `${component} HTML is missing ${className}`)
      assert.ok(css.includes(className), `${component} CSS is missing ${className}`)
    }
    assert.match(tsx, /className=/, `${component} TSX is missing a className`)
  }
  assert.match(generateComponentCss('button', settings), /--color-error/)
  assert.match(generateComponentCss('card', settings), /interactive:hover/)
  assert.match(generateComponentCss('input', settings), /underlined/)
})

test('older Card, Input, Alert and Badge presets receive compatible new defaults', () => {
  const settings = createSettings()
  const legacy = [
    { id: 'card', name: 'Old card', savedAt: Date.now(), component: 'card', properties: { radius: 16, padding: 26, shadow: 34, borderVisible: true } },
    { id: 'input', name: 'Old input', savedAt: Date.now(), component: 'input', properties: { placeholder: 'Email', radius: 9, size: 'medium', disabled: false, previewState: 'default' } },
    { id: 'alert', name: 'Old alert', savedAt: Date.now(), component: 'alert', properties: { variant: 'info', title: '', description: 'Hello', dismissible: false } },
    { id: 'badge', name: 'Old soft badge', savedAt: Date.now(), component: 'badge', properties: { ...settings.badge, variant: 'subtle' } },
  ]
  localStorage.setItem('interface-lab-component-presets-v1', JSON.stringify(legacy))
  const restored = loadPresets()
  assert.deepEqual(restored.map(({ properties }) => properties.variant), ['default', 'outlined', 'info', 'soft'])
  assert.equal(restored[0].properties.size, 'medium')
  assert.equal(restored[1].properties.variant, 'outlined')
  assert.equal(restored[2].properties.size, 'medium')
})

test('HTML exports escape user-provided text and attributes', () => {
  const settings = createSettings()
  const hostile = `</script><img src=x onerror="alert('x')"> & */`
  settings.button.text = hostile
  settings.select = { ...settings.select, label: hostile, placeholder: hostile, options: [hostile], value: hostile }
  settings.modal = { ...settings.modal, title: hostile, description: hostile, triggerText: hostile }
  settings.tooltip = { ...settings.tooltip, triggerText: hostile, content: hostile }
  settings.tabs = { labels: [hostile, 'Second'], contents: [hostile, 'Panel content'], activeIndex: 0 }

  const buttonHtml = generateComponentHtml('button', settings)
  const selectHtml = generateComponentHtml('select', settings)
  const modalHtml = generateComponentHtml('modal', settings)
  const tooltipHtml = generateComponentHtml('tooltip', settings)
  settings.alert = { ...settings.alert, title: hostile, description: hostile }
  const alertHtml = generateComponentHtml('alert', settings)
  const tabsHtml = generateComponentHtml('tabs', settings)
  for (const html of [buttonHtml, selectHtml, modalHtml, tooltipHtml, alertHtml, tabsHtml]) {
    assert.doesNotMatch(html, /<img src=x/)
    assert.match(html, /&lt;img/)
    assert.match(html, /&amp;/)
  }
  assert.doesNotMatch(generateComponentCss('button', settings), /\*\/ body/)
})

test('generated dialog, tooltip, and tab exports expose their semantic relationships', () => {
  const settings = createSettings()
  const modalHtml = generateComponentHtml('modal', settings)
  const tooltipHtml = generateComponentHtml('tooltip', settings)
  const tabsHtml = generateComponentHtml('tabs', settings)
  const tabsTsx = generateComponentTsx('tabs', settings)

  assert.match(modalHtml, /<dialog[^>]*aria-labelledby="il-export-dialog-title"[^>]*aria-describedby="il-export-dialog-description"/)
  assert.match(tooltipHtml, /aria-describedby="il-export-tooltip-content"/)
  assert.match(tooltipHtml, /id="il-export-tooltip-content" role="tooltip"/)
  assert.match(tabsHtml, /role="tablist" aria-label="Preview tabs"/)
  assert.match(tabsHtml, /role="tab"[^>]*aria-controls="il-export-panel-0"/)
  assert.match(tabsHtml, /role="tabpanel" aria-labelledby="il-export-tab-0" tabindex="0"/)
  assert.match(tabsTsx, /role="tabpanel"[^>]*tabIndex=\{0\}/)
  assert.match(tabsTsx, /contents\?: string\[\]/)
})

test('Tabs panel content is independently editable and exported in HTML and TSX', () => {
  const settings = createSettings()
  settings.tabs.contents[1] = 'A custom second panel.'
  assert.match(generateComponentHtml('tabs', settings), /<p>A custom second panel\.<\/p>/)
  assert.match(generateComponentTsx('tabs', settings), /A custom second panel\./)
})

test('all eleven component types produce scoped HTML, CSS, and parseable, type-checked TSX', () => {
  const settings = createSettings()
  const tempParent = path.resolve('node_modules/.tmp')
  mkdirSync(tempParent, { recursive: true })
  const tempRoot = mkdtempSync(path.join(tempParent, 'interface-lab-tsx-'))
  const generatedFiles = []

  try {
    for (const component of components) {
      const html = generateComponentHtml(component, settings)
      const css = generateComponentCss(component, settings)
      const tsx = generateComponentTsx(component, settings)
      assert.match(html, new RegExp(exportClasses[component]))
      assert.match(css, new RegExp(exportClasses[component]))
      assert.match(tsx, new RegExp(exportClasses[component]))
      assert.doesNotMatch(html, />(?:undefined|null)</)

      const fileName = path.join(tempRoot, `${component}.tsx`)
      writeFileSync(fileName, tsx)
      generatedFiles.push(fileName)
    }

    const tsconfig = path.join(tempRoot, 'tsconfig.json')
    writeFileSync(tsconfig, JSON.stringify({
      compilerOptions: {
        target: 'ES2023', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx',
        strict: true, skipLibCheck: true, noEmit: true, types: ['react', 'react-dom'],
      },
      files: generatedFiles,
    }, null, 2))
    const tscPath = path.resolve('node_modules/typescript/bin/tsc')
    const typeCheck = spawnSync(process.execPath, [tscPath, '--project', tsconfig], { encoding: 'utf8' })
    assert.equal(typeCheck.status, 0, `${typeCheck.stdout}${typeCheck.stderr}`)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('component configuration changes update only their own generated output', () => {
  const settings = createSettings()
  settings.button.text = 'A custom button'
  settings.select.options = ['Workspace A']
  settings.select.value = 'Workspace A'
  settings.slider = { min: -10, max: 50, value: 27, accent: '#4a80d8', previewState: 'default' }
  settings.tabs = { labels: ['Overview', ''], activeIndex: 1, previewState: 'default' }

  assert.match(generateComponentHtml('button', settings), />A custom button<\/button>/)
  assert.doesNotMatch(generateComponentHtml('button', settings), /Workspace A/)
  assert.match(generateComponentHtml('select', settings), /Workspace A/)
  assert.match(generateComponentCss('button', { ...settings, button: { ...settings.button, radius: 23 } }), /border-radius:\s*23px/)
  assert.match(generateComponentCss('slider', settings), /#4a80d8/)
  assert.match(generateComponentHtml('slider', settings), /min="-10" max="50" value="27"/)
  assert.deepEqual(getSafeTabsLabels(['Overview', '']), ['Overview', 'Tab 2'])
  assert.match(generateComponentHtml('tabs', settings), /Tab 2/)
  assert.match(generateComponentTsx('tabs', settings), /Tab 2/)
})

test('Theme Studio appearance previews use the applied mode palettes', () => {
  const tokens = {
    colors: {
      dark: { background: '#121827', surface: '#20293b', border: '#71809a', text: '#f0f2f7', textMuted: '#aab4c7' },
      light: { background: '#f7f1e8', surface: '#fffaf2', border: '#b8a995', text: '#252431', textMuted: '#5e5d6a' },
    },
  }

  assert.deepEqual(getAppearancePreviewVariables(tokens, 'dark'), {
    '--appearance-preview-canvas': '#121827',
    '--appearance-preview-surface': '#20293b',
    '--appearance-preview-border': '#71809a',
    '--appearance-preview-text': '#f0f2f7',
    '--appearance-preview-muted': '#aab4c7',
  })
  assert.deepEqual(getAppearancePreviewVariables(tokens, 'light'), {
    '--appearance-preview-canvas': '#f7f1e8',
    '--appearance-preview-surface': '#fffaf2',
    '--appearance-preview-border': '#b8a995',
    '--appearance-preview-text': '#252431',
    '--appearance-preview-muted': '#5e5d6a',
  })
})

test('font catalog entries include family, category, source, license, and real weight metadata', () => {
  assert.deepEqual(FONT_CATALOG.map((font) => font.name), ['Inter', 'DM Sans', 'Manrope'])
  for (const font of FONT_CATALOG) {
    assert.ok(font.name)
    assert.ok(font.cssFamily.includes(font.name))
    assert.ok(font.source)
    assert.ok(font.licenseSource)
    assert.equal(font.license, 'SIL Open Font License 1.1')
    assert.ok(['self-hosted', 'existing-remote'].includes(font.assetStatus))
    if (font.weights.kind === 'static') assert.ok(font.weights.values.length > 0)
    else assert.ok(font.weights.min < font.weights.max)
  }
  assert.deepEqual(FONT_CATALOG.filter((font) => font.assetStatus === 'self-hosted').map((font) => font.id), ['inter', 'dm-sans'])
  assert.deepEqual(FONT_CATALOG.find((font) => font.id === 'manrope').weights, { kind: 'static', values: [400, 500, 600, 700] })
})

test('self-hosted catalog fonts map to licensed local variable font assets and CSS registrations', () => {
  const dmSansAsset = new URL('../public/fonts/dm-sans-variable.woff2', import.meta.url)
  const interAsset = new URL('../public/fonts/inter-variable.woff2', import.meta.url)
  const dmSansLicense = new URL('../public/fonts/OFL-DM-Sans.txt', import.meta.url)
  const interLicense = new URL('../public/fonts/OFL-Inter.txt', import.meta.url)
  const globalStyles = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

  assert.ok(existsSync(dmSansAsset))
  assert.ok(existsSync(interAsset))
  assert.match(readFileSync(dmSansLicense, 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/)
  assert.match(readFileSync(interLicense, 'utf8'), /Copyright \(c\) 2016 The Inter Project Authors/)
  assert.match(globalStyles, /font-family:\s*'DM Sans'[\s\S]*?url\('\/fonts\/dm-sans-variable\.woff2'\)/)
  assert.match(globalStyles, /font-family:\s*'Inter'[\s\S]*?url\('\/fonts\/inter-variable\.woff2'\)/)
  assert.match(globalStyles, /fonts\.googleapis\.com\/css2\?family=Manrope:wght@400;500;600;700/)
})

test('font search and category filtering return the expected catalog entries', () => {
  assert.deepEqual(searchFonts('inter'), [FONT_CATALOG.find((font) => font.id === 'inter')])
  assert.ok(searchFonts('', 'sans-serif').every((font) => font.category === 'sans-serif'))
  assert.deepEqual(searchFonts('', 'serif'), [])
  assert.deepEqual(searchFonts('', 'monospace'), [])
  assert.deepEqual(searchFonts('not a font'), [])
})

test('Body and Display font selections update independently and preserve typography settings', () => {
  const tokens = { typography: { fontBody: 'Existing Body, sans-serif', fontDisplay: 'Existing Display, serif', sizeMd: 17, weightNormal: 400, weightMedium: 550, weightStrong: 650, lineHeightBody: 1.6 } }
  const bodyFont = findFontByStack(FONT_CATALOG.find((font) => font.id === 'inter').cssFamily)
  const afterBody = updateTypographyFont(tokens, 'body', bodyFont.cssFamily)
  assert.equal(afterBody.typography.fontBody, bodyFont.cssFamily)
  assert.equal(afterBody.typography.fontDisplay, tokens.typography.fontDisplay)
  assert.equal(afterBody.typography.sizeMd, 17)

  const manropeFont = FONT_CATALOG.find((font) => font.id === 'manrope')
  const afterDisplay = updateTypographyFont(afterBody, 'display', manropeFont.cssFamily)
  assert.equal(afterDisplay.typography.fontDisplay, manropeFont.cssFamily)
  assert.equal(afterDisplay.typography.fontBody, bodyFont.cssFamily)
  assert.equal(afterDisplay.typography.weightMedium, 550)
  assert.equal(afterDisplay.typography.lineHeightBody, 1.6)
})

test('unsupported font weights are clamped to the nearest available face', () => {
  const staticAvailability = { kind: 'static', values: [400, 700] }
  assert.equal(nearestSupportedWeight(550, staticAvailability), 400)
  assert.equal(nearestSupportedWeight(720, staticAvailability), 700)
  assert.equal(nearestSupportedWeight(900, { kind: 'variable', min: 200, max: 800 }), 800)

  const tokens = { typography: { weightNormal: 300, weightMedium: 550, weightStrong: 900, fontBody: 'body', fontDisplay: 'display' } }
  const adjusted = adjustTypographyWeights(tokens, staticAvailability)
  assert.deepEqual([adjusted.typography.weightNormal, adjusted.typography.weightMedium, adjusted.typography.weightStrong], [400, 400, 700])
  assert.equal(adjusted.typography.fontBody, 'body')
  assert.equal(adjusted.typography.fontDisplay, 'display')
})

test('custom font file validation accepts supported extensions and compatible MIME types', () => {
  assert.deepEqual(validateFontFile({ name: 'studio.woff2', type: 'font/woff2', size: 1024 }), { ok: true, format: 'woff2' })
  assert.deepEqual(validateFontFile({ name: 'studio.woff', type: 'font/woff', size: 1024 }), { ok: true, format: 'woff' })
  assert.deepEqual(validateFontFile({ name: 'studio.ttf', type: 'application/octet-stream', size: 1024 }), { ok: true, format: 'ttf' })
  assert.deepEqual(validateFontFile({ name: 'studio.otf', type: 'font/otf', size: 1024 }), { ok: true, format: 'otf' })
  assert.equal(validateFontFile({ name: 'image.png', type: 'image/png', size: 1024 }).ok, false)
  assert.equal(validateFontFile({ name: 'studio.otf', type: 'font/woff', size: 1024 }).ok, false)
  assert.equal(validateFontSignature(new Uint8Array([0x77, 0x4f, 0x46, 0x32]), 'woff2'), true)
  assert.equal(validateFontSignature(new Uint8Array([0x77, 0x4f, 0x46, 0x46]), 'woff'), true)
  assert.equal(validateFontSignature(new Uint8Array([0, 1, 0, 0]), 'ttf'), true)
  assert.equal(validateFontSignature(new Uint8Array([0x4f, 0x54, 0x54, 0x4f]), 'otf'), true)
  assert.equal(validateFontSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 'woff2'), false)
})

test('custom font validation enforces the 10 MB limit and rejects empty files', () => {
  assert.equal(validateFontFile({ name: 'large.woff2', type: '', size: 10 * 1024 * 1024 }).ok, true)
  assert.match(validateFontFile({ name: 'too-large.woff2', type: '', size: 10 * 1024 * 1024 + 1 }).message, /10 MB/)
  assert.match(validateFontFile({ name: 'empty.ttf', type: '', size: 0 }).message, /empty/)
})

test('font metadata extraction reads actual family, style and variable weight axes from SFNT tables', async () => {
  const stringBytes = (text) => Uint8Array.from([...text].flatMap((character) => [0, character.charCodeAt(0)]))
  const family = stringBytes('Kite Sans')
  const style = stringBytes('Regular')
  const name = new Uint8Array(30 + family.length + style.length)
  const nameView = new DataView(name.buffer)
  nameView.setUint16(0, 0)
  nameView.setUint16(2, 2)
  nameView.setUint16(4, 30)
  for (const [index, nameId, text, textOffset] of [[0, 1, family, 0], [1, 2, style, family.length]]) {
    const offset = 6 + index * 12
    nameView.setUint16(offset, 3)
    nameView.setUint16(offset + 2, 1)
    nameView.setUint16(offset + 4, 0x409)
    nameView.setUint16(offset + 6, nameId)
    nameView.setUint16(offset + 8, text.length)
    nameView.setUint16(offset + 10, textOffset)
    name.set(text, 30 + textOffset)
  }
  const os2 = new Uint8Array(6)
  new DataView(os2.buffer).setUint16(4, 400)
  const fvar = new Uint8Array(36)
  const fvarView = new DataView(fvar.buffer)
  fvarView.setUint16(4, 16)
  fvarView.setUint16(8, 1)
  fvarView.setUint16(10, 20)
  fvar.set([119, 103, 104, 116], 16)
  fvarView.setInt32(20, 100 * 65536)
  fvarView.setInt32(24, 400 * 65536)
  fvarView.setInt32(28, 900 * 65536)
  const tables = new Map([['name', name], ['OS/2', os2], ['fvar', fvar]])
  const tableCount = tables.size
  let tableOffset = 12 + tableCount * 16
  const sfnt = new Uint8Array(tableOffset + [...tables.values()].reduce((sum, table) => sum + table.length + (table.length % 4), 0))
  const view = new DataView(sfnt.buffer)
  sfnt.set([0, 1, 0, 0])
  view.setUint16(4, tableCount)
  let index = 0
  for (const [tag, table] of tables) {
    const recordOffset = 12 + index * 16
    sfnt.set([...tag].map((character) => character.charCodeAt(0)), recordOffset)
    view.setUint32(recordOffset + 8, tableOffset)
    view.setUint32(recordOffset + 12, table.length)
    sfnt.set(table, tableOffset)
    tableOffset += table.length + (table.length % 4)
    index += 1
  }

  const metadata = await extractFontMetadata(sfnt.buffer, 'ttf')
  assert.deepEqual(metadata, { family: 'Kite Sans', style: 'normal', weights: { kind: 'variable', min: 100, max: 900 } })
})

test('custom font duplicate fingerprints are detected without relying on filenames', async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]).buffer
  const first = await createFontFingerprint(bytes, { name: 'first.ttf', type: '', size: 4 })
  const sameBytes = await createFontFingerprint(bytes.slice(0), { name: 'renamed.otf', type: '', size: 4 })
  assert.equal(first, sameBytes)
  assert.equal(hasDuplicateFingerprint(sameBytes, [first]), true)
  assert.equal(hasDuplicateFingerprint('different', [first]), false)
})

test('custom font CSS family escaping and usage checks preserve safely quoted names', () => {
  const cssFamily = makeCustomCssFamily('Studio "Display"')
  assert.equal(cssFamily, '"Studio \\"Display\\"", "DM Sans", sans-serif')
  assert.equal(fontStackUsesFamily(cssFamily, 'Studio "Display"'), true)
  assert.equal(fontStackUsesFamily('Inter, "Studio Display", sans-serif', 'Studio Display'), true)
  assert.equal(fontStackUsesFamily('Inter, "DM Sans", sans-serif', 'Studio Display'), false)
})

test('unsupported WOFF2 metadata parsing is reported as unavailable for manual entry', async () => {
  const woff2 = Uint8Array.from([0x77, 0x4f, 0x46, 0x32]).buffer
  assert.equal(await extractFontMetadata(woff2, 'woff2'), null)
  assert.equal(validateFontFile({ name: 'custom.woff2', type: 'font/woff2', size: 4 }).format, 'woff2')
})

test('custom font storage fails gracefully when IndexedDB is unavailable', async () => {
  await assert.rejects(loadStoredCustomFonts(), /not available/)
})

test('variable font exports preserve the real continuous range and font-display behavior', async () => {
  const tokens = structuredClone(defaultDesignTokens)
  const font = FONT_CATALOG.find((entry) => entry.id === 'inter')
  tokens.typography.fontBody = font.cssFamily
  let requests = 0
  const css = await generateTypographyFontCss(tokens.typography, [font], [], async () => {
    requests += 1
    return new Blob([new Uint8Array([0, 1, 2, 3])])
  })

  assert.equal(requests, 1)
  assert.match(css, /font-weight: 100 900;/)
  assert.match(css, /font-display: swap;/)
  assert.match(css, /format\("woff2"\)/)
  assert.doesNotMatch(css, /font-weight: 400;/)
})

test('static uploaded font export uses only its declared weight and safely embeds its asset', async () => {
  const tokens = structuredClone(defaultDesignTokens)
  const custom = {
    id: 'custom-studio', name: 'Studio Sans', category: 'custom',
    cssFamily: '"Studio Sans", "DM Sans", sans-serif', weights: { kind: 'static', values: [600] },
    source: 'IndexedDB custom upload', assetStatus: 'custom', customFontId: 'studio-id', style: 'normal',
  }
  tokens.typography.fontBody = custom.cssFamily
  const css = await generateTypographyFontCss(tokens.typography, [custom], [{
    loaded: true,
    record: { id: 'studio-id', family: 'Studio Sans', fileName: 'Studio */ Sans.woff2', format: 'woff2', style: 'normal', weights: custom.weights, blob: new Blob([new Uint8Array([1, 2, 3])]) },
  }])

  assert.match(css, /font-family: "Studio Sans";/)
  assert.match(css, /font-weight: 600;/)
  assert.match(css, /data:font\/woff2;base64,AQID/)
  assert.match(css, /Font asset: Studio \* \/ Sans\.woff2/)
  assert.doesNotMatch(css, /url\("IndexedDB custom upload/)
})

test('font CSS deduplicates a selected font used by Body and Display', async () => {
  const tokens = structuredClone(defaultDesignTokens)
  tokens.typography.fontDisplay = tokens.typography.fontBody
  let requests = 0
  const css = await generateTypographyFontCss(tokens.typography, [FONT_CATALOG[1]], [], async () => {
    requests += 1
    return new Blob([new Uint8Array([1])])
  })
  assert.equal(requests, 1)
  assert.equal((css.match(/@font-face/g) ?? []).length, 1)
})

test('missing selected uploaded font assets fail export instead of emitting broken URLs', async () => {
  const tokens = structuredClone(defaultDesignTokens)
  const custom = {
    id: 'custom-studio', name: 'Studio Sans', category: 'custom', cssFamily: '"Studio Sans", "DM Sans", sans-serif',
    weights: { kind: 'static', values: [400] }, source: 'IndexedDB custom upload', assetStatus: 'custom', customFontId: 'missing-id', style: 'normal',
  }
  tokens.typography.fontDisplay = custom.cssFamily
  await assert.rejects(generateTypographyFontCss(tokens.typography, [custom], []), /selected custom font.*unavailable/i)
})

test('Body and Display token updates stay independent and CSS preserves their fallback stacks', () => {
  const original = structuredClone(defaultDesignTokens)
  const bodyOnly = updateTypographyFont(original, 'body', FONT_CATALOG[0].cssFamily)
  assert.equal(bodyOnly.typography.fontBody, FONT_CATALOG[0].cssFamily)
  assert.equal(bodyOnly.typography.fontDisplay, original.typography.fontDisplay)
  const css = designTokensToCss(bodyOnly, 'dark', '#a997f5')
  assert.match(css, /--font-body: 'Inter', 'DM Sans', ui-sans-serif, system-ui, sans-serif;/)
  assert.match(css, /--font-display: 'Manrope', 'DM Sans', ui-sans-serif, system-ui, sans-serif;/)
  assert.match(css, /:where\(body\)[\s\S]*font-family: var\(--font-body\)/)
  assert.match(css, /:where\(h1, h2, h3, h4, h5, h6\)[\s\S]*font-family: var\(--font-display\)/)
})

test('Playground HTML, TSX and CSS remain compatible with exported typography tokens', () => {
  const settings = createSettings()
  const tokenCss = designTokensToCss(defaultDesignTokens, 'dark', '#a997f5')
  const componentCss = generateComponentCss('modal', settings)
  const componentHtml = generateComponentHtml('modal', settings)
  const componentTsx = generateComponentTsx('modal', settings)
  assert.match(tokenCss, /--font-display:/)
  assert.match(componentCss, /font-family: var\(--font-display, sans-serif\)/)
  assert.match(componentHtml, /class="il-export-modal__title"/)
  assert.match(componentTsx, /il-export-modal__title/)
})

test('remote font export is explicit and static weight normalization stays within available choices', async () => {
  const tokens = structuredClone(defaultDesignTokens)
  tokens.typography.fontBody = FONT_CATALOG.find((entry) => entry.id === 'manrope').cssFamily
  const css = await generateTypographyFontCss(tokens.typography, FONT_CATALOG, [], async () => new Blob([new Uint8Array([1])]))
  assert.match(css, /@import url\("https:\/\/fonts\.googleapis\.com\/css2\?family=Manrope/)
  assert.equal(nearestSupportedWeight(650, { kind: 'static', values: [400, 500, 700] }), 700)
})

test('static fonts with no shared weight range are identified instead of silently inventing weights', () => {
  const body = { id: 'body-static', name: 'Body Static', cssFamily: '"Body Static", sans-serif', weights: { kind: 'static', values: [400] } }
  const display = { id: 'display-static', name: 'Display Static', cssFamily: '"Display Static", sans-serif', weights: { kind: 'static', values: [700] } }
  const domain = getFontWeightDomain(body.cssFamily, display.cssFamily, [body, display])
  assert.equal(domain.compatible, false)
})

test('Overview headline sequence is curated, deterministic, and wraps to its first phrase', () => {
  assert.equal(overviewHeadlines.length, 8)
  assert.equal(overviewHeadlines[0], 'Let’s make something.')
  assert.equal(getNextOverviewHeadlineIndex(0), 1)
  assert.equal(getNextOverviewHeadlineIndex(overviewHeadlines.length - 1), 0)
})

test('interactive text selection and carets use the active workspace accent while the token preview stays scoped', () => {
  const globalCss = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  const appCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
  const fontPickerCss = readFileSync(new URL('../src/features/tokens/FontPicker.css', import.meta.url), 'utf8')
  const tokenCss = readFileSync(new URL('../src/features/tokens/TokenStudio.css', import.meta.url), 'utf8')

  assert.match(globalCss, /::selection\s*\{[^}]*background:\s*var\(--color-accent-soft\)/)
  assert.match(globalCss, /caret-color:\s*var\(--color-accent\)/)
  assert.doesNotMatch(appCss, /\.field-demo > input:focus[^}]*rgb\(169 151 245/)
  assert.match(appCss, /\.field-demo > input:focus[^}]*var\(--color-accent-border\)/)
  assert.match(fontPickerCss, /\.font-picker-search-wrap:focus-within[^}]*var\(--color-accent-soft\)/)
  assert.match(fontPickerCss, /\.font-picker-custom input:focus[^}]*var\(--color-accent-border\)/)
  assert.match(tokenCss, /\.token-preview ::selection[^}]*var\(--preview-color-accent-soft\)/)
})

test('separate uploaded static files for one family combine only their declared weights', () => {
  const stack = '"Studio Family", "DM Sans", sans-serif'
  const familyFiles = [400, 700].map((weight) => ({
    id: `studio-${weight}`, name: 'Studio Family', cssFamily: stack, assetStatus: 'custom',
    weights: { kind: 'static', values: [weight] },
  }))
  const domain = getFontWeightDomain(stack, stack, familyFiles)
  assert.deepEqual(domain.values, [400, 700])
  assert.equal(domain.compatible, true)
})
