import { defaultDesignTokens, normalizeDesignTokens, normalizeTokenHex } from './tokenDefaults.ts'
import type { DesignTokens, TokenPreset } from './tokenTypes'

const tokenStorageKey = 'interface-lab-design-tokens-v1'
const presetStorageKey = 'interface-lab-design-token-presets-v1'
const maximumPresetStorageLength = 1_000_000
const incorrectDarkBackground = '#271e27'
export type TokenPresetLoadIssue = 'unavailable' | 'malformed' | 'oversized' | 'incompatible'
export type TokenPresetLoadResult = { presets: TokenPreset[]; issue: TokenPresetLoadIssue | null }

export function loadDesignTokens(): DesignTokens {
  try {
    const stored = localStorage.getItem(tokenStorageKey)
    if (!stored) return normalizeDesignTokens(null)

    const tokens = normalizeDesignTokens(JSON.parse(stored) as unknown)
    if (tokens.colors.dark.background.toLowerCase() === incorrectDarkBackground) {
      tokens.colors.dark.background = defaultDesignTokens.colors.dark.background
      saveDesignTokens(tokens)
    }
    return tokens
  } catch {
    return normalizeDesignTokens(null)
  }
}

export function saveDesignTokens(tokens: DesignTokens) {
  try {
    localStorage.setItem(tokenStorageKey, JSON.stringify(tokens))
    return true
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeTokenPreset(entry: unknown): TokenPreset | null {
  if (!isRecord(entry) || typeof entry.id !== 'string' || !entry.id || entry.id.length > 120 || typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 60 || typeof entry.savedAt !== 'number' || !Number.isFinite(entry.savedAt) || entry.savedAt < 0 || entry.savedAt > 8640000000000000 || !hasCompatibleTokenGroups(entry.tokens)) return null
  const accentColor = typeof entry.accentColor === 'string' ? normalizeTokenHex(entry.accentColor) : null
  if (!accentColor) return null
  return {
    id: entry.id,
    name: entry.name.trim(),
    savedAt: entry.savedAt,
    accentColor,
    tokens: normalizeDesignTokens(entry.tokens),
  }
}

function hasCompatibleTokenGroups(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  if (!['colors', 'typography', 'spacing', 'shape', 'effects'].every((key) => isRecord(value[key]))) return false

  const colors = value.colors as Record<string, unknown>
  const typography = value.typography as Record<string, unknown>
  const colorKeys = ['primary', 'secondary', 'success', 'warning', 'error']
  for (const key of colorKeys) {
    if (key in colors && (typeof colors[key] !== 'string' || !normalizeTokenHex(colors[key]))) return false
  }
  for (const mode of ['dark', 'light']) {
    if (!(mode in colors)) continue
    const palette = colors[mode]
    if (!isRecord(palette)) return false
    for (const key of ['background', 'surface', 'surfaceRaised', 'text', 'textMuted', 'textDim', 'border']) {
      if (key in palette && (typeof palette[key] !== 'string' || !normalizeTokenHex(palette[key]))) return false
    }
  }

  for (const key of ['fontBody', 'fontDisplay']) {
    if (key in typography && typeof typography[key] !== 'string') return false
  }
  for (const group of ['typography', 'spacing', 'shape', 'effects']) {
    const record = value[group] as Record<string, unknown>
    for (const [key, token] of Object.entries(record)) {
      if (key in tokenFieldTypes[group] && (typeof token !== 'number' || !Number.isFinite(token))) return false
    }
  }
  return true
}

const tokenFieldTypes: Record<string, Record<string, true>> = {
  typography: Object.fromEntries(['sizeXs', 'sizeSm', 'sizeMd', 'sizeLg', 'sizeXl', 'weightNormal', 'weightMedium', 'weightStrong', 'lineHeightBody', 'letterSpacingHeading'].map((key) => [key, true])),
  spacing: Object.fromEntries(['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].map((key) => [key, true])),
  shape: Object.fromEntries(['radiusSm', 'radiusMd', 'radiusLg', 'borderWidth', 'controlHeight', 'buttonHeight'].map((key) => [key, true])),
  effects: Object.fromEntries(['shadowX', 'shadowY', 'shadowBlur', 'shadowOpacity', 'borderOpacity'].map((key) => [key, true])),
}

function storedTokenPresetsAreReadable() {
  const stored = localStorage.getItem(presetStorageKey)
  if (stored === null) return true
  if (stored.length > maximumPresetStorageLength) return false
  return loadTokenPresetsWithStatus().issue === null
}

export function loadTokenPresetsWithStatus(): TokenPresetLoadResult {
  let stored: string | null
  try {
    stored = localStorage.getItem(presetStorageKey)
  } catch {
    return { presets: [], issue: 'unavailable' }
  }
  if (stored === null || stored.length === 0) return { presets: [], issue: null }
  if (stored.length > maximumPresetStorageLength) return { presets: [], issue: 'oversized' }

  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    return { presets: [], issue: 'malformed' }
  }
  if (!Array.isArray(parsed)) return { presets: [], issue: 'malformed' }

  const candidates = parsed.map(normalizeTokenPreset).filter((entry): entry is TokenPreset => entry !== null)
  const presets = candidates.filter((preset, index) => candidates.findIndex((candidate) => candidate.id === preset.id) === index)
  return { presets, issue: presets.length === parsed.length ? null : 'incompatible' }
}

export function loadTokenPresets(): TokenPreset[] {
  return loadTokenPresetsWithStatus().presets
}

export function saveTokenPresets(presets: TokenPreset[]) {
  try {
    if (!Array.isArray(presets) || !storedTokenPresetsAreReadable()) return false
    const normalized = presets.map(normalizeTokenPreset)
    if (normalized.some((preset) => preset === null)) return false
    const safePresets = normalized.filter((preset): preset is TokenPreset => preset !== null)
    if (new Set(safePresets.map((preset) => preset.id)).size !== safePresets.length) return false
    const serialized = JSON.stringify(safePresets)
    if (serialized.length > maximumPresetStorageLength) return false
    localStorage.setItem(presetStorageKey, serialized)
    return true
  } catch {
    return false
  }
}

export function recoverTokenPresets(presets: TokenPreset[]) {
  try {
    if (!Array.isArray(presets)) return false
    const normalized = presets.map(normalizeTokenPreset)
    if (normalized.some((preset) => preset === null)) return false
    const safePresets = normalized.filter((preset): preset is TokenPreset => preset !== null)
    if (new Set(safePresets.map((preset) => preset.id)).size !== safePresets.length) return false
    const serialized = JSON.stringify(safePresets)
    if (serialized.length > maximumPresetStorageLength) return false
    localStorage.setItem(presetStorageKey, serialized)
    return true
  } catch {
    return false
  }
}

export function getTokenPresetLoadIssueMessage(issue: TokenPresetLoadIssue | null) {
  if (issue === 'unavailable') return 'Saved design token presets could not be read in this browser.'
  if (issue === 'malformed') return 'Saved design token preset data could not be parsed. It has been left untouched.'
  if (issue === 'oversized') return 'Saved design token preset data exceeds the 1 MB limit. It has been left untouched.'
  if (issue === 'incompatible') return 'Some saved design token presets are invalid or incompatible. Valid presets remain available; the stored data has not been changed.'
  return ''
}
