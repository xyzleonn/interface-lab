import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { generateComponentCss } from '../src/features/playground/componentExport.ts'
import { ACCENT_PRESETS, getAccentCssVariables } from '../src/utils/accent.ts'

test('applied accent variables are derived from each preset and custom color', () => {
  const colors = [...ACCENT_PRESETS.map(({ color }) => color), '#3267d5']

  for (const color of colors) {
    const variables = getAccentCssVariables(color)
    assert.equal(variables['--color-accent'], color)
    assert.match(variables['--color-accent-soft'], /^rgb\(\d+ \d+ \d+ \/ 14%\)$/)
    assert.match(variables['--color-accent-border'], /^rgb\(\d+ \d+ \d+ \/ 48%\)$/)
    assert.match(variables['--color-accent-glow'], /^rgb\(\d+ \d+ \d+ \/ 24%\)$/)
    assert.notEqual(variables['--color-accent-hover'], '#baabf7')
  }
})

test('heading gradient stops follow each active accent, including custom colors', () => {
  const colors = [...ACCENT_PRESETS.map(({ color }) => color), '#3267d5']

  for (const color of colors) {
    const variables = getAccentCssVariables(color)
    assert.match(variables['--color-accent-heading-start'], /^#[\da-f]{6}$/i)
    assert.match(variables['--color-accent-heading-end'], /^#[\da-f]{6}$/i)
    assert.notEqual(variables['--color-accent-heading-start'], '#9189a9')
    assert.notEqual(variables['--color-accent-heading-end'], '#9189a9')
  }

  const appCss = readFileSync('src/App.css', 'utf8')
  assert.match(appCss, /h1 span\s*\{[^}]*var\(--color-accent-heading-start\)[^}]*var\(--color-accent-heading-end\)[^}]*background-clip:\s*text/s)
  assert.doesNotMatch(appCss, /h1 span\s*\{[^}]*#9189a9/i)
  assert.doesNotMatch(readFileSync('src/features/tokens/TokenStudio.css', 'utf8'), /h1 span\s*\{[^}]*#9189a9/i)
  assert.doesNotMatch(readFileSync('src/features/playground/VisualComponentEditor.css', 'utf8'), /h1 span\s*\{[^}]*#9189a9/i)
})

test('live input focus styles use semantic applied accent variables', () => {
  const cssFiles = [
    'src/index.css',
    'src/App.css',
    'src/components/ui/ColorPickerField.css',
    'src/features/tokens/FontPicker.css',
    'src/features/tokens/TokenStudio.css',
    'src/features/playground/VisualComponentEditor.css',
  ]
  const source = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n')

  assert.match(source, /caret-color:\s*var\(--color-accent\)/)
  assert.match(source, /\.header-search-panel > input:focus[^}]*var\(--color-accent-border\)[^}]*var\(--color-accent-soft\)/)
  assert.match(source, /\.font-picker-custom input:focus[^}]*var\(--color-accent-border\)[^}]*var\(--color-accent-soft\)/)
  assert.match(source, /\.color-picker-hex:focus[^}]*var\(--color-accent-border\)[^}]*var\(--color-accent-soft\)/)
  assert.doesNotMatch(source, /(?:input|textarea)[^{]*:(?:focus|focus-visible)[^{]*\{[^}]*#a997f5/i)
})

test('exported input focus uses semantic variables without a lavender fallback', () => {
  const settings = {
    button: { variant: 'primary', size: 'medium', radius: 8, padding: 16, fontSize: 14, text: 'Button' },
    card: { radius: 12, padding: 20, shadow: 24, borderVisible: true },
    input: { placeholder: 'Email', radius: 8, size: 'medium', disabled: false },
    toggle: { size: 22, accent: '#3267d5', defaultOn: false },
    slider: { min: 0, max: 100, value: 50, accent: '#3267d5' },
    badge: { text: 'New', variant: 'subtle', color: 'primary', size: 'medium', showDot: false },
    alert: { variant: 'info', title: 'Heads up', description: 'New features are ready.', dismissible: true },
    select: { label: 'Choose', placeholder: 'Select', options: [], value: '', disabled: false },
    modal: { triggerText: 'Open', title: 'Title', description: 'Description', size: 'medium' },
    tooltip: { triggerText: 'More', content: 'Details', placement: 'top' },
    tabs: { labels: ['One', 'Two'], contents: ['First content', 'Second content'], activeIndex: 0 },
  }
  const css = generateComponentCss('input', settings)
  const focusRule = css.match(/\.il-export-input:focus\s*\{[^}]+\}/)?.[0]

  assert.ok(focusRule)
  assert.match(focusRule, /var\(--color-accent-border\)/)
  assert.match(focusRule, /var\(--color-accent-soft\)/)
  assert.doesNotMatch(focusRule, /#a997f5|169 151 245/i)
})
