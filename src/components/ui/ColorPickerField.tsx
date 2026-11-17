import { useId, useState, type ChangeEvent } from 'react'
import { normalizeColorHex } from '../../utils/colors'
import './ColorPickerField.css'

type ColorPickerFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  normalize?: (value: string) => string | null
  className?: string
  showLabel?: boolean
  commitOnChange?: boolean
  revertInvalidOnBlur?: boolean
}

export function ColorPickerField({ label, value, onChange, normalize = normalizeColorHex, className = '', showLabel = true, commitOnChange = false, revertInvalidOnBlur = false }: ColorPickerFieldProps) {
  const id = useId()
  const [hexDraft, setHexDraft] = useState({ source: value, text: value })
  const [hexStatus, setHexStatus] = useState({ source: value, invalid: false })
  const hexValue = hexDraft.source === value ? hexDraft.text : value
  const invalid = hexStatus.source === value && hexStatus.invalid

  function updatePickerColor(color: string) {
    setHexStatus({ source: color, invalid: false })
    setHexDraft({ source: color, text: color })
    onChange(color)
  }

  function updateHexDraft(event: ChangeEvent<HTMLInputElement>) {
    const text = event.currentTarget.value
    const normalized = normalize(text)
    setHexDraft({ source: value, text })
    if (commitOnChange) {
      setHexStatus({ source: value, invalid: !normalized })
      if (normalized) {
        setHexDraft({ source: normalized, text })
        onChange(normalized)
      }
    }
  }

  function commitHexDraft(event: ChangeEvent<HTMLInputElement>) {
    const normalized = normalize(event.currentTarget.value)
    if (normalized) {
      setHexStatus({ source: normalized, invalid: false })
      setHexDraft({ source: normalized, text: normalized })
      onChange(normalized)
    } else {
      setHexStatus({ source: value, invalid: !revertInvalidOnBlur })
      setHexDraft({ source: value, text: value })
    }
  }

  return (
    <div className={`color-picker-field${showLabel ? ' has-label' : ''}${className ? ` ${className}` : ''}`}>
      {showLabel && <span className="color-picker-field-label" id={`${id}-label`}>{label}</span>}
      <label className="color-picker-swatch-control">
        <span className="color-picker-swatch-preview" aria-hidden="true" style={{ backgroundColor: value }} />
        <input
          aria-label={`${label} color picker`}
          aria-labelledby={showLabel ? `${id}-label` : undefined}
          type="color"
          value={value}
          onInput={(event) => updatePickerColor(event.currentTarget.value)}
          onChange={(event) => updatePickerColor(event.currentTarget.value)}
        />
      </label>
      <input
        aria-label={`${label} HEX value`}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={`color-picker-hex${invalid ? ' is-invalid' : ''}`}
        value={hexValue}
        maxLength={7}
        spellCheck={false}
        onChange={updateHexDraft}
        onBlur={commitHexDraft}
      />
      {invalid && <small className="color-picker-error" id={`${id}-error`} role="status">Use a valid HEX value.</small>}
    </div>
  )
}
