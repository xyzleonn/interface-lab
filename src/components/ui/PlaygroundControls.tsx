import type { CSSProperties, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

export function DemoButton({
  variant,
  disabled = false,
  children,
  className = '',
  style,
}: {
  variant: ButtonVariant
  disabled?: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <button className={`demo-button ${variant} ${className}`} type="button" disabled={disabled} style={style}>
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
}: {
  checked: boolean
  onChange: () => void
  label: string
  style?: CSSProperties
  className?: string
}) {
  return (
    <button className={`toggle${checked ? ' is-on' : ''} ${className}`} type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} style={style}>
      <span />
    </button>
  )
}
