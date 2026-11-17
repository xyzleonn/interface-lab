import type { ButtonVariant } from '../../components/ui/PlaygroundControls'

export type ComponentKind = 'button' | 'card' | 'input' | 'toggle' | 'slider'

export type EditorSettings = {
  button: { variant: ButtonVariant; size: 'small' | 'medium' | 'large'; radius: number; padding: number; fontSize: number; text: string }
  card: { radius: number; padding: number; shadow: number; borderVisible: boolean }
  input: { placeholder: string; radius: number; size: 'small' | 'medium' | 'large'; disabled: boolean }
  toggle: { size: number; accent: string; defaultOn: boolean }
  slider: { min: number; max: number; value: number; accent: string }
}

export type ComponentPreset = {
  [K in ComponentKind]: {
    id: string
    name: string
    savedAt: number
    component: K
    properties: EditorSettings[K]
  }
}[ComponentKind]
