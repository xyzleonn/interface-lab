import type { DesignTokens } from './tokenTypes'

export type FontCategory = 'sans-serif' | 'serif' | 'monospace' | 'custom'
export type FontWeightAvailability = { kind: 'variable'; min: number; max: number } | { kind: 'static'; values: number[] }
export type FontAssetStatus = 'self-hosted' | 'existing-remote'
export type FontCatalogEntry = {
  id: string
  name: string
  category: FontCategory
  cssFamily: string
  weights: FontWeightAvailability
  source: string
  license?: string
  licenseSource?: string
  assetStatus: FontAssetStatus | 'custom'
  customFontId?: string
  style?: 'normal' | 'italic'
}
export type FontWeightDomain = { min: number; max: number; values?: number[]; compatible?: boolean }

const variable = (min: number, max: number): FontWeightAvailability => ({ kind: 'variable', min, max })
const staticWeights = (...values: number[]): FontWeightAvailability => ({ kind: 'static', values })

export const FONT_CATALOG: FontCatalogEntry[] = [
  {
    id: 'inter',
    name: 'Inter',
    category: 'sans-serif',
    cssFamily: "'Inter', 'DM Sans', ui-sans-serif, system-ui, sans-serif",
    weights: variable(100, 900),
    source: '/fonts/inter-variable.woff2',
    license: 'SIL Open Font License 1.1',
    licenseSource: 'public/fonts/OFL-Inter.txt',
    assetStatus: 'self-hosted',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    category: 'sans-serif',
    cssFamily: "'DM Sans', Inter, ui-sans-serif, system-ui, sans-serif",
    weights: variable(100, 1000),
    source: '/fonts/dm-sans-variable.woff2',
    license: 'SIL Open Font License 1.1',
    licenseSource: 'public/fonts/OFL-DM-Sans.txt',
    assetStatus: 'self-hosted',
  },
  {
    id: 'manrope',
    name: 'Manrope',
    category: 'sans-serif',
    cssFamily: "'Manrope', 'DM Sans', ui-sans-serif, system-ui, sans-serif",
    weights: staticWeights(400, 500, 600, 700),
    source: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap',
    license: 'SIL Open Font License 1.1',
    licenseSource: 'https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt',
    assetStatus: 'existing-remote',
  },
]

export type FontCategoryFilter = 'all' | FontCategory

export function searchFonts(query: string, category: FontCategoryFilter = 'all', catalog: FontCatalogEntry[] = FONT_CATALOG) {
  const normalizedQuery = query.trim().toLowerCase()
  return catalog.filter((font) => (category === 'all' || font.category === category)
    && (!normalizedQuery || font.name.toLowerCase().includes(normalizedQuery)))
}

export function findFontByStack(stack: string, catalog: FontCatalogEntry[] = FONT_CATALOG) {
  return catalog.find((font) => font.cssFamily === stack)
}

export function nearestSupportedWeight(weight: number, availability: FontWeightAvailability) {
  if (availability.kind === 'variable') return Math.max(availability.min, Math.min(availability.max, weight))
  return availability.values.reduce((nearest, value) => Math.abs(value - weight) < Math.abs(nearest - weight) ? value : nearest, availability.values[0] ?? weight)
}

export function updateTypographyFont(tokens: DesignTokens, role: 'body' | 'display', cssFamily: string) {
  const key = role === 'body' ? 'fontBody' : 'fontDisplay'
  return { ...tokens, typography: { ...tokens.typography, [key]: cssFamily } }
}

function supportsWeight(weight: number, availability: FontWeightAvailability) {
  return availability.kind === 'variable'
    ? weight >= availability.min && weight <= availability.max
    : availability.values.includes(weight)
}

function getSelectedFontWeights(stack: string, catalog: FontCatalogEntry[]) {
  const selected = findFontByStack(stack, catalog)
  if (!selected) return null
  if (selected.assetStatus !== 'custom') return selected.weights

  const matchingCustomFiles = catalog.filter((font) => font.assetStatus === 'custom' && font.cssFamily === selected.cssFamily)
  if (matchingCustomFiles.length && matchingCustomFiles.every((font) => font.weights.kind === 'static')) {
    return { kind: 'static' as const, values: [...new Set(matchingCustomFiles.flatMap((font) => font.weights.kind === 'static' ? font.weights.values : []))].sort((a, b) => a - b) }
  }
  return selected.weights
}

export function getFontWeightDomain(bodyStack: string, displayStack: string, catalog: FontCatalogEntry[] = FONT_CATALOG): FontWeightDomain {
  const selectedWeights = [getSelectedFontWeights(bodyStack, catalog), getSelectedFontWeights(displayStack, catalog)].filter((weights): weights is FontWeightAvailability => Boolean(weights))
  if (!selectedWeights.length) return { min: 300, max: 900, compatible: true }
  const firstStatic = selectedWeights.find((weights) => weights.kind === 'static')
  if (firstStatic?.kind === 'static') {
    const common = firstStatic.values.filter((weight) => selectedWeights.every((weights) => supportsWeight(weight, weights)))
    const available = common.length ? common : firstStatic.values
    return { min: available[0], max: available[available.length - 1], values: available, compatible: common.length > 0 }
  }
  const variableFonts = selectedWeights.filter((weights) => weights.kind === 'variable')
  const min = Math.max(...variableFonts.map((weights) => weights.kind === 'variable' ? weights.min : 100))
  const max = Math.min(...variableFonts.map((weights) => weights.kind === 'variable' ? weights.max : 1000))
  return min <= max ? { min, max, compatible: true } : { min: 300, max: 900, compatible: false }
}

export function normalizeWeightToDomain(weight: number, domain: FontWeightDomain) {
  if (domain.values?.length) return domain.values.reduce((nearest, value) => Math.abs(value - weight) < Math.abs(nearest - weight) ? value : nearest, domain.values[0])
  return Math.max(domain.min, Math.min(domain.max, weight))
}

export function adjustTypographyWeights(tokens: DesignTokens, domain: FontWeightDomain) {
  const typography = { ...tokens.typography }
  for (const key of ['weightNormal', 'weightMedium', 'weightStrong'] as const) {
    typography[key] = normalizeWeightToDomain(typography[key], domain)
  }
  return { ...tokens, typography }
}

export function getFontWeightLabel(availability: FontWeightAvailability) {
  return availability.kind === 'variable'
    ? `${availability.min}–${availability.max} variable`
    : availability.values.join(', ')
}
