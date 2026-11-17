import { useEffect, useMemo, useRef, useState } from 'react'
import type { FontCatalogEntry, FontWeightAvailability } from './fontCatalog'
import { containsFontControlCharacters, makeCustomCssFamily, fontStackUsesFamily, hasDuplicateFingerprint, validateFontFile, validateFontSignature, createFontFingerprint, type FontMetadata } from './customFontFiles'
import { deleteStoredCustomFont, loadStoredCustomFonts, saveStoredCustomFont, type StoredCustomFont } from './customFontStorage'

export type CustomFontState = {
  record: StoredCustomFont
  loaded: boolean
  loadError?: string
}

export type CustomFontLibrary = ReturnType<typeof useCustomFonts>

const registeredFaces = new Map<string, FontFace>()
const pendingFaceLoads = new Map<string, Promise<FontFace>>()

function fontFaceWeight(weights: FontWeightAvailability) {
  return weights.kind === 'variable' ? `${weights.min} ${weights.max}` : String(weights.values[0])
}

function toCatalogEntry(font: CustomFontState): FontCatalogEntry {
  const { record } = font
  return {
    id: `custom-${record.id}`,
    customFontId: record.id,
    name: record.family,
    category: 'custom',
    cssFamily: makeCustomCssFamily(record.family),
    weights: record.weights,
    style: record.style,
    source: 'IndexedDB custom upload',
    assetStatus: 'custom',
  }
}

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function validateMetadata(metadata: FontMetadata): string | null {
  const family = metadata.family.trim()
  if (!family) return 'Enter the font family name shown in its file metadata or documentation.'
  if (family.length > 80 || containsFontControlCharacters(family) || /[;{}]/.test(family)) return 'Use a font family name under 80 characters without control characters, semicolons, or braces.'
  if (metadata.style !== 'normal' && metadata.style !== 'italic') return 'Choose whether this font file is regular or italic.'
  if (!metadata.weights) return 'Enter the file’s weight or variable weight range.'
  if (metadata.weights.kind === 'variable') {
    if (!Number.isFinite(metadata.weights.min) || !Number.isFinite(metadata.weights.max) || metadata.weights.min < 1 || metadata.weights.max > 1000 || metadata.weights.max < metadata.weights.min) return 'Enter a valid variable weight range between 1 and 1000.'
  } else if (metadata.weights.values.length !== 1 || !Number.isFinite(metadata.weights.values[0]) || metadata.weights.values[0] < 1 || metadata.weights.values[0] > 1000) {
    return 'Enter one valid weight between 1 and 1000 for this font file.'
  }
  return null
}

async function registerFontFace(font: StoredCustomFont) {
  if (typeof FontFace === 'undefined' || typeof document === 'undefined') throw new Error('This browser does not support loading custom fonts.')
  const registered = registeredFaces.get(font.id)
  if (registered) return registered
  const pending = pendingFaceLoads.get(font.id)
  if (pending) return pending

  const loading = (async () => {
    const face = new FontFace(font.family, await font.blob.arrayBuffer(), { style: font.style, weight: fontFaceWeight(font.weights) })
    await face.load()
    document.fonts.add(face)
    registeredFaces.set(font.id, face)
    return face
  })()
  pendingFaceLoads.set(font.id, loading)
  try {
    return await loading
  } finally {
    pendingFaceLoads.delete(font.id)
  }
}

export function useCustomFonts() {
  const [fonts, setFonts] = useState<CustomFontState[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [notice, setNotice] = useState('')
  const loadedFaces = useRef(new Map<string, FontFace>())

  useEffect(() => {
    let isCurrent = true
    async function restoreFonts() {
      try {
        const records = await loadStoredCustomFonts()
        const restored = await Promise.all(records.map(async (record): Promise<CustomFontState> => {
          try {
            const face = await registerFontFace(record)
            loadedFaces.current.set(record.id, face)
            return { record, loaded: true }
          } catch {
            return { record, loaded: false, loadError: 'This saved file could not be loaded.' }
          }
        }))
        if (isCurrent) {
          setFonts(restored)
          const failedCount = restored.filter((font) => !font.loaded).length
          if (failedCount) setNotice(`${failedCount} saved font${failedCount === 1 ? '' : 's'} could not be loaded. Remove the file or upload a valid font.`)
        }
      } catch {
        if (isCurrent) setNotice('Custom font storage is unavailable in this browser. Built-in fonts still work.')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }
    void restoreFonts()
    return () => { isCurrent = false }
  }, [])

  const catalogEntries = useMemo(() => fonts.filter((font) => font.loaded).map(toCatalogEntry), [fonts])

  async function addFont(file: File, metadata: FontMetadata): Promise<string | null> {
    const validation = validateFontFile(file)
    if (!validation.ok) return validation.message
    const metadataError = validateMetadata(metadata)
    if (metadataError) return metadataError
    setIsUploading(true)
    setNotice('Reading and validating font…')
    try {
      const buffer = await file.arrayBuffer()
      if (!validateFontSignature(new Uint8Array(buffer), validation.format)) return 'The file contents do not match its font extension.'
      const fingerprint = await createFontFingerprint(buffer, file)
      if (hasDuplicateFingerprint(fingerprint, fonts.map((existing) => existing.record.fingerprint))) return 'This font file has already been added.'
      const font: StoredCustomFont = {
        id: randomId(),
        family: metadata.family.trim(),
        style: metadata.style!,
        weights: metadata.weights!,
        fileName: file.name,
        format: validation.format,
        fingerprint,
        blob: new Blob([buffer], { type: file.type || 'application/octet-stream' }),
        uploadedAt: Date.now(),
      }
      const face = await registerFontFace(font)
      let saved = false
      try {
        saved = await saveStoredCustomFont(font)
      } catch {
        document.fonts.delete(face)
        throw new Error('Could not save in browser font storage.')
      }
      if (!saved) {
        document.fonts.delete(face)
        return 'This font file has already been added.'
      }
      loadedFaces.current.set(font.id, face)
      setFonts((current) => [...current, { record: font, loaded: true }].sort((a, b) => a.record.family.localeCompare(b.record.family)))
      setNotice(`${font.family} is ready to use.`)
      return null
    } catch (error) {
      if (error instanceof Error && error.message.includes('storage')) return 'Could not save this font in browser storage. Check that site storage is available.'
      if (error instanceof Error && error.message.includes('does not support')) return error.message
      return 'This font could not be read or loaded. Check that the file is valid and uncorrupted.'
    } finally {
      setIsUploading(false)
    }
  }

  async function removeFont(id: string, protectedStacks: string[]) {
    const font = fonts.find((candidate) => candidate.record.id === id)
    if (!font) return 'This font is no longer in the library.'
    if (protectedStacks.some((stack) => fontStackUsesFamily(stack, font.record.family))) return 'Choose another Body and Display font before deleting this font.'
    try {
      await deleteStoredCustomFont(id)
      const face = loadedFaces.current.get(id)
      if (face && typeof document !== 'undefined') document.fonts.delete(face)
      registeredFaces.delete(id)
      loadedFaces.current.delete(id)
      setFonts((current) => current.filter((candidate) => candidate.record.id !== id))
      setNotice(`${font.record.family} was removed.`)
      return null
    } catch {
      return 'Could not remove this font from browser storage.'
    }
  }

  return { fonts, catalogEntries, isLoading, isUploading, notice, setNotice, addFont, removeFont }
}
