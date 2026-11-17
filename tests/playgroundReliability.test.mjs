import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test, { beforeEach } from 'node:test'
import { generateComponentCss, generateComponentHtml, generateComponentTsx, getSafeTabsLabels } from '../src/features/playground/componentExport.ts'
import { loadPresets, savePresets } from '../src/features/playground/presetStorage.ts'
import { getAppearancePreviewVariables } from '../src/features/tokens/appearancePreview.ts'

const components = ['button', 'card', 'input', 'toggle', 'slider', 'badge', 'select', 'modal', 'tooltip', 'tabs']
const exportClasses = {
  button: 'il-export-button', card: 'il-export-card', input: 'il-export-input',
  toggle: 'il-export-toggle', slider: 'il-export-slider', badge: 'il-export-badge',
  select: 'il-export-select', modal: 'il-export-modal', tooltip: 'il-export-tooltip', tabs: 'il-export-tabs',
}

function createSettings() {
  return {
    button: { variant: 'primary', size: 'medium', radius: 9, padding: 18, fontSize: 14, text: 'Create project' },
    card: { radius: 16, padding: 26, shadow: 34, borderVisible: true },
    input: { placeholder: 'Your email address', radius: 9, size: 'medium', disabled: false },
    toggle: { size: 22, accent: '#a997f5', defaultOn: true },
    slider: { min: 0, max: 100, value: 64, accent: '#a997f5' },
    badge: { text: 'New', variant: 'accent', size: 'medium', showDot: true },
    select: { label: 'Workspace', placeholder: 'Choose a workspace', options: ['Interface Lab', 'Personal'], value: 'Interface Lab', disabled: false },
    modal: { triggerText: 'Open dialog', title: 'A small moment', description: 'A focused space.', size: 'medium' },
    tooltip: { triggerText: 'Hover or focus me', content: 'A little context.', placement: 'top' },
    tabs: { labels: ['Overview', 'Activity', 'Settings'], activeIndex: 0 },
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
  settings.tabs = { labels: ['Overview', '', ' Settings '], activeIndex: 2 }
  const presets = [
    { id: 'select', name: 'Select setup', savedAt: Date.now(), component: 'select', properties: settings.select },
    { id: 'tabs', name: 'Tabs setup', savedAt: Date.now(), component: 'tabs', properties: settings.tabs },
  ]

  assert.equal(savePresets(presets), true)
  const restored = loadPresets()
  assert.deepEqual(restored[0].properties, settings.select)
  assert.deepEqual(restored[1].properties, settings.tabs)
})

test('HTML exports escape user-provided text and attributes', () => {
  const settings = createSettings()
  const hostile = `</script><img src=x onerror="alert('x')"> & */`
  settings.button.text = hostile
  settings.select = { ...settings.select, label: hostile, placeholder: hostile, options: [hostile], value: hostile }
  settings.modal = { ...settings.modal, title: hostile, description: hostile, triggerText: hostile }
  settings.tooltip = { ...settings.tooltip, triggerText: hostile, content: hostile }
  settings.tabs = { labels: [hostile, 'Second'], activeIndex: 0 }

  const buttonHtml = generateComponentHtml('button', settings)
  const selectHtml = generateComponentHtml('select', settings)
  const modalHtml = generateComponentHtml('modal', settings)
  const tooltipHtml = generateComponentHtml('tooltip', settings)
  const tabsHtml = generateComponentHtml('tabs', settings)
  for (const html of [buttonHtml, selectHtml, modalHtml, tooltipHtml, tabsHtml]) {
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
})

test('all ten component types produce scoped HTML, CSS, and parseable, type-checked TSX', () => {
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
  settings.slider = { min: -10, max: 50, value: 27, accent: '#4a80d8' }
  settings.tabs = { labels: ['Overview', ''], activeIndex: 1 }

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
