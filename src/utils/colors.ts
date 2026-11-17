export function normalizeColorHex(value: string): string | null {
  const hex = value.trim().replace(/^#/, '')
  if (/^[\da-f]{3}$/i.test(hex)) return `#${hex.split('').map((digit) => digit + digit).join('').toLowerCase()}`
  if (/^[\da-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`
  return null
}
