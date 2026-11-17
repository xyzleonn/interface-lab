import type { DesignTokens } from './tokenTypes'
import { getReadableTextColor } from './tokenDefaults.ts'

function toRgba(hex: string, opacity: number) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16)) ?? [228, 226, 245]
  return `rgb(${channels.join(' ')} / ${opacity})`
}

export function getDesignTokenVariables(tokens: DesignTokens, mode: 'dark' | 'light', accentColor: string) {
  const palette = tokens.colors[mode]
  return {
    '--color-primary': tokens.colors.primary,
    '--color-primary-contrast': getReadableTextColor(tokens.colors.primary),
    '--color-secondary': tokens.colors.secondary,
    '--color-success': tokens.colors.success,
    '--color-warning': tokens.colors.warning,
    '--color-error': tokens.colors.error,
    '--color-canvas': palette.background,
    '--color-surface': palette.surface,
    '--color-surface-raised': palette.surfaceRaised,
    '--color-text': palette.text,
    '--color-text-muted': palette.textMuted,
    '--color-text-dim': palette.textDim,
    '--color-border': toRgba(palette.border, tokens.effects.borderOpacity),
    '--color-border-soft': toRgba(palette.border, tokens.effects.borderOpacity * 0.68),
    '--font-body': tokens.typography.fontBody,
    '--font-display': tokens.typography.fontDisplay,
    '--font-size-xs': `${tokens.typography.sizeXs}px`,
    '--font-size-sm': `${tokens.typography.sizeSm}px`,
    '--font-size-md': `${tokens.typography.sizeMd}px`,
    '--font-size-lg': `${tokens.typography.sizeLg}px`,
    '--font-size-xl': `${tokens.typography.sizeXl}px`,
    '--font-weight-normal': `${tokens.typography.weightNormal}`,
    '--font-weight-medium': `${tokens.typography.weightMedium}`,
    '--font-weight-strong': `${tokens.typography.weightStrong}`,
    '--line-height-body': `${tokens.typography.lineHeightBody}`,
    '--letter-spacing-heading': `${tokens.typography.letterSpacingHeading}em`,
    '--spacing-xs': `${tokens.spacing.xs}px`,
    '--spacing-sm': `${tokens.spacing.sm}px`,
    '--spacing-md': `${tokens.spacing.md}px`,
    '--spacing-lg': `${tokens.spacing.lg}px`,
    '--spacing-xl': `${tokens.spacing.xl}px`,
    '--spacing-2xl': `${tokens.spacing.xxl}px`,
    '--radius-sm': `${tokens.shape.radiusSm}px`,
    '--radius-md': `${tokens.shape.radiusMd}px`,
    '--radius-lg': `${tokens.shape.radiusLg}px`,
    '--border-width': `${tokens.shape.borderWidth}px`,
    '--control-height': `${tokens.shape.controlHeight}px`,
    '--button-height': `${tokens.shape.buttonHeight}px`,
    '--shadow-card': `${tokens.effects.shadowX}px ${tokens.effects.shadowY}px ${tokens.effects.shadowBlur}px rgb(0 0 0 / ${tokens.effects.shadowOpacity}), inset 0 1px rgb(255 255 255 / 3%)`,
    '--color-accent': accentColor,
  } satisfies Record<string, string>
}

export function getPreviewTokenVariables(tokens: DesignTokens, mode: 'dark' | 'light', accentColor: string) {
  const globalTokenEntries = Object.entries(getDesignTokenVariables(tokens, mode, accentColor))
  const scopedVariables = Object.fromEntries(
    globalTokenEntries.map(([name, value]) => [`--preview-${name.slice(2)}`, value]),
  )
  return scopedVariables satisfies Record<`--preview-${string}`, string>
}

export function designTokensToCss(tokens: DesignTokens, mode: 'dark' | 'light', accentColor: string, typographyCss = '') {
  const declarations = Object.entries(getDesignTokenVariables(tokens, mode, accentColor))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n')
  return `${typographyCss ? `${typographyCss}\n\n` : ''}:root {\n${declarations}\n}\n\n:where(body) {\n  font-family: var(--font-body);\n  font-synthesis: none;\n  font-weight: var(--font-weight-normal);\n  line-height: var(--line-height-body);\n}\n\n:where(h1, h2, h3, h4, h5, h6) {\n  font-family: var(--font-display);\n}`
}
