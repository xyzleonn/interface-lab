import type { DesignTokens } from './tokenTypes'

export function getAppearancePreviewVariables(tokens: DesignTokens, mode: 'dark' | 'light') {
  const palette = tokens.colors[mode]
  return {
    '--appearance-preview-canvas': palette.background,
    '--appearance-preview-surface': palette.surface,
    '--appearance-preview-border': palette.border,
    '--appearance-preview-text': palette.text,
    '--appearance-preview-muted': palette.textMuted,
  } satisfies Record<`--appearance-preview-${string}`, string>
}
