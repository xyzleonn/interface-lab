import type { ComponentKind, ComponentPreset, EditorSettings } from './editorTypes'

const presetStorageKey = 'interface-lab-component-presets-v1'
const maximumPresetStorageLength = 1_000_000
export type PresetLoadIssue = 'unavailable' | 'malformed' | 'oversized' | 'incompatible'
export type PresetLoadResult = { presets: ComponentPreset[]; issue: PresetLoadIssue | null }
const sizeOptions = ['small', 'medium', 'large']
const buttonVariants = ['primary', 'secondary', 'outline', 'ghost', 'danger']
const badgeVariants = ['solid', 'soft', 'outline']
const cardVariants = ['default', 'elevated', 'outlined', 'interactive']
const inputVariants = ['filled', 'outlined', 'underlined']
const badgeColors = ['neutral', 'primary', 'success', 'warning', 'error']
const tooltipPlacements = ['top', 'right', 'bottom', 'left']
const previewStates = {
  button: ['default', 'hover', 'focus', 'active', 'disabled', 'loading'],
  input: ['default', 'hover', 'focus', 'error'],
  toggle: ['default', 'hover', 'focus', 'disabled'],
  slider: ['default', 'hover', 'focus', 'active', 'disabled'],
  select: ['default', 'hover', 'focus', 'open'],
  tabs: ['default', 'hover', 'focus', 'disabled'],
} as const
const presetPropertyKeys: Record<ComponentKind, readonly string[]> = {
  button: ['variant', 'size', 'radius', 'padding', 'fontSize', 'text', 'previewState'],
  card: ['variant', 'size', 'radius', 'padding', 'shadow', 'borderVisible'],
  input: ['placeholder', 'variant', 'radius', 'size', 'disabled', 'previewState'],
  toggle: ['size', 'accent', 'defaultOn', 'previewState'],
  slider: ['min', 'max', 'value', 'accent', 'previewState'],
  badge: ['text', 'variant', 'color', 'size', 'showDot'],
  alert: ['variant', 'size', 'title', 'description', 'dismissible'],
  select: ['label', 'placeholder', 'options', 'value', 'disabled', 'previewState'],
  modal: ['triggerText', 'title', 'description', 'size'],
  tooltip: ['triggerText', 'content', 'placement'],
  tabs: ['labels', 'contents', 'activeIndex', 'previewState'],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBetween(value: unknown, minimum: number, maximum: number): value is number {
  return isFiniteNumber(value) && value >= minimum && value <= maximum
}

function isAccent(value: unknown): value is string {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)
}

function isProperties(component: unknown, properties: unknown): properties is EditorSettings[keyof EditorSettings] {
  if (!isRecord(properties)) return false

  if (component === 'button') {
    return buttonVariants.includes(String(properties.variant))
      && sizeOptions.includes(String(properties.size))
      && isBetween(properties.radius, 0, 28)
      && isBetween(properties.padding, 8, 40)
      && isBetween(properties.fontSize, 10, 22)
      && typeof properties.text === 'string'
      && properties.text.length <= 160
      && previewStates.button.includes(properties.previewState as (typeof previewStates.button)[number])
  }

  if (component === 'card') {
    return cardVariants.includes(String(properties.variant))
      && sizeOptions.includes(String(properties.size))
      && isBetween(properties.radius, 0, 36)
      && isBetween(properties.padding, 12, 48)
      && isBetween(properties.shadow, 0, 100)
      && typeof properties.borderVisible === 'boolean'
  }

  if (component === 'input') {
    return typeof properties.placeholder === 'string'
      && properties.placeholder.length <= 120
      && inputVariants.includes(String(properties.variant))
      && isBetween(properties.radius, 0, 24)
      && sizeOptions.includes(String(properties.size))
      && typeof properties.disabled === 'boolean'
      && previewStates.input.includes(properties.previewState as (typeof previewStates.input)[number])
  }

  if (component === 'toggle') {
    return isBetween(properties.size, 18, 34)
      && isAccent(properties.accent)
      && typeof properties.defaultOn === 'boolean'
      && previewStates.toggle.includes(properties.previewState as (typeof previewStates.toggle)[number])
  }

  if (component === 'slider') {
    return isBetween(properties.min, -100000, 100000)
      && isBetween(properties.max, -100000, 100000)
      && properties.min < properties.max
      && isBetween(properties.value, properties.min, properties.max)
      && isAccent(properties.accent)
      && previewStates.slider.includes(properties.previewState as (typeof previewStates.slider)[number])
  }

  if (component === 'badge') {
    return typeof properties.text === 'string'
      && properties.text.length <= 120
      && badgeVariants.includes(String(properties.variant))
      && badgeColors.includes(String(properties.color))
      && sizeOptions.includes(String(properties.size))
      && typeof properties.showDot === 'boolean'
  }

  if (component === 'alert') {
    return ['info', 'success', 'warning', 'error'].includes(String(properties.variant))
      && sizeOptions.includes(String(properties.size))
      && typeof properties.title === 'string'
      && properties.title.length <= 120
      && typeof properties.description === 'string'
      && properties.description.length <= 300
      && typeof properties.dismissible === 'boolean'
  }

  if (component === 'select') {
    return typeof properties.label === 'string'
      && properties.label.length <= 80
      && typeof properties.placeholder === 'string'
      && properties.placeholder.length <= 100
      && Array.isArray(properties.options)
      && properties.options.length <= 10
      && properties.options.every((option) => typeof option === 'string' && option.length > 0 && option.length <= 60)
      && typeof properties.value === 'string'
      && properties.value.length <= 60
      && (properties.value === '' || properties.options.includes(properties.value))
      && typeof properties.disabled === 'boolean'
      && previewStates.select.includes(properties.previewState as (typeof previewStates.select)[number])
  }

  if (component === 'modal') {
    return typeof properties.triggerText === 'string'
      && properties.triggerText.length <= 80
      && typeof properties.title === 'string'
      && properties.title.length <= 120
      && typeof properties.description === 'string'
      && properties.description.length <= 500
      && ['small', 'medium', 'large'].includes(String(properties.size))
  }

  if (component === 'tooltip') {
    return typeof properties.triggerText === 'string'
      && properties.triggerText.length <= 80
      && typeof properties.content === 'string'
      && properties.content.length <= 240
      && tooltipPlacements.includes(String(properties.placement))
  }

  if (component === 'tabs') {
    return Array.isArray(properties.labels)
      && properties.labels.length >= 2
      && properties.labels.length <= 6
      && properties.labels.every((label) => typeof label === 'string' && label.length <= 40)
      && Array.isArray(properties.contents)
      && properties.contents.length === properties.labels.length
      && properties.contents.every((content) => typeof content === 'string' && content.length <= 240)
      && isFiniteNumber(properties.activeIndex)
      && Number.isInteger(properties.activeIndex)
      && properties.activeIndex >= 0
      && properties.activeIndex < properties.labels.length
      && previewStates.tabs.includes(properties.previewState as (typeof previewStates.tabs)[number])
  }

  return false
}

function isPreset(value: unknown): value is ComponentPreset {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && value.id.length > 0
    && value.id.length <= 120
    && typeof value.name === 'string'
    && value.name.trim().length > 0
    && value.name.length <= 60
    && isBetween(value.savedAt, 0, 8640000000000000)
    && isProperties(value.component, value.properties)
}

export function loadPresetsWithStatus(): PresetLoadResult {
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

  const migrated = parsed.map(migrateLegacyPreset).map(stripUnknownProperties)
  const candidates = migrated.filter(isPreset)
  const presets = candidates.filter((preset, index) => candidates.findIndex((candidate) => candidate.id === preset.id) === index)
  return { presets, issue: presets.length === parsed.length ? null : 'incompatible' }
}

export function loadPresets(): ComponentPreset[] {
  return loadPresetsWithStatus().presets
}

function stripUnknownProperties(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.properties) || typeof value.component !== 'string' || !Object.hasOwn(presetPropertyKeys, value.component)) return value
  const properties = value.properties
  const keys = presetPropertyKeys[value.component as ComponentKind]
  return {
    ...value,
    properties: Object.fromEntries(keys.filter((key) => key in properties).map((key) => [key, properties[key]])),
  }
}

function storedPresetsAreReadable() {
  const stored = localStorage.getItem(presetStorageKey)
  if (stored === null) return true
  if (stored.length > maximumPresetStorageLength) return false
  return loadPresetsWithStatus().issue === null
}

function migrateLegacyPreset(value: unknown): unknown {
  if (isRecord(value) && isRecord(value.properties)) {
    const properties = value.properties
    if (value.component === 'card') {
      value = { ...value, properties: { variant: 'default', size: 'medium', ...properties } }
    } else if (value.component === 'input') {
      value = { ...value, properties: { variant: 'outlined', ...properties } }
    } else if (value.component === 'alert') {
      value = { ...value, properties: { size: 'medium', ...properties } }
    } else if (value.component === 'badge') {
      const variant = properties.variant === 'default' ? 'solid'
        : properties.variant === 'subtle' ? 'soft'
          : properties.variant === 'outlined' ? 'outline' : properties.variant
      value = { ...value, properties: { ...properties, variant } }
    }
  }
  if (isRecord(value) && isRecord(value.properties)) {
    const defaults: Partial<Record<ComponentKind, string>> = {
      button: 'default', input: 'default', toggle: 'default', slider: 'default', select: 'default', tabs: 'default',
    }
    const defaultState = defaults[value.component as ComponentKind]
    if (defaultState && !('previewState' in value.properties)) {
      value = { ...value, properties: { ...value.properties, previewState: defaultState } }
    }
  }
  if (isRecord(value) && value.component === 'tabs' && isRecord(value.properties)) {
    const properties = value.properties
    if (Array.isArray(properties.labels) && !('contents' in properties)) {
      return {
        ...value,
        properties: {
          ...properties,
          contents: properties.labels.map((label) => `This panel is showing the ${String(label)} view.`),
        },
      }
    }
  }
  if (!isRecord(value) || value.component !== 'badge' || !isRecord(value.properties)) return value
  const properties = value.properties
  if ('color' in properties || !['neutral', 'accent', 'success', 'warning', 'error'].includes(String(properties.variant))) return value
  const color = properties.variant === 'accent' ? 'primary' : properties.variant
  return {
    ...value,
    properties: {
      ...properties,
      variant: 'solid',
      color,
      size: ['small', 'medium'].includes(String(properties.size)) ? properties.size : 'medium',
    },
  }
}

export function savePresets(presets: ComponentPreset[]): boolean {
  try {
    if (!Array.isArray(presets) || !storedPresetsAreReadable()) return false
    const safePresets = presets.map(stripUnknownProperties)
    if (!safePresets.every(isPreset)) return false
    const ids = safePresets.map((preset) => preset.id)
    if (new Set(ids).size !== ids.length) return false
    const serialized = JSON.stringify(safePresets)
    if (serialized.length > maximumPresetStorageLength) return false
    localStorage.setItem(presetStorageKey, serialized)
    return true
  } catch {
    return false
  }
}

export function recoverPresets(presets: ComponentPreset[]): boolean {
  try {
    if (!Array.isArray(presets)) return false
    const safePresets = presets.map(stripUnknownProperties)
    if (!safePresets.every(isPreset)) return false
    const ids = safePresets.map((preset) => preset.id)
    if (new Set(ids).size !== ids.length) return false
    const serialized = JSON.stringify(safePresets)
    if (serialized.length > maximumPresetStorageLength) return false
    localStorage.setItem(presetStorageKey, serialized)
    return true
  } catch {
    return false
  }
}

export function getPresetLoadIssueMessage(issue: PresetLoadIssue | null) {
  if (issue === 'unavailable') return 'Saved component presets could not be read in this browser.'
  if (issue === 'malformed') return 'Saved component preset data could not be parsed. It has been left untouched.'
  if (issue === 'oversized') return 'Saved component preset data exceeds the 1 MB limit. It has been left untouched.'
  if (issue === 'incompatible') return 'Some saved component presets are invalid or incompatible. Valid presets remain available; the stored data has not been changed.'
  return ''
}
