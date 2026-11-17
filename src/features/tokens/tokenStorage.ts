import { defaultDesignTokens, normalizeDesignTokens, normalizeTokenHex } from './tokenDefaults'
import type { DesignTokens, TokenPreset } from './tokenTypes'

const tokenStorageKey = 'interface-lab-design-tokens-v1'
const presetStorageKey = 'interface-lab-design-token-presets-v1'
const incorrectDarkBackground = '#271e27'

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
  return typeof value === 'object' && value !== null
}

export function loadTokenPresets(): TokenPreset[] {
  try {
    const stored = localStorage.getItem(presetStorageKey)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((entry): TokenPreset[] => {
      if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.name !== 'string' || !entry.name.trim() || typeof entry.savedAt !== 'number' || !isRecord(entry.tokens)) return []
      const accentColor = typeof entry.accentColor === 'string' ? normalizeTokenHex(entry.accentColor) : null
      if (!accentColor) return []
      return [{ id: entry.id, name: entry.name.slice(0, 60), savedAt: entry.savedAt, accentColor, tokens: normalizeDesignTokens(entry.tokens) }]
    })
  } catch {
    return []
  }
}

export function saveTokenPresets(presets: TokenPreset[]) {
  try {
    localStorage.setItem(presetStorageKey, JSON.stringify(presets))
    return true
  } catch {
    return false
  }
}
