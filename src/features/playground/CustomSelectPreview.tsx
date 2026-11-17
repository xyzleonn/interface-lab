import { CustomSelect } from './CustomSelect'
import type { SelectSettings } from './editorTypes'

type CustomSelectPreviewProps = SelectSettings & {
  onChange: (value: string) => void
}

export function CustomSelectPreview({ label, placeholder, options, value, disabled, onChange }: CustomSelectPreviewProps) {
  return (
    <CustomSelect
      label={label}
      placeholder={placeholder}
      options={options.map((option) => ({ value: option, label: option }))}
      value={value}
      disabled={disabled}
      onChange={onChange}
    />
  )
}
