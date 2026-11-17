import type { DesignTokens } from './tokenTypes'
import { normalizeColorHex } from '../../utils/colors'

export const defaultDesignTokens: DesignTokens = {
  colors: {
    primary: '#a997f5',
    secondary: '#83d1ad',
    success: '#7dbb9b',
    warning: '#eab66f',
    error: '#d38b99',
    dark: {
      background: '#111218',
      surface: '#171820',
      surfaceRaised: '#1d1e28',
      text: '#e9e8ef',
      textMuted: '#a1a1ae',
      textDim: '#777885',
      border: '#e4e2f5',
    },
    light: {
      background: '#f3f3f7',
      surface: '#ffffff',
      surfaceRaised: '#fafafe',
      text: '#252431',
      textMuted: '#5e5d6a',
      textDim: '#777582',
      border: '#2a273f',
    },
  },
  typography: {
    fontBody: "'DM Sans', Inter, ui-sans-serif, system-ui, sans-serif",
    fontDisplay: "'Manrope', 'DM Sans', ui-sans-serif, system-ui, sans-serif",
    sizeXs: 12,
    sizeSm: 14,
    sizeMd: 16,
    sizeLg: 20,
    sizeXl: 28,
    weightNormal: 400,
    weightMedium: 550,
    weightStrong: 650,
    lineHeightBody: 1.65,
    letterSpacingHeading: -0.04,
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  shape: { radiusSm: 7, radiusMd: 10, radiusLg: 13, borderWidth: 1, controlHeight: 40, buttonHeight: 42 },
  effects: { shadowX: 0, shadowY: 14, shadowBlur: 38, shadowOpacity: 0.14, borderOpacity: 0.09 },
}

export const normalizeTokenHex = normalizeColorHex

export function getReadableTextColor(color: string) {
  const channels = normalizeTokenHex(color)?.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16)) ?? [169, 151, 245]
  const [red, green, blue] = channels
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  return luminance < 0.52 ? '#ffffff' : '#191722'
}

export function safeFontFamily(value: string, fallback: string) {
  const cleaned = value.trim().slice(0, 120).replace(/[;{}]/g, '')
  return cleaned || fallback
}

function safeNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

function safeColor(value: unknown, fallback: string) {
  return typeof value === 'string' ? normalizeTokenHex(value) ?? fallback : fallback
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

export function normalizeDesignTokens(value: unknown): DesignTokens {
  const raw = asRecord(value)
  const colors = asRecord(raw.colors)
  const typography = asRecord(raw.typography)
  const spacing = asRecord(raw.spacing)
  const shape = asRecord(raw.shape)
  const effects = asRecord(raw.effects)
  const palette = (mode: 'dark' | 'light') => {
    const source = asRecord(colors[mode])
    const fallback = defaultDesignTokens.colors[mode]
    return {
      background: safeColor(source.background, fallback.background),
      surface: safeColor(source.surface, fallback.surface),
      surfaceRaised: safeColor(source.surfaceRaised, fallback.surfaceRaised),
      text: safeColor(source.text, fallback.text),
      textMuted: safeColor(source.textMuted, fallback.textMuted),
      textDim: safeColor(source.textDim, fallback.textDim),
      border: safeColor(source.border, fallback.border),
    }
  }
  const font = (key: 'fontBody' | 'fontDisplay') => safeFontFamily(typeof typography[key] === 'string' ? typography[key] : '', defaultDesignTokens.typography[key])
  const number = (group: 'typography' | 'spacing' | 'shape' | 'effects', key: string, min: number, max: number) => {
    const source = { typography, spacing, shape, effects }[group]
    const fallback = defaultDesignTokens[group][key as never] as number
    return safeNumber(source[key], fallback, min, max)
  }

  return {
    colors: {
      primary: safeColor(colors.primary, defaultDesignTokens.colors.primary),
      secondary: safeColor(colors.secondary, defaultDesignTokens.colors.secondary),
      success: safeColor(colors.success, defaultDesignTokens.colors.success),
      warning: safeColor(colors.warning, defaultDesignTokens.colors.warning),
      error: safeColor(colors.error, defaultDesignTokens.colors.error),
      dark: palette('dark'),
      light: palette('light'),
    },
    typography: {
      fontBody: font('fontBody'), fontDisplay: font('fontDisplay'),
      sizeXs: number('typography', 'sizeXs', 8, 32), sizeSm: number('typography', 'sizeSm', 9, 36), sizeMd: number('typography', 'sizeMd', 10, 40), sizeLg: number('typography', 'sizeLg', 12, 52), sizeXl: number('typography', 'sizeXl', 16, 72),
      weightNormal: number('typography', 'weightNormal', 300, 800), weightMedium: number('typography', 'weightMedium', 300, 800), weightStrong: number('typography', 'weightStrong', 300, 900),
      lineHeightBody: number('typography', 'lineHeightBody', 1, 2.5), letterSpacingHeading: number('typography', 'letterSpacingHeading', -0.12, 0.2),
    },
    spacing: { xs: number('spacing', 'xs', 0, 64), sm: number('spacing', 'sm', 0, 80), md: number('spacing', 'md', 0, 96), lg: number('spacing', 'lg', 0, 120), xl: number('spacing', 'xl', 0, 160), xxl: number('spacing', 'xxl', 0, 200) },
    shape: { radiusSm: number('shape', 'radiusSm', 0, 32), radiusMd: number('shape', 'radiusMd', 0, 40), radiusLg: number('shape', 'radiusLg', 0, 56), borderWidth: number('shape', 'borderWidth', 0, 6), controlHeight: number('shape', 'controlHeight', 28, 72), buttonHeight: number('shape', 'buttonHeight', 28, 80) },
    effects: { shadowX: number('effects', 'shadowX', -24, 48), shadowY: number('effects', 'shadowY', -24, 64), shadowBlur: number('effects', 'shadowBlur', 0, 100), shadowOpacity: number('effects', 'shadowOpacity', 0, 0.6), borderOpacity: number('effects', 'borderOpacity', 0.01, 0.5) },
  }
}
