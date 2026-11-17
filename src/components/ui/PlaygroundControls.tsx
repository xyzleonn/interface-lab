import type { CSSProperties, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

export function DemoButton({
  variant,
  disabled = false,
  children,
  className = '',
  style,
  ariaBusy = false,
  previewState = 'default',
}: {
  variant: ButtonVariant
  disabled?: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
  ariaBusy?: boolean
  previewState?: string
}) {
  return (
    <button className={`demo-button ${variant} ${className}`} type="button" disabled={disabled} aria-busy={ariaBusy || undefined} data-preview-state={previewState} style={style}>
      {children}
    </button>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  style,
  className = '',
  disabled = false,
  'data-preview-state': previewState,
}: {
  checked: boolean
  onChange: () => void
  label: string
  style?: CSSProperties
  className?: string
  disabled?: boolean
  'data-preview-state'?: string
}) {
  return (
    <button className={`toggle${checked ? ' is-on' : ''} ${className}`} type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} data-preview-state={previewState} onClick={onChange} style={style}>
      <span />
    </button>
  )
}
