import type { CSSProperties } from 'react'
import type { ComponentKind, EditorSettings } from './editorTypes'

export function getButtonStyle(button: EditorSettings['button']): CSSProperties {
  const sizes = { small: 34, medium: 42, large: 50 }
  return { minHeight: sizes[button.size], borderRadius: button.radius, paddingInline: button.padding, fontSize: button.fontSize }
}

export function getCardShadow(shadowValue: number) {
  const shadow = Math.min(100, Math.max(0, shadowValue)) / 100
  return `0 18px 50px rgb(0 0 0 / ${shadow * 0.36}), 0 4px 12px rgb(0 0 0 / ${shadow * 0.18})`
}

export function getCardStyle(card: EditorSettings['card']): CSSProperties {
  return { borderRadius: card.radius, padding: card.padding, borderColor: card.borderVisible ? undefined : 'transparent', boxShadow: getCardShadow(card.shadow) }
}

export function getInputStyle(input: EditorSettings['input']): CSSProperties {
  const sizes = { small: 36, medium: 44, large: 52 }
  return { borderRadius: input.radius, height: sizes[input.size], fontSize: 14 }
}

export type TogglePreviewStyle = CSSProperties & {
  '--toggle-width': string
  '--toggle-height': string
  '--toggle-thumb-size': string
  '--toggle-travel': string
  '--toggle-accent': string
}

export function getToggleStyle(toggle: EditorSettings['toggle']): TogglePreviewStyle {
  return {
    '--toggle-width': `${toggle.size * 1.8}px`,
    '--toggle-height': `${toggle.size}px`,
    '--toggle-thumb-size': `${Math.max(14, toggle.size - 6)}px`,
    '--toggle-travel': `${toggle.size * 0.8}px`,
    '--toggle-accent': toggle.accent,
  }
}

function safeComment(value: string) {
  return value.replaceAll('*/', '* /').replaceAll('\n', ' ').replaceAll('\r', ' ')
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function serializeStyle(style: CSSProperties) {
  return Object.entries(style)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([property, value]) => `${property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${value}${typeof value === 'number' && property !== 'opacity' && property !== 'zIndex' ? 'px' : ''}`)
    .join(';')
}

function safeNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

function getButtonCss(button: EditorSettings['button']) {
  const style = getButtonStyle(button)
  return `.il-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: ${style.minHeight}px;
  padding-inline: ${style.paddingInline}px;
  border: 1px solid transparent;
  border-radius: ${style.borderRadius}px;
  font: inherit;
  font-size: ${style.fontSize}px;
  cursor: pointer;
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.il-button--primary {
  border-color: var(--color-accent-border, rgb(169 151 245 / 48%));
  background: var(--color-accent, #a997f5);
  color: var(--color-accent-contrast, #191722);
  box-shadow: 0 10px 28px var(--color-accent-glow, rgb(143 122 224 / 24%)), inset 0 1px rgb(255 255 255 / 22%);
}
.il-button--secondary { border-color: var(--color-border, rgb(227 225 245 / 12%)); background: rgb(255 255 255 / 5%); color: var(--color-text, #dedce8); }
.il-button--ghost { background: transparent; color: var(--color-text-muted, #aaa7b7); }
.il-button:hover:not(:disabled) { transform: translateY(-2px); }
.il-button--primary:hover:not(:disabled) { background: var(--color-accent-hover, #baabf7); }
.il-button--secondary:hover:not(:disabled) { border-color: var(--color-accent-border); background: var(--color-accent-soft); }
.il-button--ghost:hover:not(:disabled) { background: rgb(255 255 255 / 5%); }
.il-button:active:not(:disabled) { transform: translateY(0) scale(.97); }
.il-button:disabled { opacity: .5; cursor: not-allowed;}`
}

function getCardCss(card: EditorSettings['card']) {
  const style = getCardStyle(card)
  return `.il-card {
  width: min(100%, 365px);
  padding: ${style.padding}px;
  border: 1px solid ${card.borderVisible ? 'var(--color-border, rgb(228 226 245 / 9%))' : 'transparent'};
  border-radius: ${style.borderRadius}px;
  background: var(--color-surface-raised, #1d1e28);
  box-shadow: ${style.boxShadow};
  color: var(--color-text, #e9e8ef);
  transition: transform 240ms ease, box-shadow 240ms ease;
}
.il-card h3 { margin: 14px 0 0; font-size: 19px; font-weight: 530; letter-spacing: -.035em; }
.il-card p { max-width: 270px; margin: 8px 0 0; color: var(--color-text-muted, #92929f); font-size: 11px; line-height: 1.7; }
.il-card__eyebrow { color: var(--color-accent, #a997f5); font-size: 9px; font-weight: 700; letter-spacing: .12em; }
.il-card__link { display: inline-flex; gap: 7px; margin-top: 18px; color: var(--color-accent, #a997f5); font-size: 10px; }
.il-card:hover { transform: translateY(-2px);}`
}

function getInputCss(input: EditorSettings['input']) {
  const style = getInputStyle(input)
  return `.il-input {
  width: min(100%, 350px);
  height: ${style.height}px;
  padding: 0 13px;
  border: 1px solid var(--color-border, rgb(228 226 245 / 9%));
  border-radius: ${style.borderRadius}px;
  outline: none;
  background: var(--color-surface, #171820);
  color: var(--color-text, #e9e8ef);
  font: inherit;
  font-size: ${style.fontSize}px;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.il-input:focus { border-color: var(--color-accent-border, #a997f5); box-shadow: 0 0 0 3px var(--color-accent-soft, rgb(169 151 245 / 14%)); }
.il-input::placeholder { color: var(--color-text-dim, #737480); }
.il-input:disabled { opacity: .55; cursor: not-allowed;}
.il-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;}`
}

function getToggleCss(toggle: EditorSettings['toggle']) {
  const style = getToggleStyle(toggle)
  return `.il-toggle {
  --toggle-width: ${style['--toggle-width']};
  --toggle-height: ${style['--toggle-height']};
  --toggle-thumb-size: ${style['--toggle-thumb-size']};
  --toggle-travel: ${style['--toggle-travel']};
  --toggle-accent: ${toggle.accent};
  display: inline-flex;
  align-items: center;
  width: var(--toggle-width);
  height: var(--toggle-height);
  padding: 2px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 999px;
  background: #30313a;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;
}
.il-toggle > span { width: var(--il-toggle-thumb-size); height: var(--il-toggle-thumb-size); border-radius: 50%; background: #a2a1ad; transition: transform 160ms ease; }
.il-toggle[aria-checked="true"] { border-color: var(--toggle-accent); background: var(--toggle-accent); }
.il-toggle[aria-checked="true"] > span { background: #fff; transform: translateX(var(--toggle-travel)); }
.il-toggle:focus-visible { outline: 2px solid var(--toggle-accent); outline-offset: 3px;}`
}

function getSliderCss(slider: EditorSettings['slider']) {
  return `.il-slider {
  display: grid;
  gap: 19px;
  width: min(100%, 350px);
  padding: 20px;
  border: 1px solid var(--color-border, rgb(228 226 245 / 9%));
  border-radius: 12px;
  background: var(--color-surface, #171820);
}
.il-slider > span { display: flex; align-items: center; justify-content: space-between; color: var(--color-text, #d9d7e2); font-size: 14px; }
.il-slider output { color: ${slider.accent}; font-variant-numeric: tabular-nums; }
.il-slider input[type="range"] { width: 100%; accent-color: ${slider.accent}; cursor: pointer; }
.il-slider > small { display: flex; justify-content: space-between; color: var(--color-text-muted, #777885);}`
}

export function generateComponentCss(component: ComponentKind, settings: EditorSettings) {
  switch (component) {
    case 'button': return `/* Button text: "${safeComment(settings.button.text)}" */\n${getButtonCss(settings.button)}`
    case 'card': return getCardCss(settings.card)
    case 'input': return `/* Placeholder: "${safeComment(settings.input.placeholder)}" */\n${getInputCss(settings.input)}`
    case 'toggle': return `/* Initial state: ${settings.toggle.defaultOn ? 'on' : 'off'} */\n${getToggleCss(settings.toggle)}`
    case 'slider': return `/* Range: min ${safeNumber(settings.slider.min, 0)}, max ${safeNumber(settings.slider.max, 100)}, initial ${safeNumber(settings.slider.value, 0)} */\n${getSliderCss(settings.slider)}`
  }
}

export function generateComponentHtml(component: ComponentKind, settings: EditorSettings) {
  switch (component) {
    case 'button': {
      const button = settings.button
      return `<button class="il-button il-button--${button.variant}" type="button" style="${escapeHtml(serializeStyle(getButtonStyle(button)))}">${escapeHtml(button.text || 'Button')}</button>`
    }
    case 'card':
      return `<article class="il-card" aria-labelledby="il-card-title" style="${escapeHtml(serializeStyle(getCardStyle(settings.card)))}">\n  <span class="il-card__eyebrow">A SMALL MOMENT</span>\n  <h3 id="il-card-title">Room for a good idea.</h3>\n  <p>A simple card can make a little space for something worth noticing.</p>\n  <a class="il-card__link" href="#">Take a look <span aria-hidden="true">↗</span></a>\n</article>`
    case 'input':
      return `<label class="il-field">\n  <span class="il-sr-only">${escapeHtml(settings.input.placeholder || 'Text input')}</span>\n  <input class="il-input" type="text" placeholder="${escapeHtml(settings.input.placeholder)}"${settings.input.disabled ? ' disabled' : ''} style="${escapeHtml(serializeStyle(getInputStyle(settings.input)))}" />\n</label>`
    case 'toggle':
      return `<button class="il-toggle" type="button" role="switch" aria-label="Toggle setting" aria-checked="${settings.toggle.defaultOn}" style="${escapeHtml(serializeStyle(getToggleStyle(settings.toggle)))}">\n  <span aria-hidden="true"></span>\n</button>`
    case 'slider': {
      const slider = settings.slider
      return `<label class="il-slider">\n  <span><strong>Value</strong><output>${safeNumber(slider.value, 0)}</output></span>\n  <input type="range" min="${safeNumber(slider.min, 0)}" max="${safeNumber(slider.max, 100)}" value="${safeNumber(slider.value, 0)}" aria-label="Value" style="accent-color:${escapeHtml(slider.accent)}" />\n  <small><span>${safeNumber(slider.min, 0)}</span><span>${safeNumber(slider.max, 100)}</span></small>\n</label>`
    }
  }
}

function tsxLiteral(value: string) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026')
}

export function generateComponentTsx(component: ComponentKind, settings: EditorSettings) {
  switch (component) {
    case 'button': {
      const button = settings.button
      const style = getButtonStyle(button)
      return `import type { CSSProperties } from 'react'\n\nexport interface ButtonProps {\n  text?: string\n  disabled?: boolean\n  onClick?: () => void\n}\n\nconst buttonStyle: CSSProperties = ${JSON.stringify(style, null, 2)}\n\nexport function Button({\n  text = ${tsxLiteral(button.text || 'Button')},\n  disabled = false,\n  onClick,\n}: ButtonProps) {\n  return (\n    <button\n      className="il-button il-button--${button.variant}"\n      type="button"\n      disabled={disabled}\n      onClick={onClick}\n      style={buttonStyle}\n    >\n      {text}\n    </button>\n  )\n}`
    }
    case 'card': {
      const style = getCardStyle(settings.card)
      return `import type { CSSProperties, ReactNode } from 'react'\n\nexport interface CardProps {\n  children?: ReactNode\n}\n\nconst cardStyle: CSSProperties = ${JSON.stringify(style, null, 2)}\n\nexport function Card({ children }: CardProps) {\n  return (\n    <article className="il-card" style={cardStyle}>\n      <span className="il-card__eyebrow">A SMALL MOMENT</span>\n      <h3>Room for a good idea.</h3>\n      <p>A simple card can make a little space for something worth noticing.</p>\n      {children}\n    </article>\n  )\n}`
    }
    case 'input': {
      const input = settings.input
      const style = getInputStyle(input)
      return `import type { CSSProperties, ChangeEvent } from 'react'\n\nexport interface InputProps {\n  value?: string\n  disabled?: boolean\n  onChange?: (value: string) => void\n}\n\nconst inputStyle: CSSProperties = ${JSON.stringify(style, null, 2)}\n\nexport function Input({\n  value,\n  disabled = ${input.disabled},\n  onChange,\n}: InputProps) {\n  function handleChange(event: ChangeEvent<HTMLInputElement>) {\n    onChange?.(event.target.value)\n  }\n\n  return (\n    <label className="il-field">\n      <span className="il-sr-only">${tsxLiteral(input.placeholder || 'Text input')}</span>\n      <input\n        className="il-input"\n        type="text"\n        placeholder=${tsxLiteral(input.placeholder)}\n        value={value}\n        disabled={disabled}\n        onChange={handleChange}\n        style={inputStyle}\n      />\n    </label>\n  )\n}`
    }
    case 'toggle': {
      const toggle = settings.toggle
      const style = getToggleStyle(toggle)
      return `import type { CSSProperties } from 'react'\n\ntype ToggleStyle = CSSProperties & {\n  '--toggle-width': string\n  '--toggle-height': string\n  '--toggle-thumb-size': string\n  '--toggle-travel': string\n  '--toggle-accent': string\n}\n\nexport interface ToggleProps {\n  checked?: boolean\n  onChange?: (checked: boolean) => void\n}\n\nconst toggleStyle: ToggleStyle = ${JSON.stringify(style, null, 2)}\n\nexport function Toggle({\n  checked = ${toggle.defaultOn},\n  onChange,\n}: ToggleProps) {\n  return (\n    <button\n      className="il-toggle"\n      type="button"\n      role="switch"\n      aria-label="Toggle setting"\n      aria-checked={checked}\n      onClick={() => onChange?.(!checked)}\n      style={toggleStyle}\n    >\n      <span aria-hidden="true" />\n    </button>\n  )\n}`
    }
    case 'slider': {
      const slider = settings.slider
      return `import type { ChangeEvent } from 'react'\n\nexport interface SliderProps {\n  value?: number\n  onValueChange?: (value: number) => void\n}\n\nexport function Slider({\n  value = ${safeNumber(slider.value, 0)},\n  onValueChange,\n}: SliderProps) {\n  function handleChange(event: ChangeEvent<HTMLInputElement>) {\n    onValueChange?.(Number(event.target.value))\n  }\n\n  return (\n    <label className="il-slider">\n      <span><strong>Value</strong><output>{value}</output></span>\n      <input\n        type="range"\n        min={${safeNumber(slider.min, 0)}}\n        max={${safeNumber(slider.max, 100)}}\n        value={value}\n        aria-label="Value"\n        onChange={handleChange}\n      />\n      <small><span>${safeNumber(slider.min, 0)}</span><span>${safeNumber(slider.max, 100)}</span></small>\n    </label>\n  )\n}`
    }
  }
}
