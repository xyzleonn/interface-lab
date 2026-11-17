import type { FontWeightAvailability } from './fontCatalog'
import type { FontFileFormat, FontStyle } from './customFontFiles'
import { containsFontControlCharacters, MAX_CUSTOM_FONT_BYTES } from './customFontFiles.ts'

const databaseName = 'interface-lab-custom-fonts-v1'
const objectStoreName = 'fonts'
let databasePromise: Promise<IDBDatabase> | null = null

export type StoredCustomFont = {
  id: string
  family: string
  style: FontStyle
  weights: FontWeightAvailability
  fileName: string
  format: FontFileFormat
  fingerprint: string
  blob: Blob
  uploadedAt: number
}

function isFontWeightAvailability(value: unknown): value is FontWeightAvailability {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  if (candidate.kind === 'variable') return typeof candidate.min === 'number' && typeof candidate.max === 'number' && candidate.min >= 1 && candidate.max <= 1000 && candidate.max >= candidate.min
  return candidate.kind === 'static' && Array.isArray(candidate.values) && candidate.values.length > 0 && candidate.values.every((weight) => typeof weight === 'number' && weight >= 1 && weight <= 1000)
}

function isStoredCustomFont(value: unknown): value is StoredCustomFont {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredCustomFont>
  return typeof candidate.id === 'string'
    && typeof candidate.family === 'string' && candidate.family.trim().length > 0 && candidate.family.length <= 80 && !containsFontControlCharacters(candidate.family) && !/[;{}]/.test(candidate.family)
    && (candidate.style === 'normal' || candidate.style === 'italic')
    && isFontWeightAvailability(candidate.weights)
    && typeof candidate.fileName === 'string' && typeof candidate.fingerprint === 'string'
    && (candidate.format === 'woff2' || candidate.format === 'woff' || candidate.format === 'ttf' || candidate.format === 'otf')
    && candidate.blob instanceof Blob && candidate.blob.size > 0 && candidate.blob.size <= MAX_CUSTOM_FONT_BYTES
    && typeof candidate.uploadedAt === 'number'
}

function openDatabase() {
  if (databasePromise) return databasePromise
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Browser font storage is not available.'))
      return
    }
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(objectStoreName)) {
        const store = database.createObjectStore(objectStoreName, { keyPath: 'id' })
        store.createIndex('fingerprint', 'fingerprint', { unique: true })
      }
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close()
        databasePromise = null
      }
      resolve(request.result)
    }
    request.onerror = () => reject(request.error ?? new Error('Could not open local font storage.'))
    request.onblocked = () => reject(new Error('Local font storage is busy in another app tab.'))
  }).catch((error: unknown) => {
    databasePromise = null
    throw error
  })
  return databasePromise
}

function completeTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not update local font storage.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Local font storage update was canceled.'))
  })
}

export async function loadStoredCustomFonts() {
  const database = await openDatabase()
  const transaction = database.transaction(objectStoreName, 'readonly')
  const completion = completeTransaction(transaction)
  const requestResult = new Promise<unknown[]>((resolve, reject) => {
    const request = transaction.objectStore(objectStoreName).getAll()
    request.onsuccess = () => resolve(request.result as unknown[])
    request.onerror = () => reject(request.error ?? new Error('Could not read saved fonts.'))
  })
  const [result] = await Promise.all([requestResult, completion])
  return result.filter(isStoredCustomFont)
}

export async function saveStoredCustomFont(font: StoredCustomFont) {
  if (!isStoredCustomFont(font)) throw new Error('The font details could not be validated for local storage.')
  const database = await openDatabase()
  const transaction = database.transaction(objectStoreName, 'readwrite')
  const completion = completeTransaction(transaction)
  const requestResult = new Promise<boolean>((resolve, reject) => {
    const request = transaction.objectStore(objectStoreName).add(font)
    request.onsuccess = () => resolve(true)
    request.onerror = (event) => {
      if (request.error?.name === 'ConstraintError') {
        event.preventDefault()
        event.stopPropagation()
        resolve(false)
      } else {
        reject(request.error ?? new Error('Could not save this font.'))
      }
    }
  })
  const [saved] = await Promise.all([requestResult, completion])
  return saved
}

export async function deleteStoredCustomFont(id: string) {
  const database = await openDatabase()
  const transaction = database.transaction(objectStoreName, 'readwrite')
  const completion = completeTransaction(transaction)
  transaction.objectStore(objectStoreName).delete(id)
  await completion
}
