import { Fragment, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { DemoButton, Toggle } from '../../components/ui/PlaygroundControls'
import { ColorPickerField } from '../../components/ui/ColorPickerField'
import { RangeSlider } from '../../components/ui/RangeSlider'
import { CustomSelect } from './CustomSelect'
import { CustomSelectPreview } from './CustomSelectPreview'
import { loadPresets, savePresets } from './presetStorage'
import { generateComponentCss, generateComponentHtml, generateComponentTsx, getButtonStyle, getCardStyle, getInputStyle, getSafeTabsLabels, getToggleStyle } from './componentExport'
import type { ComponentKind, ComponentPreset, EditorSettings } from './editorTypes'
import './VisualComponentEditor.css'

const componentOptions: { id: ComponentKind; label: string; description: string; mark: string }[] = [
  { id: 'button', label: 'Button', description: 'Actions and links', mark: '↗' },
  { id: 'card', label: 'Card', description: 'Content surfaces', mark: '▱' },
  { id: 'input', label: 'Input field', description: 'Text entry', mark: 'Aa' },
  { id: 'toggle', label: 'Toggle', description: 'On or off states', mark: '◉' },
  { id: 'slider', label: 'Slider', description: 'Adjustable values', mark: '⌁' },
  { id: 'badge', label: 'Badge', description: 'Status and metadata', mark: '●' },
  { id: 'alert', label: 'Alert', description: 'Helpful status messages', mark: '!' },
  { id: 'select', label: 'Select', description: 'Choose an option', mark: '⌄' },
  { id: 'modal', label: 'Modal', description: 'Focused dialog states', mark: '▢' },
  { id: 'tooltip', label: 'Tooltip', description: 'Helpful context', mark: '?' },
  { id: 'tabs', label: 'Tabs', description: 'Switch content views', mark: 'Ⅱ' },
]
const componentNames: Record<ComponentKind, string> = {
  button: 'Button', card: 'Card', input: 'Input field', toggle: 'Toggle', slider: 'Slider',
  badge: 'Badge', alert: 'Alert', select: 'Select', modal: 'Modal', tooltip: 'Tooltip', tabs: 'Tabs',
}
const componentMarks: Record<ComponentKind, string> = {
  button: '↗', card: '▱', input: 'Aa', toggle: '◉', slider: '⌁',
  badge: '●', alert: '!', select: '⌄', modal: '▢', tooltip: '?', tabs: 'Ⅱ',
}

function createInitialSettings(accent: string): EditorSettings {
  return {
    button: { variant: 'primary', size: 'medium', radius: 9, padding: 18, fontSize: 14, text: 'Create project', previewState: 'default' },
    card: { variant: 'default', size: 'medium', radius: 16, padding: 26, shadow: 34, borderVisible: true },
    input: { placeholder: 'Your email address', variant: 'outlined', radius: 9, size: 'medium', disabled: false, previewState: 'default' },
    toggle: { size: 22, accent, defaultOn: true, previewState: 'default' },
    slider: { min: 0, max: 100, value: 64, accent, previewState: 'default' },
    badge: { text: 'New', variant: 'soft', color: 'primary', size: 'medium', showDot: true },
    alert: { variant: 'info', size: 'medium', title: 'A new update is ready', description: 'Explore the latest improvements to your workspace.', dismissible: true },
    select: { label: 'Workspace', placeholder: 'Choose a workspace', options: ['Interface Lab', 'Personal', 'Experiments'], value: 'Interface Lab', disabled: false, previewState: 'default' },
    modal: { triggerText: 'Open dialog', title: 'A small moment', description: 'A focused space for a short decision or a little more detail.', size: 'medium' },
    tooltip: { triggerText: 'Hover or focus me', content: 'A little context, right when you need it.', placement: 'top' },
    tabs: { labels: ['Overview', 'Activity', 'Settings'], contents: ['A clear view of your workspace.', 'Recent changes and activity.', 'Preferences for your creative space.'], activeIndex: 0, previewState: 'default' },
  }
}

function RangeProperty({ label, value, min, max, unit = '', onChange }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (value: number) => void }) {
  return (
    <label className="editor-property range-property">
      <span>{label}<output>{value}{unit}</output></span>
      <RangeSlider min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} />
    </label>
  )
}

function TextProperty({ label, value, onChange, placeholder, maxLength }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; maxLength?: number }) {
  return (
    <label className="editor-property text-property">
      <span>{label}</span>
      <input type="text" value={value} placeholder={placeholder} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function TextAreaProperty({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) {
  return <label className="editor-property text-property"><span>{label}</span><textarea value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} /></label>
}

function SelectProperty<T extends string>({ label, value, options, onChange, placeholder }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; placeholder?: string }) {
  return <CustomSelect label={label} value={value} options={options} onChange={onChange} placeholder={placeholder} compact />
}

function BooleanProperty({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="editor-property boolean-property">
      <span>{label}</span>
      <Toggle label={label} checked={checked} onChange={() => onChange(!checked)} />
    </div>
  )
}

function ColorProperty({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <ColorPickerField label={label} value={value} onChange={onChange} className="playground-color-picker" commitOnChange revertInvalidOnBlur />
}

export function VisualComponentEditor({ themeAccent }: { themeAccent: string }) {
  const [selected, setSelected] = useState<ComponentKind>('button')
  const [settings, setSettings] = useState<EditorSettings>(() => createInitialSettings(themeAccent))
  const [inputValue, setInputValue] = useState('')
  const [presets, setPresets] = useState<ComponentPreset[]>(loadPresets)
  const [showPresetForm, setShowPresetForm] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [exportFormat, setExportFormat] = useState<'tsx' | 'css' | 'html'>('tsx')
  const [notice, setNotice] = useState('')
  const [copyNotice, setCopyNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [alertDismissed, setAlertDismissed] = useState(false)
  const modalDialogRef = useRef<HTMLDivElement>(null)
  const modalTriggerRef = useRef<HTMLButtonElement>(null)
  const wasModalOpenRef = useRef(false)
  const tabsId = useId()

  const generatedCode = exportFormat === 'tsx'
    ? generateComponentTsx(selected, settings)
    : exportFormat === 'html'
      ? generateComponentHtml(selected, settings)
      : generateComponentCss(selected, settings)
  const htmlExportNote = selected === 'button'
    ? 'The button is static markup; add a JavaScript click handler to perform an action.'
    : selected === 'toggle'
      ? 'JavaScript is needed to update the switch state and its aria-checked value.'
      : selected === 'modal'
        ? 'JavaScript is needed to open and close the dialog and return focus to its trigger.'
        : selected === 'tabs'
          ? 'JavaScript is needed to switch the selected tab and reveal its panel.'
        : selected === 'alert'
          ? 'The dismiss action needs JavaScript to remove the alert; the status role and styling are included.'
          : selected === 'tooltip'
            ? 'The tooltip appears on hover and keyboard focus using CSS.'
            : 'This semantic HTML control works natively; the CSS export supplies its appearance.'

  useEffect(() => {
    if (modalOpen) modalDialogRef.current?.focus()
    else if (wasModalOpenRef.current) modalTriggerRef.current?.focus()
    wasModalOpenRef.current = modalOpen
  }, [modalOpen])

  function update<K extends ComponentKind>(component: K, updates: Partial<EditorSettings[K]>) {
    if (component === 'alert') setAlertDismissed(false)
    setSettings((current) => ({ ...current, [component]: { ...current[component], ...updates } }))
  }

  function saveCurrentPreset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = presetName.trim()
    if (!name) {
      setNotice('Give this preset a name before saving.')
      return
    }

    const properties = selected === 'select'
      ? { ...settings.select, options: [...settings.select.options] }
      : selected === 'tabs'
        ? { ...settings.tabs, labels: [...settings.tabs.labels], contents: [...settings.tabs.contents] }
        : { ...settings[selected] }
    const preset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.slice(0, 60),
      savedAt: Date.now(),
      component: selected,
      properties,
    } as ComponentPreset
    const nextPresets = [preset, ...presets]
    if (!savePresets(nextPresets)) {
      setNotice('Could not save presets in this browser.')
      return
    }
    setPresets(nextPresets)
    setPresetName('')
    setShowPresetForm(false)
    setNotice(`Saved “${preset.name}”.`)
  }

  function loadPreset(preset: ComponentPreset) {
    const restoredProperties = preset.component === 'select'
      ? { ...preset.properties, options: [...preset.properties.options] }
      : preset.component === 'tabs'
        ? { ...preset.properties, labels: [...preset.properties.labels], contents: [...(preset.properties.contents ?? preset.properties.labels.map((label) => `This panel is showing the ${label} view.`))] }
        : { ...preset.properties }
    setSelected(preset.component)
    setModalOpen(false)
    if (preset.component === 'alert') setAlertDismissed(false)
    setSettings((current) => ({ ...current, [preset.component]: restoredProperties }) as EditorSettings)
    setInputValue('')
    setNotice(`Loaded “${preset.name}”.`)
  }

  function deletePreset(preset: ComponentPreset) {
    const nextPresets = presets.filter((savedPreset) => savedPreset.id !== preset.id)
    if (!savePresets(nextPresets)) {
      setNotice('Could not update presets in this browser.')
      return
    }
    setPresets(nextPresets)
    setNotice(`Deleted “${preset.name}”.`)
  }

  async function copyGeneratedCode() {
    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopyNotice('Copied to clipboard')
      window.setTimeout(() => setCopyNotice(''), 1800)
    } catch {
      setCopyNotice('Clipboard access is unavailable here')
      window.setTimeout(() => setCopyNotice(''), 2500)
    }
  }

  function handleModalDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setModalOpen(false)
      return
    }
    if (event.key !== 'Tab') return

    const focusable = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) {
      event.preventDefault()
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function renderPreview() {
    if (selected === 'button') {
      const button = settings.button
      const isBusy = button.previewState === 'loading'
      const isDisabled = button.previewState === 'disabled' || isBusy
      return <DemoButton variant={button.variant} disabled={isDisabled} ariaBusy={isBusy} previewState={button.previewState} className={`editor-button-preview il-button il-button--${button.variant}`} style={getButtonStyle(button)}>{isBusy && <span className="editor-button-spinner" aria-hidden="true" />}{button.text || 'Button'}</DemoButton>
    }

    if (selected === 'card') {
      const card = settings.card
      return (
        <article className={`editor-card-preview il-card is-${card.variant} is-${card.size}`} style={getCardStyle(card)}>
          <span className="editor-card-eyebrow">A SMALL MOMENT</span>
          <h3>Room for a good idea.</h3>
          <p>A simple card can make a little space for something worth noticing.</p>
          <span className="editor-card-link">Take a look <b>↗</b></span>
        </article>
      )
    }

    if (selected === 'input') {
      const input = settings.input
      return <input className={`editor-input-preview il-input is-${input.variant}`} type="text" data-preview-state={input.previewState} aria-label={input.placeholder || 'Text input preview'} aria-invalid={input.previewState === 'error'} placeholder={input.placeholder} disabled={input.disabled} value={inputValue} onChange={(event) => setInputValue(event.target.value)} style={getInputStyle(input)} />
    }

    if (selected === 'toggle') {
      const toggle = settings.toggle
      return <Toggle label="Preview toggle" checked={toggle.defaultOn} disabled={toggle.previewState === 'disabled'} onChange={() => update('toggle', { defaultOn: !toggle.defaultOn })} style={getToggleStyle(toggle)} className="il-toggle" data-preview-state={toggle.previewState} />
    }

    if (selected === 'badge') {
      const badge = settings.badge
      return <span className={`editor-badge-preview is-${badge.variant} tone-${badge.color} is-${badge.size}`}>{badge.showDot && <i aria-hidden="true" />}{badge.text}</span>
    }

    if (selected === 'alert') {
      const alert = settings.alert
      if (alertDismissed) return <p className="editor-alert-dismissed">Alert dismissed</p>
      const icon = alert.variant === 'success' ? '✓' : alert.variant === 'warning' ? '!' : alert.variant === 'error' ? '×' : 'i'
      return <div className={`editor-alert-preview is-${alert.variant} is-${alert.size}`} role={alert.variant === 'error' ? 'alert' : 'status'}><span className="editor-alert-icon" aria-hidden="true">{icon}</span><div className="editor-alert-copy">{alert.title && <strong>{alert.title}</strong>}{alert.description && <p>{alert.description}</p>}</div>{alert.dismissible && <button type="button" className="editor-alert-dismiss" aria-label="Dismiss alert" onClick={() => setAlertDismissed(true)}>×</button>}</div>
    }

    if (selected === 'select') {
      const select = settings.select
      return <CustomSelectPreview {...select} onChange={(value) => update('select', { value })} />
    }

    if (selected === 'modal') {
      const modal = settings.modal
      return (
        <div className="editor-modal-preview">
          <button className="demo-button primary editor-modal-trigger" ref={modalTriggerRef} type="button" tabIndex={modalOpen ? -1 : 0} aria-hidden={modalOpen} onClick={() => setModalOpen(true)}>{modal.triggerText}</button>
          {modalOpen && (
            <div className="editor-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}>
              <div className="editor-modal-dialog" data-size={modal.size} ref={modalDialogRef} role="dialog" aria-modal="true" aria-labelledby={`${tabsId}-modal-title`} aria-describedby={`${tabsId}-modal-description`} tabIndex={-1} onKeyDown={handleModalDialogKeyDown}>
                <span className="editor-modal-kicker">INTERFACE LAB · DIALOG</span>
                <h3 id={`${tabsId}-modal-title`}>{modal.title}</h3>
                <p id={`${tabsId}-modal-description`}>{modal.description}</p>
                <button className="demo-button secondary editor-modal-close" type="button" onClick={() => setModalOpen(false)}>Close dialog</button>
                <button className="editor-modal-dismiss" type="button" aria-label="Close dialog" onClick={() => setModalOpen(false)}>×</button>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (selected === 'tooltip') {
      const tooltip = settings.tooltip
      return (
        <div className={`editor-tooltip-preview at-${tooltip.placement}`}>
          <button className="demo-button secondary" type="button" aria-describedby={`${tabsId}-tooltip`}>{tooltip.triggerText}</button>
          <span className="editor-tooltip-bubble" id={`${tabsId}-tooltip`} role="tooltip">{tooltip.content}</span>
        </div>
      )
    }

    if (selected === 'tabs') {
      const tabs = settings.tabs
      const labels = getSafeTabsLabels(tabs.labels)
      const activeIndex = Math.max(0, Math.min(labels.length - 1, Number.isInteger(tabs.activeIndex) ? tabs.activeIndex : 0))
      const activeLabel = labels[activeIndex]
      const activeTabId = `${tabsId}-tab-${activeIndex}`
      return (
        <div className={`editor-tabs-preview state-${tabs.previewState}`}>
          <div className="editor-tabs-list" role="tablist" aria-label="Preview tabs">
            {labels.map((label, index) => <button className={index === activeIndex ? 'is-active' : ''} id={`${tabsId}-tab-${index}`} key={`${index}-${label}`} type="button" role="tab" disabled={tabs.previewState === 'disabled'} aria-selected={index === activeIndex} aria-controls={`${tabsId}-panel`} tabIndex={index === activeIndex ? 0 : -1} onClick={() => update('tabs', { activeIndex: index })} onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? labels.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + labels.length) % labels.length
              update('tabs', { activeIndex: nextIndex })
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
            }}>{label}</button>)}
          </div>
          <section className="editor-tabs-panel" id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={activeTabId} tabIndex={0}>
            <span className="editor-tabs-kicker">CURRENT VIEW</span><h3>{activeLabel}</h3><p>{tabs.contents?.[activeIndex] ?? `This panel is showing the ${activeLabel} view.`}</p>
          </section>
        </div>
      )
    }

    const slider = settings.slider
    return (
      <label className={`editor-slider-preview il-slider state-${slider.previewState}`}>
        <span><strong>Preview value</strong><output>{slider.value}</output></span>
        <RangeSlider min={slider.min} max={slider.max} value={slider.value} accentColor={slider.accent} aria-label="Preview value" disabled={slider.previewState === 'disabled'} onChange={(event) => update('slider', { value: Number(event.target.value) })} />
        <small><span>{slider.min}</span><span>{slider.max}</span></small>
      </label>
    )
  }

  function renderInspector() {
    if (selected === 'button') {
      const button = settings.button
      return <>
        <SelectProperty label="Variant" value={button.variant} options={[{ value: 'primary', label: 'Primary' }, { value: 'secondary', label: 'Secondary' }, { value: 'outline', label: 'Outline' }, { value: 'ghost', label: 'Ghost' }, { value: 'danger', label: 'Danger' }]} onChange={(variant) => update('button', { variant })} />
        <SelectProperty label="Size" value={button.size} options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} onChange={(size) => update('button', { size })} />
        <SelectProperty label="Preview state" value={button.previewState} options={[{ value: 'default', label: 'Default' }, { value: 'hover', label: 'Hover' }, { value: 'focus', label: 'Focus' }, { value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }, { value: 'loading', label: 'Loading' }]} onChange={(previewState) => update('button', { previewState })} />
        <RangeProperty label="Border radius" value={button.radius} min={0} max={28} unit="px" onChange={(radius) => update('button', { radius })} />
        <RangeProperty label="Horizontal padding" value={button.padding} min={8} max={40} unit="px" onChange={(padding) => update('button', { padding })} />
        <RangeProperty label="Font size" value={button.fontSize} min={10} max={22} unit="px" onChange={(fontSize) => update('button', { fontSize })} />
        <TextProperty label="Button text" value={button.text} maxLength={160} onChange={(text) => update('button', { text })} />
      </>
    }
    if (selected === 'card') {
      const card = settings.card
      return <>
        <SelectProperty label="Variant" value={card.variant} options={[{ value: 'default', label: 'Default' }, { value: 'elevated', label: 'Elevated' }, { value: 'outlined', label: 'Outlined' }, { value: 'interactive', label: 'Interactive' }]} onChange={(variant) => update('card', { variant })} />
        <SelectProperty label="Size" value={card.size} options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} onChange={(size) => update('card', { size })} />
        <RangeProperty label="Border radius" value={card.radius} min={0} max={36} unit="px" onChange={(radius) => update('card', { radius })} />
        <RangeProperty label="Padding" value={card.padding} min={12} max={48} unit="px" onChange={(padding) => update('card', { padding })} />
        <RangeProperty label="Shadow intensity" value={card.shadow} min={0} max={100} unit="%" onChange={(shadow) => update('card', { shadow })} />
        <BooleanProperty label="Show border" checked={card.borderVisible} onChange={(borderVisible) => update('card', { borderVisible })} />
      </>
    }
    if (selected === 'input') {
      const input = settings.input
      return <>
        <TextProperty label="Placeholder" value={input.placeholder} maxLength={120} onChange={(placeholder) => update('input', { placeholder })} />
        <SelectProperty label="Variant" value={input.variant} options={[{ value: 'filled', label: 'Filled' }, { value: 'outlined', label: 'Outlined' }, { value: 'underlined', label: 'Underlined' }]} onChange={(variant) => update('input', { variant })} />
        <RangeProperty label="Border radius" value={input.radius} min={0} max={24} unit="px" onChange={(radius) => update('input', { radius })} />
        <SelectProperty label="Input size" value={input.size} options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} onChange={(size) => update('input', { size })} />
        <SelectProperty label="Preview state" value={input.previewState} options={[{ value: 'default', label: 'Default' }, { value: 'hover', label: 'Hover' }, { value: 'focus', label: 'Focus' }, { value: 'error', label: 'Error' }]} onChange={(previewState) => update('input', { previewState })} />
        <BooleanProperty label="Disabled" checked={input.disabled} onChange={(disabled) => update('input', { disabled })} />
      </>
    }
    if (selected === 'toggle') {
      const toggle = settings.toggle
      return <>
        <RangeProperty label="Switch size" value={toggle.size} min={18} max={34} unit="px" onChange={(size) => update('toggle', { size })} />
        <ColorProperty label="Accent color" value={toggle.accent} onChange={(accent) => update('toggle', { accent })} />
        <BooleanProperty label="Default state" checked={toggle.defaultOn} onChange={(defaultOn) => update('toggle', { defaultOn })} />
        <SelectProperty label="Preview state" value={toggle.previewState} options={[{ value: 'default', label: 'Default' }, { value: 'hover', label: 'Hover' }, { value: 'focus', label: 'Focus' }, { value: 'disabled', label: 'Disabled' }]} onChange={(previewState) => update('toggle', { previewState })} />
      </>
    }
    if (selected === 'badge') {
      const badge = settings.badge
      return <>
        <TextProperty label="Badge text" value={badge.text} maxLength={120} onChange={(text) => update('badge', { text })} />
        <SelectProperty label="Appearance" value={badge.variant} options={[{ value: 'solid', label: 'Solid' }, { value: 'soft', label: 'Soft' }, { value: 'outline', label: 'Outline' }]} onChange={(variant) => update('badge', { variant })} />
        <SelectProperty label="Semantic color" value={badge.color} options={[{ value: 'neutral', label: 'Neutral' }, { value: 'primary', label: 'Primary' }, { value: 'success', label: 'Success' }, { value: 'warning', label: 'Warning' }, { value: 'error', label: 'Error' }]} onChange={(color) => update('badge', { color })} />
        <SelectProperty label="Size" value={badge.size} options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} onChange={(size) => update('badge', { size })} />
        <BooleanProperty label="Status dot" checked={badge.showDot} onChange={(showDot) => update('badge', { showDot })} />
      </>
    }
    if (selected === 'alert') {
      const alert = settings.alert
      return <>
        <SelectProperty label="Variant" value={alert.variant} options={[{ value: 'info', label: 'Information' }, { value: 'success', label: 'Success' }, { value: 'warning', label: 'Warning' }, { value: 'error', label: 'Error' }]} onChange={(variant) => update('alert', { variant })} />
        <SelectProperty label="Size" value={alert.size} options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} onChange={(size) => update('alert', { size })} />
        <TextProperty label="Title (optional)" value={alert.title} maxLength={120} onChange={(title) => update('alert', { title })} />
        <TextProperty label="Description" value={alert.description} maxLength={300} onChange={(description) => update('alert', { description })} />
        <BooleanProperty label="Dismiss action" checked={alert.dismissible} onChange={(dismissible) => update('alert', { dismissible })} />
      </>
    }
    if (selected === 'select') {
      const select = settings.select
      return <>
        <TextProperty label="Field label" value={select.label} maxLength={80} onChange={(label) => update('select', { label })} />
        <TextProperty label="Placeholder" value={select.placeholder} maxLength={100} onChange={(placeholder) => update('select', { placeholder })} />
        <TextProperty label="Options (comma-separated)" value={select.options.join(', ')} maxLength={500} onChange={(optionsText) => {
          const parsedOptions = [...new Set(optionsText.split(',').map((option) => option.trim()).filter(Boolean))].slice(0, 10)
          update('select', { options: parsedOptions, value: parsedOptions.includes(select.value) ? select.value : '' })
        }} />
        <SelectProperty label="Selected option" value={select.value} options={[{ value: '', label: 'Placeholder' }, ...select.options.map((option) => ({ value: option, label: option }))]} placeholder="Placeholder" onChange={(value) => update('select', { value })} />
        <BooleanProperty label="Disabled" checked={select.disabled} onChange={(disabled) => update('select', { disabled })} />
        <SelectProperty label="Preview state" value={select.previewState} options={[{ value: 'default', label: 'Default' }, { value: 'hover', label: 'Hover' }, { value: 'focus', label: 'Focus' }, { value: 'open', label: 'Open' }]} onChange={(previewState) => update('select', { previewState })} />
      </>
    }
    if (selected === 'modal') {
      const modal = settings.modal
      return <>
        <TextProperty label="Trigger text" value={modal.triggerText} maxLength={80} onChange={(triggerText) => update('modal', { triggerText })} />
        <TextProperty label="Title" value={modal.title} maxLength={120} onChange={(title) => update('modal', { title })} />
        <TextProperty label="Description" value={modal.description} maxLength={500} onChange={(description) => update('modal', { description })} />
        <SelectProperty label="Dialog size" value={modal.size} options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} onChange={(size) => update('modal', { size })} />
      </>
    }
    if (selected === 'tooltip') {
      const tooltip = settings.tooltip
      return <>
        <TextProperty label="Trigger text" value={tooltip.triggerText} maxLength={80} onChange={(triggerText) => update('tooltip', { triggerText })} />
        <TextProperty label="Tooltip content" value={tooltip.content} maxLength={240} onChange={(content) => update('tooltip', { content })} />
        <SelectProperty label="Placement" value={tooltip.placement} options={[{ value: 'top', label: 'Top' }, { value: 'right', label: 'Right' }, { value: 'bottom', label: 'Bottom' }, { value: 'left', label: 'Left' }]} onChange={(placement) => update('tooltip', { placement })} />
      </>
    }
    if (selected === 'tabs') {
      const tabs = settings.tabs
      return <>
        {tabs.labels.map((label, index) => <Fragment key={index}><TextProperty label={`Tab ${index + 1} label`} value={label} maxLength={40} onChange={(nextLabel) => {
          const labels = [...tabs.labels]
          labels[index] = nextLabel
          update('tabs', { labels })
        }} /><TextAreaProperty label={`Tab ${index + 1} content`} value={tabs.contents?.[index] ?? ''} maxLength={240} onChange={(content) => {
          const contents = [...(tabs.contents ?? tabs.labels.map((tabLabel) => `This panel is showing the ${tabLabel} view.`))]
          contents[index] = content
          update('tabs', { contents })
        }} /></Fragment>)}
        <SelectProperty label="Active tab" value={String(tabs.activeIndex)} options={tabs.labels.map((label, index) => ({ value: String(index), label }))} onChange={(activeIndex) => update('tabs', { activeIndex: Number(activeIndex) })} />
        <SelectProperty label="Preview state" value={tabs.previewState} options={[{ value: 'default', label: 'Default' }, { value: 'hover', label: 'Hover' }, { value: 'focus', label: 'Focus' }, { value: 'disabled', label: 'Disabled' }]} onChange={(previewState) => update('tabs', { previewState })} />
      </>
    }

    const slider = settings.slider
    return <>
      <SelectProperty label="Preview state" value={slider.previewState} options={[{ value: 'default', label: 'Default' }, { value: 'hover', label: 'Hover' }, { value: 'focus', label: 'Focus' }, { value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }]} onChange={(previewState) => update('slider', { previewState })} />
      <NumberProperty label="Minimum" value={slider.min} min={-100000} max={slider.max - 1} onChange={(min) => {
        const nextMin = Math.min(min, slider.max - 1)
        update('slider', { min: nextMin, value: Math.min(slider.max, Math.max(nextMin, slider.value)) })
      }} />
      <NumberProperty label="Maximum" value={slider.max} min={slider.min + 1} max={100000} onChange={(max) => {
        const nextMax = Math.max(max, slider.min + 1)
        update('slider', { max: nextMax, value: Math.max(slider.min, Math.min(nextMax, slider.value)) })
      }} />
      <RangeProperty label="Current value" value={slider.value} min={slider.min} max={slider.max} onChange={(value) => update('slider', { value })} />
      <ColorProperty label="Accent color" value={slider.accent} onChange={(accent) => update('slider', { accent })} />
    </>
  }

  const selectedComponent = componentOptions.find((component) => component.id === selected) ?? componentOptions[0]

  return (
    <div className="visual-editor">
      <section className="visual-editor-intro">
        <div className="eyebrow"><span className="eyebrow-dot" /> COMPONENT PLAYGROUND</div>
        <div className="visual-editor-title-row">
          <div><h1>Shape the <span>details.</span></h1><p>Choose a component, adjust its properties, and see what feels right.</p></div>
          <div className="editor-action-group">
            <button className="editor-action-button save-action" type="button" onClick={() => { setShowPresetForm((open) => !open); setNotice('') }}>＋ Save preset</button>
            <button className={`editor-action-button export-action${showExport ? ' is-active' : ''}`} type="button" onClick={() => { setShowExport((open) => !open); setCopyNotice('') }}>{showExport ? 'Hide export' : '{ } Export code'}</button>
            <span className="editor-live-badge"><i /> LIVE PREVIEW</span>
          </div>
        </div>
      </section>

      {showPresetForm && (
        <form className="editor-save-form" onSubmit={saveCurrentPreset}>
          <div><strong>Save this {selectedComponent.label.toLowerCase()} setup</strong><small>Its properties will be saved separately from your current editor state.</small></div>
          <label className="sr-only" htmlFor="preset-name">Preset name</label>
          <input id="preset-name" autoFocus maxLength={60} placeholder="e.g. Soft lavender button" value={presetName} onChange={(event) => setPresetName(event.target.value)} />
          <button className="editor-form-save" type="submit">Save preset</button>
          <button className="editor-form-cancel" type="button" onClick={() => setShowPresetForm(false)}>Cancel</button>
        </form>
      )}
      {notice && <p className="editor-notice" role="status">{notice}</p>}

      {showExport && (
        <section className="css-export-panel" aria-labelledby="css-export-title">
          <div className="css-export-heading"><div><span className="dashboard-card-label">COMPONENT EXPORT</span><h2 id="css-export-title">{selectedComponent.label} · {exportFormat === 'tsx' ? 'React / TSX' : exportFormat.toUpperCase()}</h2></div><button type="button" className="copy-css-button" onClick={copyGeneratedCode}>{copyNotice || `Copy ${exportFormat.toUpperCase()}`}</button></div>
          <div className="export-format-tabs" role="group" aria-label="Export format">
            {(['tsx', 'css', 'html'] as const).map((format) => <button key={format} type="button" aria-pressed={exportFormat === format} className={exportFormat === format ? 'is-active' : ''} onClick={() => { setExportFormat(format); setCopyNotice('') }}>{format === 'tsx' ? 'React / TSX' : format.toUpperCase()}</button>)}
          </div>
          <pre><code>{generatedCode}</code></pre>
          <p>{exportFormat === 'tsx' ? 'The component includes typed props and uses the matching scoped CSS classes from the CSS export.' : exportFormat === 'css' ? 'Scoped styles for this component only. Pair with the generated HTML or React component.' : htmlExportNote}</p>
        </section>
      )}

      <div className="editor-workspace">
        <nav className="editor-selector" aria-label="Choose a component">
          <div className="editor-panel-heading"><span>COMPONENTS</span><small>{componentOptions.length.toString().padStart(2, '0')}</small></div>
          {componentOptions.map((component, index) => (
            <button className={`component-choice${selected === component.id ? ' is-selected' : ''}`} type="button" key={component.id} aria-pressed={selected === component.id} onClick={() => { setSelected(component.id); setModalOpen(false); if (component.id === 'alert') setAlertDismissed(false) }}>
              <span className="component-choice-mark">{component.mark}</span><span className="component-choice-copy"><strong>{component.label}</strong><small>{component.description}</small></span><kbd>{String(index + 1).padStart(2, '0')}</kbd>
            </button>
          ))}
          <div className="selector-tip"><span>✳</span><p>Every control updates the preview as you explore.</p></div>
        </nav>

        <section className="editor-preview-panel" aria-label={`${selectedComponent.label} preview`}>
          <div className="editor-panel-heading"><span>PREVIEW</span><span className="preview-context">{selectedComponent.label}</span></div>
          <div className={`editor-preview-stage component-stage-${selected}`} key={selected}>
            {renderPreview()}
          </div>
          <div className="preview-stage-footer"><span><i /> Changes are local to this session</span><span>THEME ACCENT APPLIED</span></div>
        </section>

        <aside className="editor-inspector" aria-label={`${selectedComponent.label} properties`}>
          <div className="editor-panel-heading"><span>PROPERTIES</span><span className="property-count">{Object.keys(settings[selected]).length.toString().padStart(2, '0')}</span></div>
          <div className="inspector-component-title"><span className="component-choice-mark">{selectedComponent.mark}</span><div><strong>{selectedComponent.label}</strong><small>Customize appearance</small></div></div>
          <div className="inspector-properties" key={selected}>{renderInspector()}</div>
          <div className="inspector-footnote"><span>◈</span> Preview updates instantly</div>
        </aside>
      </div>

      <section className="saved-presets-section" aria-labelledby="saved-presets-title">
        <div className="saved-presets-heading"><div><span className="dashboard-card-label">YOUR COMPONENT LIBRARY</span><h2 id="saved-presets-title">Saved presets <small>{presets.length.toString().padStart(2, '0')}</small></h2></div><p>Reusable starting points for future experiments.</p></div>
        {presets.length > 0 ? (
          <div className="saved-presets-grid">
            {presets.map((preset) => {
              const component = componentOptions.find((option) => option.id === preset.component)
              return (
                <article className="saved-preset-card" key={preset.id}>
                  <div className="preset-card-top"><span className="component-choice-mark">{component?.mark ?? componentMarks[preset.component]}</span><span className="preset-type">{componentNames[preset.component]}</span><button type="button" className="delete-preset-button" aria-label={`Delete ${preset.name}`} onClick={() => deletePreset(preset)}>×</button></div>
                  <h3>{preset.name}</h3>
                  <small>Saved {new Date(preset.savedAt).toLocaleDateString()}</small>
                  <button type="button" className="load-preset-button" onClick={() => loadPreset(preset)}>Load preset <span>↗</span></button>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="presets-empty"><span>▱</span><p>Your saved component setups will appear here.</p><button type="button" onClick={() => { setShowPresetForm(true); setNotice('') }}>Save the current {selectedComponent.label.toLowerCase()}</button></div>
        )}
      </section>
      <footer className="page-footer"><span>INTERFACE LAB <i>·</i> VISUAL COMPONENT EDITOR</span><span>MAKE IT FEEL RIGHT <i>✳</i></span></footer>
    </div>
  )
}

function NumberProperty({ label, value, onChange, min = -100000, max = 100000 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  const inputId = useId()
  return (
    <div className="editor-property number-property">
      <label htmlFor={inputId}>{label}</label>
      <div className="number-input-control">
        <input id={inputId} type="number" min={min} max={max} step={1} value={value} onWheel={(event) => {
          if (document.activeElement === event.currentTarget) event.currentTarget.blur()
        }} onChange={(event) => {
          const parsed = Number(event.target.value)
          if (Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, parsed)))
        }} />
        <div className="number-stepper" aria-label={`${label} controls`}>
          <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 7.5 3-3 3 3" /></svg>
          </button>
          <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
