import type { ComponentPreset, EditorSettings } from './editorTypes'

const presetStorageKey = 'interface-lab-component-presets-v1'
const sizeOptions = ['small', 'medium', 'large']
const buttonVariants = ['primary', 'secondary', 'ghost']
const badgeVariants = ['neutral', 'accent', 'success', 'warning', 'error']
const tooltipPlacements = ['top', 'right', 'bottom', 'left']

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
  }

  if (component === 'card') {
    return isBetween(properties.radius, 0, 36)
      && isBetween(properties.padding, 12, 48)
      && isBetween(properties.shadow, 0, 100)
      && typeof properties.borderVisible === 'boolean'
  }

  if (component === 'input') {
    return typeof properties.placeholder === 'string'
      && properties.placeholder.length <= 120
      && isBetween(properties.radius, 0, 24)
      && sizeOptions.includes(String(properties.size))
      && typeof properties.disabled === 'boolean'
  }

  if (component === 'toggle') {
    return isBetween(properties.size, 18, 34)
      && isAccent(properties.accent)
      && typeof properties.defaultOn === 'boolean'
  }

  if (component === 'slider') {
    return isBetween(properties.min, -100000, 100000)
      && isBetween(properties.max, -100000, 100000)
      && properties.min < properties.max
      && isBetween(properties.value, properties.min, properties.max)
      && isAccent(properties.accent)
  }

  if (component === 'badge') {
    return typeof properties.text === 'string'
      && properties.text.length <= 120
      && badgeVariants.includes(String(properties.variant))
      && ['small', 'medium'].includes(String(properties.size))
      && typeof properties.showDot === 'boolean'
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
      && isFiniteNumber(properties.activeIndex)
      && Number.isInteger(properties.activeIndex)
      && properties.activeIndex >= 0
      && properties.activeIndex < properties.labels.length
  }

  return false
}

function isPreset(value: unknown): value is ComponentPreset {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.name === 'string'
    && value.name.trim().length > 0
    && value.name.length <= 60
    && isBetween(value.savedAt, 0, 8640000000000000)
    && isProperties(value.component, value.properties)
}

export function loadPresets(): ComponentPreset[] {
  try {
    const stored = localStorage.getItem(presetStorageKey)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    const validPresets = parsed.filter(isPreset)
    return validPresets.filter((preset, index) => validPresets.findIndex((candidate) => candidate.id === preset.id) === index)
  } catch {
    return []
  }
}

export function savePresets(presets: ComponentPreset[]): boolean {
  try {
    localStorage.setItem(presetStorageKey, JSON.stringify(presets))
    return true
  } catch {
    return false
  }
}
