export type ModePalette = {
  background: string
  surface: string
  surfaceRaised: string
  text: string
  textMuted: string
  textDim: string
  border: string
}

export type DesignTokens = {
  colors: {
    primary: string
    secondary: string
    success: string
    warning: string
    error: string
    dark: ModePalette
    light: ModePalette
  }
  typography: {
    fontBody: string
    fontDisplay: string
    sizeXs: number
    sizeSm: number
    sizeMd: number
    sizeLg: number
    sizeXl: number
    weightNormal: number
    weightMedium: number
    weightStrong: number
    lineHeightBody: number
    letterSpacingHeading: number
  }
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number }
  shape: { radiusSm: number; radiusMd: number; radiusLg: number; borderWidth: number; controlHeight: number; buttonHeight: number }
  effects: { shadowX: number; shadowY: number; shadowBlur: number; shadowOpacity: number; borderOpacity: number }
}

export type TokenPreset = {
  id: string
  name: string
  savedAt: number
  accentColor: string
  tokens: DesignTokens
}
