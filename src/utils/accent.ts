import { normalizeColorHex } from './colors.ts'

export const DEFAULT_ACCENT = '#a997f5'

export const ACCENT_PRESETS = [
  { id: 'lavender', label: 'Lavender', color: DEFAULT_ACCENT },
  { id: 'ocean', label: 'Ocean blue', color: '#79b9f2' },
  { id: 'mint', label: 'Soft mint', color: '#83d1ad' },
  { id: 'rose', label: 'Rose pink', color: '#ed91b2' },
  { id: 'amber', label: 'Warm amber', color: '#eab66f' },
] as const

export type AccentPresetId = (typeof ACCENT_PRESETS)[number]['id']

function mixHexColors(color: string, target: string, amount: number) {
  const sourceChannels = color.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16)) ?? [169, 151, 245]
  const targetChannels = target.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16)) ?? [255, 255, 255]
  return `#${sourceChannels.map((channel, index) => Math.round(channel + ((targetChannels[index] ?? channel) - channel) * amount).toString(16).padStart(2, '0')).join('')}`
}

export function deriveAccent(color: string) {
  const normalized = normalizeColorHex(color) ?? DEFAULT_ACCENT
  const channels = normalized.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16)) ?? [169, 151, 245]
  const [red, green, blue] = channels
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  const hoverChannels = channels.map((channel) => Math.round(channel + ((luminance < 0.52 ? 255 : 0) - channel) * 0.12))
  const hover = `#${hoverChannels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
  return {
    color: normalized,
    headingStart: mixHexColors(normalized, '#ffffff', 0.2),
    headingEnd: mixHexColors(normalized, '#000000', 0.08),
    hover,
    soft: `rgb(${red} ${green} ${blue} / 14%)`,
    border: `rgb(${red} ${green} ${blue} / 48%)`,
    glow: `rgb(${red} ${green} ${blue} / 24%)`,
    contrast: luminance < 0.52 ? '#ffffff' : '#191722',
  }
}

export function getAccentCssVariables(color: string) {
  const accent = deriveAccent(color)
  return {
    '--color-accent': accent.color,
    '--color-accent-heading-start': accent.headingStart,
    '--color-accent-heading-end': accent.headingEnd,
    '--color-accent-hover': accent.hover,
    '--color-accent-soft': accent.soft,
    '--color-accent-border': accent.border,
    '--color-accent-glow': accent.glow,
    '--color-accent-contrast': accent.contrast,
  } satisfies Record<string, string>
}
