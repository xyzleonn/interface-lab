import type { CSSProperties, InputHTMLAttributes } from 'react'
import './RangeSlider.css'

type RangeSliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'min' | 'max' | 'value' | 'style'> & {
  min: number
  max: number
  value: number
  accentColor?: string
  style?: CSSProperties
}

type RangeSliderStyle = CSSProperties & {
  '--range-progress': string
  '--range-accent': string
}

export function RangeSlider({ min, max, value, accentColor, className = '', style, ...inputProps }: RangeSliderProps) {
  const progress = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0
  const rangeStyle: RangeSliderStyle = {
    ...style,
    '--range-progress': `${progress}%`,
    '--range-accent': accentColor ?? 'var(--color-accent)',
  }

  return (
    <input
      {...inputProps}
      className={`il-range${className ? ` ${className}` : ''}`}
      type="range"
      min={min}
      max={max}
      value={value}
      style={rangeStyle}
    />
  )
}
