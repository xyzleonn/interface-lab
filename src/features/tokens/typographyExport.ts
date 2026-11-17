import { type FontCatalogEntry, type FontWeightAvailability } from './fontCatalog.ts'
import { fontStackUsesFamily } from './customFontFiles.ts'
import type { DesignTokens } from './tokenTypes'

type ExportableCustomFont = {
  record: {
    id: string
    family: string
    fileName: string
    format: 'woff2' | 'woff' | 'ttf' | 'otf'
    style: 'normal' | 'italic'
    weights: FontWeightAvailability
    blob: Blob
  }
  loaded: boolean
}

type FontAssetLoader = (url: string) => Promise<Blob>

const formatTypes = {
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  otf: 'font/otf',
} as const

function escapeCssString(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replace(/[\n\r\f]/g, (character) => `\\${character.charCodeAt(0).toString(16)} `)
}

function safeCssComment(value: string) {
  return value.replace(/[\r\n]/g, ' ').replaceAll('*/', '* /')
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

async function blobToDataUrl(blob: Blob, format: keyof typeof formatTypes) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return `data:${formatTypes[format]};base64,${bytesToBase64(bytes)}`
}

async function fetchFontAsset(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load font asset ${url}.`)
  return response.blob()
}

function fontFaceRule(family: string, source: string, format: keyof typeof formatTypes, style: string, weights: FontWeightAvailability, assetName: string) {
  if (weights.kind === 'static' && weights.values.length > 1) {
    throw new Error(`The static font asset “${assetName}” has multiple weight values but only one file. Export each weight as its own font file.`)
  }
  const weight = weights.kind === 'variable' ? `${weights.min} ${weights.max}` : String(weights.values[0] ?? 400)
  return `/* Font asset: ${safeCssComment(assetName)} */\n@font-face {\n  font-family: "${escapeCssString(family)}";\n  src: url("${source}") format("${format}");\n  font-style: ${style};\n  font-weight: ${weight};\n  font-display: swap;\n}`
}

function selectedFonts(typography: Pick<DesignTokens['typography'], 'fontBody' | 'fontDisplay'>, catalog: FontCatalogEntry[]) {
  const stacks = [typography.fontBody, typography.fontDisplay]
  const selected = catalog.filter((font) => stacks.some((stack) => fontStackUsesFamily(stack, font.name)))
  return [...new Map(selected.map((font) => [font.id, font])).values()]
}

function inferBuiltInFormat(font: FontCatalogEntry): keyof typeof formatTypes | null {
  const extension = font.source.split(/[?#]/)[0].split('.').pop()?.toLowerCase()
  return extension && extension in formatTypes ? extension as keyof typeof formatTypes : null
}

/** Builds only the font faces used by the current Body and Display token stacks. */
export async function generateTypographyFontCss(
  typography: Pick<DesignTokens['typography'], 'fontBody' | 'fontDisplay'>,
  catalog: FontCatalogEntry[],
  customFonts: ExportableCustomFont[],
  assetLoader: FontAssetLoader = fetchFontAsset,
) {
  const stacks = [typography.fontBody, typography.fontDisplay]
  for (const custom of customFonts) {
    if (!custom.loaded && stacks.some((stack) => fontStackUsesFamily(stack, custom.record.family))) {
      throw new Error(`The selected custom font “${custom.record.family}” could not be loaded. Restore or upload its file before exporting.`)
    }
  }
  const selected = selectedFonts(typography, catalog)
  const imports: string[] = []
  const faces: string[] = []

  for (const font of selected) {
    if (font.assetStatus === 'existing-remote') {
      imports.push(`@import url("${font.source.replaceAll('"', '%22')}");`)
      continue
    }

    let blob: Blob
    let format: keyof typeof formatTypes
    let fileName: string
    let family = font.name
    let style = font.style ?? 'normal'
    let weights = font.weights

    if (font.assetStatus === 'custom') {
      const custom = customFonts.find((candidate) => candidate.record.id === font.customFontId)
      if (!custom || !custom.loaded) throw new Error(`The selected custom font “${font.name}” is unavailable. Restore or upload its file before exporting.`)
      blob = custom.record.blob
      format = custom.record.format
      fileName = custom.record.fileName
      family = custom.record.family
      style = custom.record.style
      weights = custom.record.weights
    } else {
      const detectedFormat = inferBuiltInFormat(font)
      if (!detectedFormat) throw new Error(`The asset format for “${font.name}” is not supported for export.`)
      blob = await assetLoader(font.source)
      format = detectedFormat
      fileName = font.source.split(/[?#]/)[0].split('/').pop() ?? `${font.id}.${format}`
    }

    const source = await blobToDataUrl(blob, format)
    faces.push(fontFaceRule(family, source, format, style, weights, fileName))
  }

  return [...imports, ...faces].join('\n\n')
}
