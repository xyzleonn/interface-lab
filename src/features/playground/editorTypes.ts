import type { ButtonVariant } from '../../components/ui/PlaygroundControls'

export type EditorComponentKind = 'button' | 'card' | 'input' | 'toggle' | 'slider'
export type ComponentKind = EditorComponentKind | 'badge' | 'alert' | 'select' | 'modal' | 'tooltip' | 'tabs'

export type BadgeSettings = {
  text: string
  variant: 'default' | 'subtle' | 'outlined'
  color: 'neutral' | 'primary' | 'success' | 'warning' | 'error'
  size: 'small' | 'medium' | 'large'
  showDot: boolean
}

export type AlertSettings = {
  variant: 'info' | 'success' | 'warning' | 'error'
  title: string
  description: string
  dismissible: boolean
}

export type SelectSettings = {
  label: string
  placeholder: string
  options: string[]
  value: string
  disabled: boolean
}

export type ModalSettings = {
  triggerText: string
  title: string
  description: string
  size: 'small' | 'medium' | 'large'
}

export type TooltipSettings = {
  triggerText: string
  content: string
  placement: 'top' | 'right' | 'bottom' | 'left'
}

export type ButtonPreviewState = 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'loading'
export type InputPreviewState = 'default' | 'hover' | 'focus' | 'error'
export type TogglePreviewState = 'default' | 'hover' | 'focus' | 'disabled'
export type SliderPreviewState = 'default' | 'hover' | 'focus' | 'active' | 'disabled'
export type SelectPreviewState = 'default' | 'hover' | 'focus' | 'open'
export type TabsPreviewState = 'default' | 'hover' | 'focus' | 'disabled'

export type TabsSettings = {
  labels: string[]
  contents: string[]
  activeIndex: number
}

export type EditorSettings = {
  button: { variant: ButtonVariant; size: 'small' | 'medium' | 'large'; radius: number; padding: number; fontSize: number; text: string; previewState: ButtonPreviewState }
  card: { radius: number; padding: number; shadow: number; borderVisible: boolean }
  input: { placeholder: string; radius: number; size: 'small' | 'medium' | 'large'; disabled: boolean; previewState: InputPreviewState }
  toggle: { size: number; accent: string; defaultOn: boolean; previewState: TogglePreviewState }
  slider: { min: number; max: number; value: number; accent: string; previewState: SliderPreviewState }
  badge: BadgeSettings
  alert: AlertSettings
  select: SelectSettings & { previewState: SelectPreviewState }
  modal: ModalSettings
  tooltip: TooltipSettings
  tabs: TabsSettings & { previewState: TabsPreviewState }
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
