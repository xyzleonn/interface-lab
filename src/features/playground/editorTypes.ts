import type { ButtonVariant } from '../../components/ui/PlaygroundControls'

export type EditorComponentKind = 'button' | 'card' | 'input' | 'toggle' | 'slider'
export type ComponentKind = EditorComponentKind | 'badge' | 'select' | 'modal' | 'tooltip' | 'tabs'

export type BadgeSettings = {
  text: string
  variant: 'neutral' | 'accent' | 'success' | 'warning' | 'error'
  size: 'small' | 'medium'
  showDot: boolean
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

export type TabsSettings = {
  labels: string[]
  activeIndex: number
}

export type EditorSettings = {
  button: { variant: ButtonVariant; size: 'small' | 'medium' | 'large'; radius: number; padding: number; fontSize: number; text: string }
  card: { radius: number; padding: number; shadow: number; borderVisible: boolean }
  input: { placeholder: string; radius: number; size: 'small' | 'medium' | 'large'; disabled: boolean }
  toggle: { size: number; accent: string; defaultOn: boolean }
  slider: { min: number; max: number; value: number; accent: string }
  badge: BadgeSettings
  select: SelectSettings
  modal: ModalSettings
  tooltip: TooltipSettings
  tabs: TabsSettings
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
