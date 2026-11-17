import type { FontWeightAvailability } from './fontCatalog'

export const MAX_CUSTOM_FONT_BYTES = 10 * 1024 * 1024

export type FontFileFormat = 'woff2' | 'woff' | 'ttf' | 'otf'
export type FontStyle = 'normal' | 'italic'
export type FontMetadata = {
  family: string
  style?: FontStyle
  weights?: FontWeightAvailability
}
export type FontFileDescriptor = Pick<File, 'name' | 'type' | 'size'>

export function containsFontControlCharacters(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code < 32 || code === 127) return true
  }
  return false
}

const mimeTypes: Record<FontFileFormat, string[]> = {
  woff2: ['font/woff2', 'application/font-woff2', 'application/x-font-woff2'],
  woff: ['font/woff', 'application/font-woff', 'application/x-font-woff'],
  ttf: ['font/ttf', 'application/x-font-ttf', 'application/font-sfnt', 'font/sfnt'],
  otf: ['font/otf', 'application/x-font-opentype', 'application/vnd.ms-opentype', 'application/font-sfnt', 'font/sfnt'],
}

export function getFontFormat(fileName: string): FontFileFormat | null {
  const extension = fileName.toLowerCase().split('.').pop()
  return extension === 'woff2' || extension === 'woff' || extension === 'ttf' || extension === 'otf' ? extension : null
}

export function validateFontFile(file: FontFileDescriptor) {
  const format = getFontFormat(file.name)
  if (!format) return { ok: false as const, message: 'Choose a WOFF2, WOFF, TTF, or OTF font file.' }
  if (file.size <= 0) return { ok: false as const, message: 'This font file is empty.' }
  if (file.size > MAX_CUSTOM_FONT_BYTES) return { ok: false as const, message: 'Font files must be 10 MB or smaller.' }

  const mimeType = file.type.toLowerCase().split(';')[0].trim()
  if (mimeType && mimeType !== 'application/octet-stream' && !mimeTypes[format].includes(mimeType)) {
    return { ok: false as const, message: `The ${mimeType} file type does not match the .${format} extension.` }
  }

  return { ok: true as const, format }
}

const signatures: Record<FontFileFormat, string[][]> = {
  woff2: [['w', 'O', 'F', '2']],
  woff: [['w', 'O', 'F', 'F']],
  ttf: [['\0', '\u0001', '\0', '\0'], ['t', 'r', 'u', 'e']],
  otf: [['O', 'T', 'T', 'O']],
}

export function validateFontSignature(bytes: Uint8Array, format: FontFileFormat) {
  return signatures[format].some((signature) => signature.every((character, index) => bytes[index] === character.charCodeAt(0)))
}

function readU16(view: DataView, offset: number) { return view.getUint16(offset, false) }
function readU32(view: DataView, offset: number) { return view.getUint32(offset, false) }
function readFixed(view: DataView, offset: number) { return view.getInt32(offset, false) / 65536 }

type Table = { offset: number; compressedLength: number; originalLength: number }

function readTables(view: DataView, format: FontFileFormat): Map<string, Table> | null {
  const signature = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset, 4))
  const isWoff = format === 'woff'
  if (format === 'woff2') return null
  if (isWoff ? signature !== 'wOFF' : !['\0\u0001\0\0', 'OTTO', 'true', 'typ1'].includes(signature)) return null

  const count = readU16(view, isWoff ? 12 : 4)
  const directoryStart = isWoff ? 44 : 12
  const recordSize = isWoff ? 20 : 16
  const tables = new Map<string, Table>()
  if (directoryStart + count * recordSize > view.byteLength) return null

  for (let index = 0; index < count; index += 1) {
    const offset = directoryStart + index * recordSize
    const tag = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, 4))
    if (isWoff) {
      tables.set(tag, { offset: readU32(view, offset + 4), compressedLength: readU32(view, offset + 8), originalLength: readU32(view, offset + 12) })
    } else {
      const tableOffset = readU32(view, offset + 8)
      const length = readU32(view, offset + 12)
      tables.set(tag, { offset: tableOffset, compressedLength: length, originalLength: length })
    }
  }
  return tables
}

async function readTable(bytes: Uint8Array, table: Table, format: FontFileFormat) {
  const data = bytes.slice(table.offset, table.offset + table.compressedLength)
  if (data.byteLength !== table.compressedLength) return null
  if (format !== 'woff' || table.compressedLength === table.originalLength) return data
  if (typeof DecompressionStream === 'undefined') return null
  try {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))
    const decompressed = new Uint8Array(await new Response(stream).arrayBuffer())
    return decompressed.byteLength === table.originalLength ? decompressed : null
  } catch {
    return null
  }
}

function decodeName(platform: number, bytes: Uint8Array) {
  if (platform === 0 || platform === 3) {
    let value = ''
    for (let index = 0; index + 1 < bytes.length; index += 2) value += String.fromCharCode((bytes[index] << 8) | bytes[index + 1])
    return value
  }
  if (platform === 1) return new TextDecoder('macintosh').decode(bytes)
  return ''
}

function readNameTable(bytes: Uint8Array): { family?: string; style?: FontStyle } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.byteLength < 6) return {}
  const count = readU16(view, 2)
  const stringOffset = readU16(view, 4)
  if (6 + count * 12 > view.byteLength) return {}
  const names = new Map<number, { value: string; platform: number }[]>()

  for (let index = 0; index < count; index += 1) {
    const offset = 6 + index * 12
    const platform = readU16(view, offset)
    const nameId = readU16(view, offset + 6)
    const length = readU16(view, offset + 8)
    const start = stringOffset + readU16(view, offset + 10)
    if (![1, 2, 16, 17].includes(nameId) || start + length > view.byteLength) continue
    const value = decodeName(platform, bytes.slice(start, start + length)).trim()
    if (!value || containsFontControlCharacters(value)) continue
    const entries = names.get(nameId) ?? []
    entries.push({ value, platform })
    names.set(nameId, entries)
  }

  const preferred = (id: number) => (names.get(id) ?? []).sort((a, b) => Number(b.platform === 3) - Number(a.platform === 3))[0]?.value
  const family = preferred(16) ?? preferred(1)
  const styleName = preferred(17) ?? preferred(2)
  const style = styleName ? (/italic/i.test(styleName) ? 'italic' : /regular|normal|book|medium|bold|light|thin|black/i.test(styleName) ? 'normal' : undefined) : undefined
  return { family, style }
}

function readWeightMetadata(tables: Map<string, Uint8Array>): FontWeightAvailability | undefined {
  const fvar = tables.get('fvar')
  if (fvar && fvar.byteLength >= 16) {
    const view = new DataView(fvar.buffer, fvar.byteOffset, fvar.byteLength)
    const axisOffset = readU16(view, 4)
    const axisCount = readU16(view, 8)
    const axisSize = readU16(view, 10)
    if (axisSize >= 20 && axisOffset + axisCount * axisSize <= view.byteLength) {
      for (let index = 0; index < axisCount; index += 1) {
        const offset = axisOffset + index * axisSize
        const tag = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, 4))
        if (tag === 'wght') {
          const min = Math.round(readFixed(view, offset + 4))
          const max = Math.round(readFixed(view, offset + 12))
          if (min >= 1 && max <= 1000 && max >= min) return { kind: 'variable', min, max }
        }
      }
    }
  }

  const os2 = tables.get('OS/2')
  if (os2 && os2.byteLength >= 6) {
    const weight = new DataView(os2.buffer, os2.byteOffset, os2.byteLength).getUint16(4, false)
    if (weight >= 1 && weight <= 1000) return { kind: 'static', values: [weight] }
  }
  return undefined
}

export async function extractFontMetadata(buffer: ArrayBuffer, format: FontFileFormat): Promise<FontMetadata | null> {
  try {
    const bytes = new Uint8Array(buffer)
    const view = new DataView(buffer)
    const tables = readTables(view, format)
    if (!tables) return null
    const nameRecord = tables.get('name')
    if (!nameRecord) return null
    const [nameBytes, os2Bytes, fvarBytes] = await Promise.all([
      readTable(bytes, nameRecord, format),
      tables.has('OS/2') ? readTable(bytes, tables.get('OS/2')!, format) : Promise.resolve(null),
      tables.has('fvar') ? readTable(bytes, tables.get('fvar')!, format) : Promise.resolve(null),
    ])
    if (!nameBytes) return null
    const names = readNameTable(nameBytes)
    const tableData = new Map<string, Uint8Array>()
    if (os2Bytes) tableData.set('OS/2', os2Bytes)
    if (fvarBytes) tableData.set('fvar', fvarBytes)
    const weights = readWeightMetadata(tableData)
    return { family: names.family ?? '', ...(names.style ? { style: names.style } : {}), ...(weights ? { weights } : {}) }
  } catch {
    return null
  }
}

export async function createFontFingerprint(buffer: ArrayBuffer, file: FontFileDescriptor) {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer)
    return `${file.size}-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
  }
  const bytes = new Uint8Array(buffer)
  let hash = 2166136261
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619)
  return `${file.size}-${(hash >>> 0).toString(16)}`
}

export function hasDuplicateFingerprint(fingerprint: string, existingFingerprints: string[]) {
  return existingFingerprints.includes(fingerprint)
}

export function makeCustomCssFamily(family: string) {
  const escaped = family.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
  return `"${escaped}", "DM Sans", sans-serif`
}

export function fontStackUsesFamily(stack: string, family: string) {
  const names = stack.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^,]+/g) ?? []
  return names.some((name) => {
    const trimmed = name.trim()
    const value = trimmed.length >= 2 && (trimmed.startsWith('"') || trimmed.startsWith("'"))
      ? trimmed.slice(1, -1).replace(/\\(.)/g, '$1')
      : trimmed
    return value.toLowerCase() === family.trim().toLowerCase()
  })
}
