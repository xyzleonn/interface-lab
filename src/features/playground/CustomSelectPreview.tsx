import { CustomSelect } from './CustomSelect'
import type { SelectSettings } from './editorTypes'

type CustomSelectPreviewProps = SelectSettings & {
  previewState: 'default' | 'hover' | 'focus' | 'open'
  onChange: (value: string) => void
}

export function CustomSelectPreview({ label, placeholder, options, value, disabled, previewState, onChange }: CustomSelectPreviewProps) {
  return (
    <CustomSelect
      key={previewState}
      label={label}
      placeholder={placeholder}
      options={options.map((option) => ({ value: option, label: option }))}
      value={value}
      disabled={disabled}
      previewState={previewState}
      onChange={onChange}
    />
  )
}
