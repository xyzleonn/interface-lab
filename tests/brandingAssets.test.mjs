import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

test('sidebar and browser metadata reference the supplied branding images', () => {
  const app = readFileSync('src/App.tsx', 'utf8')
  const css = readFileSync('src/App.css', 'utf8')
  const html = readFileSync('index.html', 'utf8')

  assert.ok(existsSync('public/assets/interface-lab-logo.png.png'))
  assert.ok(existsSync('public/assets/interface-lab-favicon.png.png'))
  assert.match(app, /className="brand-mark" src="\/assets\/interface-lab-logo\.png\.png"/)
  assert.match(css, /\.brand-mark\s*\{[^}]*object-fit:\s*contain/s)
  assert.match(html, /rel="icon" type="image\/png"[^>]*interface-lab-favicon\.png\.png/)
  assert.doesNotMatch(html, /rel="icon"[^>]*favicon\.svg/)
})
