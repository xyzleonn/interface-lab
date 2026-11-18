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
  const size = boundedNumber(toggle.size, 16, 36, 22)
  return {
    '--toggle-width': `${size * 1.8}px`,
    '--toggle-height': `${size}px`,
    '--toggle-thumb-size': `${Math.max(14, size - 6)}px`,
    '--toggle-travel': `${size * 0.8}px`,
    '--toggle-accent': safeColor(toggle.accent, '#a997f5'),
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

function boundedNumber(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

function safeColor(value: string, fallback: string) {
  return /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value) ? value : fallback
}

export function getSafeTabsLabels(labels: unknown) {
  const source = Array.isArray(labels) ? labels.slice(0, 6) : []
  const normalized = source.map((label, index) => typeof label === 'string' && label.trim() ? label.trim() : `Tab ${index + 1}`)
  return normalized.length >= 2 ? normalized : ['Overview', 'Activity']
}

export function getSafeTabsContents(contents: unknown, labels: string[]) {
  const source = Array.isArray(contents) ? contents : []
  return labels.map((label, index) => typeof source[index] === 'string' ? source[index] : `This panel is showing the ${label} view.`)
}

function safeTabIndex(value: number, length: number) {
  const index = Number.isFinite(value) ? Math.trunc(value) : 0
  return Math.max(0, Math.min(length - 1, index))
}

function getBadgeCss() {
  return `.il-export-badge { --badge-color: var(--color-text-muted, #a1a1ae); --badge-foreground: #191722; display: inline-flex; align-items: center; gap: 9px; padding: 10px 14px; border: 1px solid var(--color-border, rgb(228 226 245 / 9%)); border-radius: 999px; font-size: 14px; font-weight: 600; line-height: 1; }
.il-export-badge--small { padding: 7px 10px; font-size: 11px; }
.il-export-badge--medium { padding: 10px 14px; font-size: 14px; }
.il-export-badge--large { padding: 12px 17px; font-size: 16px; }
.il-export-badge--neutral { --badge-color: var(--color-text-muted, #a1a1ae); }
.il-export-badge--primary { --badge-color: var(--color-accent, #a997f5); --badge-foreground: var(--color-accent-contrast, #191722); }
.il-export-badge--success { --badge-color: var(--color-success, #7dbb9b); }
.il-export-badge--warning { --badge-color: var(--color-warning, #eab66f); }
.il-export-badge--error { --badge-color: var(--color-error, #d38b99); }
.il-export-badge--solid { border-color: color-mix(in srgb,var(--badge-color) 45%,transparent); background: var(--badge-color); color: var(--badge-foreground); }
.il-export-badge--soft { border-color: color-mix(in srgb,var(--badge-color) 34%,transparent); background: color-mix(in srgb,var(--badge-color) 13%,var(--color-surface, #171820)); color: var(--badge-color); }
.il-export-badge--outline { border-color: color-mix(in srgb,var(--badge-color) 60%,transparent); background: transparent; color: var(--badge-color); }
.il-export-badge__dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: currentColor; box-shadow: 0 0 10px color-mix(in srgb,currentColor 45%,transparent); }`
}

function getAlertCss() {
  return `.il-export-alert { --alert-color: var(--color-accent, #a997f5); display: grid; grid-template-columns: 30px minmax(0,1fr) auto; align-items: start; gap: 12px; width: min(100%,560px); padding: 17px; border: 1px solid color-mix(in srgb,var(--alert-color) 32%,transparent); border-radius: var(--radius-md, 10px); background: color-mix(in srgb,var(--alert-color) 9%,var(--color-surface, #171820)); color: var(--color-text, #e9e8ef); box-shadow: var(--shadow-card, 0 14px 38px rgb(0 0 0 / 14%)); text-align: left; }
.il-export-alert--success { --alert-color: var(--color-success, #7dbb9b); }
.il-export-alert--warning { --alert-color: var(--color-warning, #eab66f); }
.il-export-alert--error { --alert-color: var(--color-error, #d38b99); }
.il-export-alert--small { grid-template-columns: 24px minmax(0,1fr) auto; gap: 9px; padding: 12px; }
.il-export-alert--small .il-export-alert__icon { width: 23px; height: 23px; font-size: 13px; }
.il-export-alert--large { grid-template-columns: 34px minmax(0,1fr) auto; gap: 14px; padding: 22px; }
.il-export-alert--large .il-export-alert__icon { width: 32px; height: 32px; font-size: 17px; }
.il-export-alert__icon { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid color-mix(in srgb,var(--alert-color) 34%,transparent); border-radius: 9px; background: color-mix(in srgb,var(--alert-color) 15%,transparent); color: var(--alert-color); font-size: 15px; font-weight: 700; }
.il-export-alert__copy { min-width: 0; padding-top: 2px; }
.il-export-alert__copy strong { color: var(--color-text, #e9e8ef); font-size: var(--font-size-sm, 14px); font-weight: 550; }
.il-export-alert__copy p { margin: 4px 0 0; color: var(--color-text-muted, #a1a1ae); font-size: var(--font-size-xs, 12px); line-height: 1.55; }
.il-export-alert__dismiss { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--color-text-muted, #a1a1ae); font: inherit; font-size: 18px; cursor: pointer; }
.il-export-alert__dismiss:hover { border-color: var(--color-accent-border); background: var(--color-accent-soft); color: var(--color-accent); }
.il-export-alert__dismiss:focus-visible { border-color: var(--color-accent-border); background: var(--color-accent-soft); color: var(--color-accent); outline: 2px solid var(--color-accent); outline-offset: 2px; }`
}

function getSelectCss() {
  return `.il-export-select { display: grid; gap: 10px; width: min(100%,420px); color: var(--color-text-muted, #a1a1ae); font: inherit; font-size: 14px; line-height: 1.5; text-align: left; }
.il-export-select__label { color: var(--color-text, #e9e8ef); font-weight: 550; }
.il-export-select__control { width: 100%; min-width: 0; height: 54px; padding: 0 40px 0 17px; border: 1px solid var(--color-border, rgb(228 226 245 / 9%)); border-radius: 12px; outline: 0; appearance: none; background: linear-gradient(145deg,var(--color-surface-raised, #1d1e28),var(--color-surface, #171820)); color: var(--color-text, #e9e8ef); font: inherit; cursor: pointer; box-shadow: 0 8px 20px rgb(0 0 0 / 12%),inset 0 1px rgb(255 255 255 / 3%); transition: border-color 160ms ease,box-shadow 160ms ease; }
.il-export-select { position: relative; }
.il-export-select::after { position: absolute; right: 15px; bottom: 11px; color: var(--color-accent, #a997f5); content: '⌄'; font-size: 22px; pointer-events: none; }
.il-export-select__control:focus-visible { border-color: var(--color-accent-border, rgb(169 151 245 / 48%)); box-shadow: 0 0 0 3px var(--color-accent-soft, rgb(169 151 245 / 14%)); }
.il-export-select[data-preview-state="hover"] .il-export-select__control { border-color: var(--color-accent-border, rgb(169 151 245 / 48%)); }
.il-export-select[data-preview-state="focus"] .il-export-select__control { border-color: var(--color-accent-border, rgb(169 151 245 / 48%)); box-shadow: 0 0 0 3px var(--color-accent-soft, rgb(169 151 245 / 14%)); }
.il-export-select__control:disabled { opacity: .55; cursor: not-allowed; }
.il-export-select__control .is-placeholder { color: var(--color-text-dim, #737480); }
.il-export-select__menu { display: grid; grid-template-rows: 0fr; opacity: 0; pointer-events: none; transition: grid-template-rows 180ms ease,opacity 180ms ease; }
.il-export-select__menu[data-open="true"] { grid-template-rows: 1fr; opacity: 1; pointer-events: auto; }
.il-export-select__menu-inner { min-height: 0; overflow: hidden; }
.il-export-select__options { max-height: 190px; overflow-y: auto; margin: 7px 0 0; padding: 5px; list-style: none; border: 1px solid var(--color-border, rgb(228 226 245 / 9%)); border-radius: 11px; background: var(--color-surface-raised, #1d1e28); box-shadow: 0 14px 32px rgb(0 0 0 / 28%); }
.il-export-select__options [role="option"] { display: flex; align-items: center; justify-content: space-between; min-height: 38px; padding: 0 10px; border-radius: 7px; color: var(--color-text-muted, #a1a1ae); cursor: pointer; }
.il-export-select__options [role="option"]:hover,.il-export-select__options [role="option"].is-active { background: var(--color-accent-soft, rgb(169 151 245 / 14%)); color: var(--color-text, #e9e8ef); }
.il-export-select__options [role="option"][aria-selected="true"] { color: var(--color-accent, #a997f5); }
.il-export-select__options [role="presentation"] { padding: 10px; color: var(--color-text-muted, #a1a1ae); }`
}

function getModalCss() {
  return `.il-export-modal { position: relative; display: grid; place-items: center; width: 100%; min-height: 270px; }
.il-export-modal__trigger { min-height: 42px; padding: 0 13px; border: 1px solid var(--color-accent-border, rgb(169 151 245 / 48%)); border-radius: var(--radius-sm, 7px); background: var(--color-accent, #a997f5); color: var(--color-accent-contrast, #191722); font: inherit; font-size: var(--font-size-xs, 12px); cursor: pointer; box-shadow: 0 10px 28px var(--color-accent-glow, rgb(169 151 245 / 24%)),inset 0 1px rgb(255 255 255 / 20%); transition: background 160ms ease,transform 160ms ease; }
.il-export-modal__trigger:hover { background: var(--color-accent-hover, #baabf7); transform: translateY(-2px); }
.il-export-modal__backdrop { position: absolute; z-index: 2; inset: 0; display: grid; place-items: center; padding: clamp(14px,3vw,36px); background: rgb(8 9 14 / 72%); backdrop-filter: blur(8px); }
.il-export-modal__dialog { position: relative; width: min(100%,430px); max-height: 100%; overflow: auto; padding: clamp(22px,2.5vw,34px); border: 1px solid var(--color-border, rgb(228 226 245 / 9%)); border-radius: 17px; outline: none; background: linear-gradient(145deg,var(--color-surface-raised, #1d1e28),var(--color-surface, #171820)); color: var(--color-text, #e9e8ef); box-shadow: 0 28px 80px rgb(0 0 0 / 48%),inset 0 1px rgb(255 255 255 / 5%); }
.il-export-modal__dialog[data-size="small"] { width: min(100%,320px); }
.il-export-modal__dialog[data-size="large"] { width: min(100%,560px); }
.il-export-modal__dialog:focus-visible { border-color: var(--color-accent-border, rgb(169 151 245 / 48%)); }
.il-export-modal__eyebrow { color: var(--color-accent, #a997f5); font-size: var(--font-size-xs, 12px); font-weight: 700; letter-spacing: .12em; }
.il-export-modal__title { margin: 13px 30px 0 0; font-family: var(--font-display, sans-serif); font-size: clamp(21px,2.2vw,30px); font-weight: 550; letter-spacing: -.035em; line-height: 1.2; }
.il-export-modal__description { margin: 10px 0 22px; color: var(--color-text-muted, #a1a1ae); font-size: var(--font-size-sm, 14px); line-height: 1.65; }
.il-export-modal__close { min-height: 40px; padding: 0 15px; border: 1px solid var(--color-border, rgb(228 226 245 / 9%)); border-radius: var(--radius-sm, 7px); background: var(--color-surface, #171820); color: var(--color-text-muted, #a1a1ae); font: inherit; cursor: pointer; }
.il-export-modal__dismiss { position: absolute; top: 13px; right: 13px; width: 32px; height: 32px; border: 1px solid var(--color-border, rgb(228 226 245 / 9%)); border-radius: 8px; background: transparent; color: var(--color-text-muted, #a1a1ae); font: inherit; font-size: 20px; cursor: pointer; }
.il-export-modal__dismiss:focus-visible,.il-export-modal__close:focus-visible { outline: 2px solid var(--color-accent, #a997f5); outline-offset: 2px; }`
}

function getTooltipCss() {
  return `.il-export-tooltip { position: relative; display: flex; align-items: center; justify-content: center; max-width: 100%; }
.il-export-tooltip__trigger { position: relative; z-index: 1; max-width: 100%; min-height: 38px; padding: 0 13px; border: 1px solid var(--color-border, rgb(228 226 245 / 9%)); border-radius: var(--radius-sm, 7px); background: var(--color-surface-raised, #1d1e28); color: var(--color-text, #e9e8ef); font: inherit; cursor: pointer; }
.il-export-tooltip__bubble { position: absolute; z-index: 2; width: max-content; max-width: min(230px,calc(100vw - 72px)); padding: 10px 13px; border: 1px solid var(--color-accent-border, rgb(169 151 245 / 48%)); border-radius: 9px; background: var(--color-surface-raised, #1d1e28); color: var(--color-text, #e9e8ef); box-shadow: 0 12px 32px rgb(0 0 0 / 32%); font-size: var(--font-size-xs, 12px); line-height: 1.5; text-align: center; visibility: hidden; opacity: 0; pointer-events: none; transition: opacity 160ms ease,transform 160ms ease,visibility 160ms ease; }
.il-export-tooltip[data-placement="top"] .il-export-tooltip__bubble { bottom: calc(100% + 12px); left: 50%; transform: translate(-50%,4px); }
.il-export-tooltip[data-placement="bottom"] .il-export-tooltip__bubble { top: calc(100% + 12px); left: 50%; transform: translate(-50%,-4px); }
.il-export-tooltip[data-placement="left"] .il-export-tooltip__bubble { top: 50%; right: calc(50% + 20px); transform: translate(4px,-50%); }
.il-export-tooltip[data-placement="right"] .il-export-tooltip__bubble { top: 50%; left: calc(50% + 20px); transform: translate(-4px,-50%); }
.il-export-tooltip:hover .il-export-tooltip__bubble,.il-export-tooltip:focus-within .il-export-tooltip__bubble { visibility: visible; opacity: 1; transform: translate(0,0); }
.il-export-tooltip[data-placement="top"]:hover .il-export-tooltip__bubble,.il-export-tooltip[data-placement="top"]:focus-within .il-export-tooltip__bubble,.il-export-tooltip[data-placement="bottom"]:hover .il-export-tooltip__bubble,.il-export-tooltip[data-placement="bottom"]:focus-within .il-export-tooltip__bubble { transform: translate(-50%,0); }
.il-export-tooltip[data-placement="left"]:hover .il-export-tooltip__bubble,.il-export-tooltip[data-placement="left"]:focus-within .il-export-tooltip__bubble,.il-export-tooltip[data-placement="right"]:hover .il-export-tooltip__bubble,.il-export-tooltip[data-placement="right"]:focus-within .il-export-tooltip__bubble { transform: translate(0,-50%); }`
}

function getTabsCss() {
  return `.il-export-tabs { width: min(100%,640px); overflow: hidden; border: 1px solid var(--color-border, rgb(228 226 245 / 9%)); border-radius: 14px; background: linear-gradient(145deg,var(--color-surface-raised, #1d1e28),var(--color-surface, #171820)); box-shadow: var(--shadow-card, 0 14px 38px rgb(0 0 0 / 14%)); text-align: left; }
.il-export-tabs__list { display: flex; gap: 5px; padding: 8px; overflow-x: auto; border-bottom: 1px solid var(--color-border-soft, rgb(228 226 245 / 6%)); }
.il-export-tabs__tab { flex: 0 0 auto; min-height: 40px; padding: 0 14px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--color-text-muted, #a1a1ae); font: inherit; font-size: var(--font-size-xs, 12px); cursor: pointer; transition: color 160ms ease,background 160ms ease,border-color 160ms ease; }
.il-export-tabs__tab:hover { color: var(--color-text, #e9e8ef); background: rgb(255 255 255 / 4%); }
.il-export-tabs__tab[aria-selected="true"] { border-color: var(--color-accent-border, rgb(169 151 245 / 48%)); background: var(--color-accent-soft, rgb(169 151 245 / 14%)); color: var(--color-accent, #a997f5); }
.il-export-tabs__tab:focus-visible { outline: 2px solid var(--color-accent, #a997f5); outline-offset: 2px; }
.il-export-tabs[data-preview-state="hover"] .il-export-tabs__tab:not([aria-selected="true"]) { color: var(--color-text, #e9e8ef); background: rgb(255 255 255 / 4%); }
.il-export-tabs[data-preview-state="focus"] .il-export-tabs__tab[aria-selected="true"] { outline: 2px solid var(--color-accent, #a997f5); outline-offset: 2px; }
.il-export-tabs[data-preview-state="disabled"] .il-export-tabs__tab { opacity: .5; cursor: not-allowed; }
.il-export-tabs__panel { min-height: 190px; padding: clamp(20px,3vw,32px); }
.il-export-tabs__eyebrow { color: var(--color-accent, #a997f5); font-size: var(--font-size-xs, 12px); font-weight: 700; letter-spacing: .12em; }
.il-export-tabs__panel h3 { margin: 10px 0 0; color: var(--color-text, #e9e8ef); font-family: var(--font-display, sans-serif); font-size: clamp(22px,2.4vw,32px); font-weight: 550; letter-spacing: -.04em; }
.il-export-tabs__panel p { margin: 8px 0 0; color: var(--color-text-muted, #a1a1ae); font-size: var(--font-size-sm, 14px); line-height: 1.6; }`
}

function getButtonCss(button: EditorSettings['button']) {
  const style = getButtonStyle(button)
  return `.il-export-button {
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

.il-export-button--primary {
  border-color: var(--color-accent-border, rgb(169 151 245 / 48%));
  background: var(--color-accent, #a997f5);
  color: var(--color-accent-contrast, #191722);
  box-shadow: 0 5px 17px var(--color-accent-glow, rgb(169 151 245 / 22%)), inset 0 1px rgb(255 255 255 / 18%);
}
.il-export-button--secondary { border-color: rgb(227 225 245 / 12%); background: rgb(255 255 255 / 5%); color: #dedce8; }
.il-export-button--outline { border-color: var(--color-accent-border, rgb(169 151 245 / 48%)); background: transparent; color: var(--color-accent, #a997f5); }
.il-export-button--danger { border-color: color-mix(in srgb,var(--color-error, #d38b99) 42%,transparent); background: color-mix(in srgb,var(--color-error, #d38b99) 14%,var(--color-surface, #171820)); color: var(--color-error, #d38b99); }
.il-export-button--ghost { background: transparent; color: #aaa7b7; }
.il-export-button:hover:not(:disabled) { transform: translateY(-2px); }
.il-export-button--primary:hover:not(:disabled) { background: var(--color-accent-hover, #baabf7); box-shadow: 0 8px 21px var(--color-accent-glow, rgb(169 151 245 / 32%)), inset 0 1px rgb(255 255 255 / 22%); }
.il-export-button--secondary:hover:not(:disabled) { border-color: var(--color-accent-border); background: var(--color-accent-soft); }
.il-export-button--outline:hover:not(:disabled) { background: var(--color-accent-soft, rgb(169 151 245 / 14%)); }
.il-export-button--danger:hover:not(:disabled) { border-color: var(--color-error, #d38b99); background: color-mix(in srgb,var(--color-error, #d38b99) 22%,var(--color-surface, #171820)); }
.il-export-button--ghost:hover:not(:disabled) { background: var(--color-accent-soft); color: var(--color-accent); }
.il-export-button:active:not(:disabled) { transform: translateY(0) scale(.97); }
.il-export-button:disabled { border-color: rgb(255 255 255 / 4%); background: rgb(255 255 255 / 3%); color: #5f606b; opacity: .65; cursor: not-allowed; box-shadow: none;}
.il-export-button[data-preview-state="hover"]:not(:disabled) { transform: translateY(-2px); filter: brightness(1.08); }
.il-export-button[data-preview-state="focus"] { outline: 2px solid var(--color-accent, #a997f5); outline-offset: 3px; }
.il-export-button[data-preview-state="active"]:not(:disabled) { transform: scale(.97); filter: brightness(.94); }
.il-export-button__spinner { display: inline-block; width: 1em; height: 1em; margin-right: 8px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: il-export-spin .7s linear infinite; }
@keyframes il-export-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .il-export-button,.il-export-button__spinner { transition: none; animation: none; } }`
}

function getCardCss(card: EditorSettings['card']) {
  const style = getCardStyle(card)
  return `.il-export-card {
  width: min(100%, 365px);
  padding: ${style.padding}px;
  border: 1px solid ${card.borderVisible ? 'var(--color-border, rgb(228 226 245 / 9%))' : 'transparent'};
  border-radius: ${style.borderRadius}px;
  background: var(--color-surface-raised, #1d1e28);
  box-shadow: ${style.boxShadow};
  color: var(--color-text, #e9e8ef);
  transition: transform 240ms ease, box-shadow 240ms ease;
}
.il-export-card h3 { margin: 14px 0 0; font-size: 19px; font-weight: 530; letter-spacing: -.035em; }
.il-export-card p { max-width: 270px; margin: 8px 0 0; color: var(--color-text-muted, #92929f); font-size: 11px; line-height: 1.7; }
.il-export-card__eyebrow { color: var(--color-accent, #a997f5); font-size: 9px; font-weight: 700; letter-spacing: .12em; }
.il-export-card--default { background: var(--color-surface-raised, #1d1e28); }
.il-export-card--elevated { background: linear-gradient(145deg,var(--color-surface-raised, #1d1e28),var(--color-surface, #171820)); }
.il-export-card--outlined { background: transparent; box-shadow: none; }
.il-export-card--interactive:hover { border-color: var(--color-accent-border); box-shadow: 0 18px 50px var(--color-accent-glow); transform: translateY(-2px); }
.il-export-card--small h3 { font-size: 16px; }
.il-export-card--small p { font-size: 12px; }
.il-export-card--large h3 { font-size: 23px; }
.il-export-card--large p { font-size: 15px; }`
}

function getInputCss(input: EditorSettings['input']) {
  const style = getInputStyle(input)
  return `.il-export-input {
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
.il-export-input:focus { border-color: var(--color-accent-border); box-shadow: 0 0 0 3px var(--color-accent-soft); }
.il-export-input[data-preview-state="hover"]:not(:disabled) { border-color: var(--color-accent-border); }
.il-export-input[data-preview-state="focus"]:not(:disabled) { border-color: var(--color-accent-border); box-shadow: 0 0 0 3px var(--color-accent-soft); }
.il-export-input[aria-invalid="true"] { border-color: var(--color-error, #d38b99); box-shadow: 0 0 0 2px color-mix(in srgb,var(--color-error, #d38b99) 16%,transparent); }
.il-export-input::placeholder { color: var(--color-text-dim, #737480); }
.il-export-input:disabled { opacity: .55; cursor: not-allowed;}
.il-export-input--filled { border-color: transparent; background: var(--color-surface-raised, #1d1e28); }
.il-export-input--outlined { background: transparent; }
.il-export-input--underlined { padding-inline: 2px; border-width: 0 0 1px; border-radius: 0; background: transparent; }
.il-export-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;}`
}

function getToggleCss(toggle: EditorSettings['toggle']) {
  const style = getToggleStyle(toggle)
  const accent = safeColor(toggle.accent, '#a997f5')
  return `.il-export-toggle {
  --toggle-width: ${style['--toggle-width']};
  --toggle-height: ${style['--toggle-height']};
  --toggle-thumb-size: ${style['--toggle-thumb-size']};
  --toggle-travel: ${style['--toggle-travel']};
  --toggle-accent: ${accent};
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
.il-export-toggle > span { width: var(--toggle-thumb-size); height: var(--toggle-thumb-size); border-radius: 50%; background: #a2a1ad; transition: transform 160ms ease; }
.il-export-toggle[aria-checked="true"] { border-color: var(--toggle-accent); background: var(--toggle-accent); }
.il-export-toggle[aria-checked="true"] > span { background: #fff; transform: translateX(var(--toggle-travel)); }
.il-export-toggle:focus-visible,.il-export-toggle[data-preview-state="focus"] { outline: 2px solid var(--toggle-accent); outline-offset: 3px; }
.il-export-toggle[data-preview-state="hover"]:not(:disabled) { box-shadow: 0 0 0 3px color-mix(in srgb,var(--toggle-accent) 22%,transparent); }
.il-export-toggle:disabled { opacity: .5; cursor: not-allowed;}`
}

function getSliderCss(slider: EditorSettings['slider']) {
  const accent = safeColor(slider.accent, '#a997f5')
  return `.il-export-slider {
  display: grid;
  gap: 19px;
  width: min(100%, 350px);
  padding: 20px;
  border: 1px solid var(--color-border, rgb(228 226 245 / 9%));
  border-radius: 12px;
  background: var(--color-surface, #171820);
}
.il-export-slider > span { display: flex; align-items: center; justify-content: space-between; color: var(--color-text, #d9d7e2); font-size: 14px; }
.il-export-slider output { color: ${accent}; font-variant-numeric: tabular-nums; }
.il-export-slider input[type="range"] { width: 100%; accent-color: ${accent}; cursor: pointer; }
.il-export-slider > small { display: flex; justify-content: space-between; color: var(--color-text-muted, #777885);}
.il-export-slider[data-preview-state="focus"] input { outline: 2px solid ${accent}; outline-offset: 3px; }
.il-export-slider[data-preview-state="disabled"] input { opacity: .48; cursor: not-allowed; }
.il-export-slider[data-preview-state="active"] input { filter: saturate(1.2); }
@media (prefers-reduced-motion: reduce) { .il-export-slider input { scroll-behavior: auto; } }`
}

export function generateComponentCss(component: ComponentKind, settings: EditorSettings) {
  switch (component) {
    case 'button': return `/* Button text: "${safeComment(settings.button.text)}" */\n${getButtonCss(settings.button)}`
    case 'card': return getCardCss(settings.card)
    case 'input': return `/* Placeholder: "${safeComment(settings.input.placeholder)}" */\n${getInputCss(settings.input)}`
    case 'toggle': return `/* Initial state: ${settings.toggle.defaultOn ? 'on' : 'off'} */\n${getToggleCss(settings.toggle)}`
    case 'slider': return `/* Range: min ${safeNumber(settings.slider.min, 0)}, max ${safeNumber(settings.slider.max, 100)}, initial ${safeNumber(settings.slider.value, 0)} */\n${getSliderCss(settings.slider)}`
    case 'badge': return getBadgeCss()
    case 'alert': return getAlertCss()
    case 'select': return getSelectCss()
    case 'modal': return getModalCss()
    case 'tooltip': return getTooltipCss()
    case 'tabs': return getTabsCss()
  }
}

export function generateComponentHtml(component: ComponentKind, settings: EditorSettings) {
  switch (component) {
    case 'button': {
      const button = settings.button
      const loading = button.previewState === 'loading'
      const disabled = button.previewState === 'disabled' || loading
      return `<!-- Add a click handler in JavaScript if this action should perform work. -->\n<button class="il-export-button il-export-button--${button.variant}" type="button" data-preview-state="${button.previewState}"${disabled ? ' disabled' : ''}${loading ? ' aria-busy="true"' : ''} style="${escapeHtml(serializeStyle(getButtonStyle(button)))}">${loading ? '<span class="il-export-button__spinner" aria-hidden="true"></span>' : ''}${escapeHtml(button.text || 'Button')}</button>`
    }
    case 'card':
      return `<article class="il-export-card il-export-card--${settings.card.variant} il-export-card--${settings.card.size}" aria-labelledby="il-export-card-title" style="${escapeHtml(serializeStyle(getCardStyle(settings.card)))}">\n  <span class="il-export-card__eyebrow">A SMALL MOMENT</span>\n  <h3 id="il-export-card-title">Room for a good idea.</h3>\n  <p>A simple card can make a little space for something worth noticing.</p>\n</article>`
    case 'input':
      return `<label class="il-export-field">\n  <span class="il-export-sr-only">${escapeHtml(settings.input.placeholder || 'Text input')}</span>\n  <input class="il-export-input il-export-input--${settings.input.variant}" type="text" data-preview-state="${settings.input.previewState}" aria-invalid="${settings.input.previewState === 'error'}" placeholder="${escapeHtml(settings.input.placeholder)}"${settings.input.disabled ? ' disabled' : ''} style="${escapeHtml(serializeStyle(getInputStyle(settings.input)))}" />\n</label>`
    case 'toggle':
      return `<!-- JavaScript is required to toggle aria-checked and the visual state. -->\n<button class="il-export-toggle" type="button" role="switch" aria-label="Toggle setting" aria-checked="${settings.toggle.defaultOn}" data-preview-state="${settings.toggle.previewState}"${settings.toggle.previewState === 'disabled' ? ' disabled' : ''} style="${escapeHtml(serializeStyle(getToggleStyle(settings.toggle)))}">\n  <span aria-hidden="true"></span>\n</button>`
    case 'slider': {
      const slider = settings.slider
      return `<label class="il-export-slider" data-preview-state="${slider.previewState}">\n  <span><strong>Value</strong><output>${safeNumber(slider.value, 0)}</output></span>\n  <input type="range" min="${safeNumber(slider.min, 0)}" max="${safeNumber(slider.max, 100)}" value="${safeNumber(slider.value, 0)}" aria-label="Value"${slider.previewState === 'disabled' ? ' disabled' : ''} style="accent-color:${safeColor(slider.accent, '#a997f5')}" />\n  <small><span>${safeNumber(slider.min, 0)}</span><span>${safeNumber(slider.max, 100)}</span></small>\n</label>`
    }
    case 'badge': {
      const badge = settings.badge
      return `<span class="il-export-badge il-export-badge--${badge.variant} il-export-badge--${badge.color} il-export-badge--${badge.size}">${badge.showDot ? '<i class="il-export-badge__dot" aria-hidden="true"></i>' : ''}${escapeHtml(badge.text)}</span>`
    }
    case 'alert': {
      const alert = settings.alert
      const icon = alert.variant === 'success' ? '✓' : alert.variant === 'warning' ? '!' : alert.variant === 'error' ? '×' : 'i'
      const role = alert.variant === 'error' ? 'alert' : 'status'
      return `<div class="il-export-alert il-export-alert--${alert.variant} il-export-alert--${alert.size}" role="${role}" aria-live="${alert.variant === 'error' ? 'assertive' : 'polite'}"><span class="il-export-alert__icon" aria-hidden="true">${icon}</span><div class="il-export-alert__copy">${alert.title ? `<strong>${escapeHtml(alert.title)}</strong>` : ''}${alert.description ? `<p>${escapeHtml(alert.description)}</p>` : ''}</div>${alert.dismissible ? '<button type="button" class="il-export-alert__dismiss" aria-label="Dismiss alert">×</button>' : ''}</div>`
    }
    case 'select': {
      const select = settings.select
      const options = [...new Set(select.options)].slice(0, 10)
      const selectedValue = options.includes(select.value) ? select.value : ''
      const placeholder = `<option value=""${selectedValue === '' ? ' selected' : ''} disabled>${escapeHtml(select.placeholder)}</option>`
      const optionMarkup = options.map((option) => `<option value="${escapeHtml(option)}"${option === selectedValue ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('\n    ')
      const openStateNote = select.previewState === 'open' ? '<!-- Native select menus open through browser interaction; static HTML cannot force their popup open. -->\n' : ''
      return `${openStateNote}<label class="il-export-select" data-preview-state="${select.previewState}">
  <span class="il-export-select__label">${escapeHtml(select.label || 'Select option')}</span>
  <select class="il-export-select__control" aria-label="${escapeHtml(select.label || 'Select option')}"${select.disabled ? ' disabled' : ''}>
    ${placeholder}${optionMarkup ? `\n    ${optionMarkup}` : ''}
  </select>
</label>`
    }
    case 'modal': {
      const modal = settings.modal
      return `<!-- JavaScript required to open/close this dialog and return focus to its trigger. -->
<div class="il-export-modal">
  <button class="il-export-modal__trigger" type="button" aria-haspopup="dialog" aria-controls="il-export-dialog">${escapeHtml(modal.triggerText)}</button>
  <dialog class="il-export-modal__dialog" id="il-export-dialog" data-size="${modal.size}" aria-labelledby="il-export-dialog-title" aria-describedby="il-export-dialog-description">
    <span class="il-export-modal__eyebrow">INTERFACE LAB · DIALOG</span>
    <h2 class="il-export-modal__title" id="il-export-dialog-title">${escapeHtml(modal.title)}</h2>
    <p class="il-export-modal__description" id="il-export-dialog-description">${escapeHtml(modal.description)}</p>
    <button class="il-export-modal__close" type="button">Close dialog</button>
    <button class="il-export-modal__dismiss" type="button" aria-label="Close dialog">×</button>
  </dialog>
</div>`
    }
    case 'tooltip': {
      const tooltip = settings.tooltip
      const placements = ['top', 'right', 'bottom', 'left'] as const
      const placement = placements.includes(tooltip.placement) ? tooltip.placement : 'top'
      return `<div class="il-export-tooltip" data-placement="${placement}">
  <button class="il-export-tooltip__trigger" type="button" aria-describedby="il-export-tooltip-content">${escapeHtml(tooltip.triggerText)}</button>
  <span class="il-export-tooltip__bubble" id="il-export-tooltip-content" role="tooltip">${escapeHtml(tooltip.content)}</span>
</div>`
    }
    case 'tabs': {
      const safeLabels = getSafeTabsLabels(settings.tabs.labels)
      const safeContents = getSafeTabsContents(settings.tabs.contents, safeLabels)
      const activeIndex = safeTabIndex(settings.tabs.activeIndex, safeLabels.length)
      const tabs = safeLabels.map((label, index) => `<button class="il-export-tabs__tab" id="il-export-tab-${index}" type="button" role="tab" aria-selected="${index === activeIndex}" aria-controls="il-export-panel-${index}"${index === activeIndex ? '' : ' tabindex="-1"'}>${escapeHtml(label)}</button>`).join('\n    ')
      const panels = safeLabels.map((label, index) => `<section class="il-export-tabs__panel" id="il-export-panel-${index}" role="tabpanel" aria-labelledby="il-export-tab-${index}" tabindex="0"${index === activeIndex ? '' : ' hidden'}>
      <span class="il-export-tabs__eyebrow">CURRENT VIEW</span><h3>${escapeHtml(label)}</h3><p>${escapeHtml(safeContents[index])}</p>
    </section>`).join('\n    ')
      return `<!-- JavaScript required to update selected tabs and reveal their associated panels. -->
<div class="il-export-tabs" data-preview-state="${settings.tabs.previewState}">
  <div class="il-export-tabs__list" role="tablist" aria-label="Preview tabs">
    ${tabs}
  </div>
  ${panels}
</div>`
    }
  }
}

function tsxLiteral(value: string) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029')
}

export function generateComponentTsx(component: ComponentKind, settings: EditorSettings) {
  switch (component) {
    case 'button': {
      const button = settings.button
      const style = getButtonStyle(button)
      return `import type { CSSProperties } from 'react'\n\nexport type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'\n\nexport interface ButtonProps {\n  text?: string\n  variant?: ButtonVariant\n  disabled?: boolean\n  previewState?: 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'loading'\n  onClick?: () => void\n}\n\nconst buttonStyle: CSSProperties = ${JSON.stringify(style, null, 2)}\n\nexport function Button({\n  text = ${tsxLiteral(button.text || 'Button')},\n  variant = ${tsxLiteral(button.variant)},\n  disabled = false,\n  previewState = ${tsxLiteral(button.previewState)},\n  onClick,\n}: ButtonProps) {\n  const loading = previewState === 'loading'\n  const isDisabled = disabled || loading || previewState === 'disabled'\n  return (\n    <button\n      className={\`il-export-button il-export-button--\${variant}\`}\n      type="button"\n      data-preview-state={previewState}\n      aria-busy={loading || undefined}\n      disabled={isDisabled}\n      onClick={onClick}\n      style={buttonStyle}\n    >\n      {loading && <span className="il-export-button__spinner" aria-hidden="true" />}\n      {text}\n    </button>\n  )\n}`
    }
    case 'card': {
      const style = getCardStyle(settings.card)
      return `import type { CSSProperties, ReactNode } from 'react'\n\nexport type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive'\nexport type CardSize = 'small' | 'medium' | 'large'\n\nexport interface CardProps {\n  children?: ReactNode\n  variant?: CardVariant\n  size?: CardSize\n}\n\nconst cardStyle: CSSProperties = ${JSON.stringify(style, null, 2)}\n\nexport function Card({ children, variant = ${tsxLiteral(settings.card.variant)}, size = ${tsxLiteral(settings.card.size)} }: CardProps) {\n  return (\n    <article className={\`il-export-card il-export-card--\${variant} il-export-card--\${size}\`} style={cardStyle}>\n      <span className="il-export-card__eyebrow">A SMALL MOMENT</span>\n      <h3>Room for a good idea.</h3>\n      <p>A simple card can make a little space for something worth noticing.</p>\n      {children}\n    </article>\n  )\n}`
    }
    case 'input': {
      const input = settings.input
      const style = getInputStyle(input)
      return `import { useState, type CSSProperties, type ChangeEvent } from 'react'\n\nexport type InputVariant = 'filled' | 'outlined' | 'underlined'\n\nexport interface InputProps {\n  value?: string\n  variant?: InputVariant\n  disabled?: boolean\n  previewState?: 'default' | 'hover' | 'focus' | 'error'\n  onChange?: (value: string) => void\n}\n\nconst inputStyle: CSSProperties = ${JSON.stringify(style, null, 2)}\n\nexport function Input({\n  value,\n  disabled = ${input.disabled},\n  variant = ${tsxLiteral(input.variant)},\n  previewState = ${tsxLiteral(input.previewState)},\n  onChange,\n}: InputProps) {\n  const [internalValue, setInternalValue] = useState('')\n  const currentValue = value ?? internalValue\n\n  function handleChange(event: ChangeEvent<HTMLInputElement>) {\n    setInternalValue(event.target.value)\n    onChange?.(event.target.value)\n  }\n\n  return (\n    <label className="il-export-field">\n      <span className="il-export-sr-only">${tsxLiteral(input.placeholder || 'Text input')}</span>\n      <input\n        className={\`il-export-input il-export-input--\${variant}\`}\n        type="text"\n        data-preview-state={previewState}\n        aria-invalid={previewState === 'error'}\n        placeholder=${tsxLiteral(input.placeholder)}\n        value={currentValue}\n        disabled={disabled}\n        onChange={handleChange}\n        style={inputStyle}\n      />\n    </label>\n  )\n}`
    }
    case 'toggle': {
      const toggle = settings.toggle
      const style = getToggleStyle(toggle)
      return `import { useState } from 'react'\nimport type { CSSProperties } from 'react'\n\ntype ToggleStyle = CSSProperties & {\n  '--toggle-width': string\n  '--toggle-height': string\n  '--toggle-thumb-size': string\n  '--toggle-travel': string\n  '--toggle-accent': string\n}\n\nexport interface ToggleProps {\n  checked?: boolean\n  previewState?: 'default' | 'hover' | 'focus' | 'disabled'\n  onChange?: (checked: boolean) => void\n}\n\nconst toggleStyle: ToggleStyle = ${JSON.stringify(style, null, 2)}\n\nexport function Toggle({\n  checked,\n  previewState = ${tsxLiteral(toggle.previewState)},\n  onChange,\n}: ToggleProps) {\n  const [internalChecked, setInternalChecked] = useState(${toggle.defaultOn})\n  const currentChecked = checked ?? internalChecked\n\n  function handleClick() {\n    const nextChecked = !currentChecked\n    setInternalChecked(nextChecked)\n    onChange?.(nextChecked)\n  }\n\n  return (\n    <button\n      className="il-export-toggle"\n      type="button"\n      role="switch"\n      aria-label="Toggle setting"\n      aria-checked={currentChecked}\n      data-preview-state={previewState}\n      disabled={previewState === 'disabled'}\n      onClick={handleClick}\n      style={toggleStyle}\n    >\n      <span aria-hidden="true" />\n    </button>\n  )\n}`
    }
    case 'slider': {
      const slider = settings.slider
      return `import { useState, type ChangeEvent } from 'react'\n\nexport interface SliderProps {\n  value?: number\n  previewState?: 'default' | 'hover' | 'focus' | 'active' | 'disabled'\n  onValueChange?: (value: number) => void\n}\n\nexport function Slider({\n  value,\n  previewState = ${tsxLiteral(slider.previewState)},\n  onValueChange,\n}: SliderProps) {\n  const [internalValue, setInternalValue] = useState(${safeNumber(slider.value, 0)})\n  const currentValue = value ?? internalValue\n\n  function handleChange(event: ChangeEvent<HTMLInputElement>) {\n    const nextValue = Number(event.target.value)\n    setInternalValue(nextValue)\n    onValueChange?.(nextValue)\n  }\n\n  return (\n    <label className="il-export-slider" data-preview-state={previewState}>\n      <span><strong>Value</strong><output>{currentValue}</output></span>\n      <input\n        type="range"\n        min={${safeNumber(slider.min, 0)}}\n        max={${safeNumber(slider.max, 100)}}\n        value={currentValue}\n        disabled={previewState === 'disabled'}\n        aria-label="Value"\n        onChange={handleChange}\n      />\n      <small><span>${safeNumber(slider.min, 0)}</span><span>${safeNumber(slider.max, 100)}</span></small>\n    </label>\n  )\n}`
    }
    case 'badge': {
      const badge = settings.badge
      return `/* Import the matching CSS export alongside this component. */
export type BadgeVariant = 'solid' | 'soft' | 'outline'
export type BadgeColor = 'neutral' | 'primary' | 'success' | 'warning' | 'error'
export type BadgeSize = 'small' | 'medium' | 'large'

export interface BadgeProps {
  text?: string
  variant?: BadgeVariant
  color?: BadgeColor
  size?: BadgeSize
  showDot?: boolean
}

export function Badge({ text = ${tsxLiteral(badge.text)}, variant = ${tsxLiteral(badge.variant)}, color = ${tsxLiteral(badge.color)}, size = ${tsxLiteral(badge.size)}, showDot = ${badge.showDot} }: BadgeProps) {
  return (
    <span className={\`il-export-badge il-export-badge--\${variant} il-export-badge--\${color} il-export-badge--\${size}\`}>
      {showDot && <i className="il-export-badge__dot" aria-hidden="true" />}
      {text}
    </span>
  )
}`
    }
    case 'alert': {
      const alert = settings.alert
      return `/* Import the matching CSS export alongside this component. */
import { useState } from 'react'

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'
export type AlertSize = 'small' | 'medium' | 'large'

export interface AlertProps {
  variant?: AlertVariant
  size?: AlertSize
  title?: string
  description?: string
  dismissible?: boolean
  onDismiss?: () => void
}

export function Alert({ variant = ${tsxLiteral(alert.variant)}, size = ${tsxLiteral(alert.size)}, title = ${tsxLiteral(alert.title)}, description = ${tsxLiteral(alert.description)}, dismissible = ${alert.dismissible}, onDismiss }: AlertProps) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  const icon = variant === 'success' ? '✓' : variant === 'warning' ? '!' : variant === 'error' ? '×' : 'i'
  function dismiss() { setVisible(false); onDismiss?.() }
  return (
    <div className={\`il-export-alert il-export-alert--\${variant} il-export-alert--\${size}\`} role={variant === 'error' ? 'alert' : 'status'} aria-live={variant === 'error' ? 'assertive' : 'polite'}>
      <span className="il-export-alert__icon" aria-hidden="true">{icon}</span>
      <div className="il-export-alert__copy">{title && <strong>{title}</strong>}{description && <p>{description}</p>}</div>
      {dismissible && <button type="button" className="il-export-alert__dismiss" aria-label="Dismiss alert" onClick={dismiss}>×</button>}
    </div>
  )
}`
    }
    case 'select': {
      const select = settings.select
      const options = [...new Set(select.options)].slice(0, 10)
      const defaults = JSON.stringify(options)
      const valueDefault = options.includes(select.value) ? select.value : ''
      return `/* Import the matching CSS export alongside this component. */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export interface SelectProps {
  label?: string
  placeholder?: string
  options?: string[]
  value?: string
  disabled?: boolean
  previewState?: 'default' | 'hover' | 'focus' | 'open'
  onValueChange?: (value: string) => void
}

export function Select({ label = ${tsxLiteral(select.label)}, placeholder = ${tsxLiteral(select.placeholder)}, options = ${defaults}, value, disabled = ${select.disabled}, previewState = ${tsxLiteral(select.previewState)}, onValueChange }: SelectProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [internalValue, setInternalValue] = useState(${tsxLiteral(valueDefault)})
  const [isOpen, setIsOpen] = useState(previewState === 'open')
  const [activeIndex, setActiveIndex] = useState(0)
  const uniqueOptions = [...new Set(options)].slice(0, 10)
  const currentValue = value ?? internalValue
  const selectedIndex = uniqueOptions.indexOf(currentValue)
  const activeOptionIndex = uniqueOptions.length ? Math.max(0, Math.min(activeIndex, uniqueOptions.length - 1)) : -1
  const isExpanded = isOpen && !disabled

  useEffect(() => {
    if (!isExpanded) return
    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [isExpanded])

  function openMenu(index = selectedIndex >= 0 ? selectedIndex : 0) {
    if (disabled) return
    setActiveIndex(uniqueOptions.length ? index : -1)
    setIsOpen(true)
  }

  function chooseOption(option: string) {
    setInternalValue(option)
    onValueChange?.(option)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (event.key === 'Escape' && isExpanded) { event.preventDefault(); setIsOpen(false); return }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isExpanded) {
        const base = selectedIndex >= 0 ? selectedIndex : (event.key === 'ArrowDown' ? -1 : 0)
        const step = event.key === 'ArrowDown' ? 1 : -1
        openMenu(uniqueOptions.length ? (base + step + uniqueOptions.length) % uniqueOptions.length : -1)
      } else if (uniqueOptions.length) {
        const step = event.key === 'ArrowDown' ? 1 : -1
        setActiveIndex((current) => (Math.max(0, Math.min(current, uniqueOptions.length - 1) + step + uniqueOptions.length) % uniqueOptions.length))
      }
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      if (!isExpanded || !uniqueOptions.length) return
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : uniqueOptions.length - 1)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!isExpanded) openMenu()
      else if (activeOptionIndex >= 0) chooseOption(uniqueOptions[activeOptionIndex])
    }
  }

  return (
    <div className="il-export-select" data-preview-state={isExpanded ? 'open' : previewState} ref={rootRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false) }}>
      <span className="il-export-select__label" id={\`\${id}-label\`}>{label}</span>
      <button className="il-export-select__control" ref={triggerRef} type="button" role="combobox" aria-labelledby={\`\${id}-label \${id}-value\`} aria-haspopup="listbox" aria-expanded={isExpanded} aria-controls={\`\${id}-listbox\`} aria-activedescendant={isExpanded && activeOptionIndex >= 0 ? \`\${id}-option-\${activeOptionIndex}\` : undefined} disabled={disabled} onClick={() => isExpanded ? setIsOpen(false) : openMenu()} onKeyDown={handleKeyDown}>
        <span id={\`\${id}-value\`} className={selectedIndex < 0 ? 'is-placeholder' : ''}>{selectedIndex >= 0 ? uniqueOptions[selectedIndex] : placeholder}</span>
      </button>
      <div className="il-export-select__menu" data-open={isExpanded} aria-hidden={!isExpanded}>
        <div className="il-export-select__menu-inner">
          <ul id={\`\${id}-listbox\`} className="il-export-select__options" role="listbox" aria-labelledby={\`\${id}-label\`}>
            {uniqueOptions.length ? uniqueOptions.map((option, index) => <li key={\`\${option}-\${index}\`} id={\`\${id}-option-\${index}\`} className={index === activeOptionIndex && isExpanded ? 'is-active' : ''} role="option" aria-selected={option === currentValue} onPointerDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => chooseOption(option)}>{option}{option === currentValue && <span aria-hidden="true">✓</span>}</li>) : <li role="presentation">No options available</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}`
    }
    case 'modal': {
      const modal = settings.modal
      return `/* Import the matching CSS export alongside this component. */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'

export interface ModalProps {
  triggerText?: string
  title?: string
  description?: string
  size?: 'small' | 'medium' | 'large'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Modal({ triggerText = ${tsxLiteral(modal.triggerText)}, title = ${tsxLiteral(modal.title)}, description = ${tsxLiteral(modal.description)}, size = ${tsxLiteral(modal.size)}, open, onOpenChange }: ModalProps) {
  const id = useId()
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open ?? internalOpen
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (isOpen) dialogRef.current?.focus()
    else if (wasOpen.current) triggerRef.current?.focus()
    wasOpen.current = isOpen
  }, [isOpen])

  function setOpen(nextOpen: boolean) {
    setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return }
    if (event.key !== 'Tab' || !dialogRef.current) return
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }

  function dismissBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) setOpen(false)
  }

  return (
    <div className="il-export-modal">
      <button className="il-export-modal__trigger" ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={isOpen} onClick={() => setOpen(true)}>{triggerText}</button>
      {isOpen && <div className="il-export-modal__backdrop" onMouseDown={dismissBackdrop}>
        <div className="il-export-modal__dialog" data-size={size} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={\`\${id}-title\`} aria-describedby={\`\${id}-description\`} tabIndex={-1} onKeyDown={handleDialogKeyDown}>
          <span className="il-export-modal__eyebrow">INTERFACE LAB · DIALOG</span><h2 className="il-export-modal__title" id={\`\${id}-title\`}>{title}</h2><p className="il-export-modal__description" id={\`\${id}-description\`}>{description}</p>
          <button className="il-export-modal__close" type="button" onClick={() => setOpen(false)}>Close dialog</button><button className="il-export-modal__dismiss" type="button" aria-label="Close dialog" onClick={() => setOpen(false)}>×</button>
        </div>
      </div>}
    </div>
  )
}`
    }
    case 'tooltip': {
      const tooltip = settings.tooltip
      return `/* Import the matching CSS export alongside this component. */
import { useId } from 'react'

export interface TooltipProps {
  triggerText?: string
  content?: string
  placement?: 'top' | 'right' | 'bottom' | 'left'
}

export function Tooltip({ triggerText = ${tsxLiteral(tooltip.triggerText)}, content = ${tsxLiteral(tooltip.content)}, placement = ${tsxLiteral(tooltip.placement)} }: TooltipProps) {
  const id = useId()
  return (
    <div className="il-export-tooltip" data-placement={placement}>
      <button className="il-export-tooltip__trigger" type="button" aria-describedby={id}>{triggerText}</button>
      <span className="il-export-tooltip__bubble" id={id} role="tooltip">{content}</span>
    </div>
  )
}`
    }
    case 'tabs': {
      const tabs = settings.tabs
      const safeLabels = getSafeTabsLabels(tabs.labels)
      const safeContents = getSafeTabsContents(tabs.contents, safeLabels)
      const defaultIndex = safeTabIndex(tabs.activeIndex, safeLabels.length)
      return `/* Import the matching CSS export alongside this component. */
import { useId, useState, type KeyboardEvent } from 'react'

export interface TabsProps {
  labels?: string[]
  contents?: string[]
  activeIndex?: number
  disabled?: boolean
  previewState?: 'default' | 'hover' | 'focus' | 'disabled'
  onActiveIndexChange?: (index: number) => void
}

export function Tabs({ labels = ${JSON.stringify(safeLabels)}, contents = ${JSON.stringify(safeContents)}, activeIndex, disabled = false, previewState = ${tsxLiteral(tabs.previewState)}, onActiveIndexChange }: TabsProps) {
  const id = useId()
  const inputLabels = labels.slice(0, 6)
  const safeTabLabels = inputLabels.length >= 2
    ? inputLabels.map((label, index) => label.trim() || \`Tab \${index + 1}\`)
    : ${JSON.stringify(safeLabels)}
  const safeTabContents = safeTabLabels.map((label, index) => typeof contents[index] === 'string' ? contents[index] : \`This panel is showing the \${label} view.\`)
  const [internalIndex, setInternalIndex] = useState(${defaultIndex})
  const requestedIndex = activeIndex ?? internalIndex
  const selectedIndex = Number.isFinite(requestedIndex) ? Math.max(0, Math.min(safeTabLabels.length - 1, Math.trunc(requestedIndex))) : 0
  const isDisabled = disabled || previewState === 'disabled'

  function activate(index: number) {
    setInternalIndex(index)
    onActiveIndexChange?.(index)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !safeTabLabels.length) return
    event.preventDefault()
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? safeTabLabels.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + safeTabLabels.length) % safeTabLabels.length
    activate(nextIndex)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
  }

  const activeLabel = safeTabLabels[selectedIndex] ?? safeTabLabels[0] ?? 'Overview'
  return (
    <div className="il-export-tabs" data-preview-state={previewState}>
      <div className="il-export-tabs__list" role="tablist" aria-label="Tabs">
        {safeTabLabels.map((label, index) => <button className="il-export-tabs__tab" id={\`\${id}-tab-\${index}\`} key={\`\${label}-\${index}\`} type="button" role="tab" aria-selected={index === selectedIndex} disabled={isDisabled} aria-controls={\`\${id}-tabpanel\`} tabIndex={index === selectedIndex ? 0 : -1} onClick={() => activate(index)} onKeyDown={(event) => handleKeyDown(event,index)}>{label}</button>)}
      </div>
      <section className="il-export-tabs__panel" id={\`\${id}-tabpanel\`} role="tabpanel" aria-labelledby={\`\${id}-tab-\${selectedIndex}\`} tabIndex={0}>
        <span className="il-export-tabs__eyebrow">CURRENT VIEW</span><h3>{activeLabel}</h3><p>{safeTabContents[selectedIndex]}</p>
      </section>
    </div>
  )
}`
    }
  }
}
