import { useState, type CSSProperties } from 'react'
import { DemoButton, Toggle, type ButtonVariant } from '../../components/ui/PlaygroundControls'
import './VisualComponentEditor.css'

type ComponentKind = 'button' | 'card' | 'input' | 'toggle' | 'slider'
type EditorSettings = {
  button: { variant: ButtonVariant; size: 'small' | 'medium' | 'large'; radius: number; padding: number; fontSize: number; text: string }
  card: { radius: number; padding: number; shadow: number; borderVisible: boolean }
  input: { placeholder: string; radius: number; size: 'small' | 'medium' | 'large'; disabled: boolean }
  toggle: { size: number; accent: string; defaultOn: boolean }
  slider: { min: number; max: number; value: number; accent: string }
}

const componentOptions: { id: ComponentKind; label: string; description: string; mark: string }[] = [
  { id: 'button', label: 'Button', description: 'Actions and links', mark: '↗' },
  { id: 'card', label: 'Card', description: 'Content surfaces', mark: '▱' },
  { id: 'input', label: 'Input field', description: 'Text entry', mark: 'Aa' },
  { id: 'toggle', label: 'Toggle', description: 'On or off states', mark: '◉' },
  { id: 'slider', label: 'Slider', description: 'Adjustable values', mark: '⌁' },
]

function createInitialSettings(accent: string): EditorSettings {
  return {
    button: { variant: 'primary', size: 'medium', radius: 9, padding: 18, fontSize: 14, text: 'Create project' },
    card: { radius: 16, padding: 26, shadow: 34, borderVisible: true },
    input: { placeholder: 'Your email address', radius: 9, size: 'medium', disabled: false },
    toggle: { size: 22, accent, defaultOn: true },
    slider: { min: 0, max: 100, value: 64, accent },
  }
}

function RangeProperty({ label, value, min, max, unit = '', onChange }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (value: number) => void }) {
  return (
    <label className="editor-property range-property">
      <span>{label}<output>{value}{unit}</output></span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

function TextProperty({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="editor-property text-property">
      <span>{label}</span>
      <input type="text" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function SelectProperty<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <label className="editor-property select-property">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
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
  return (
    <label className="editor-property color-property">
      <span>{label}</span>
      <span className="editor-color-input"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><code>{value.toUpperCase()}</code></span>
    </label>
  )
}

export function VisualComponentEditor({ themeAccent }: { themeAccent: string }) {
  const [selected, setSelected] = useState<ComponentKind>('button')
  const [settings, setSettings] = useState<EditorSettings>(() => createInitialSettings(themeAccent))
  const [inputValue, setInputValue] = useState('')

  function update<K extends ComponentKind>(component: K, updates: Partial<EditorSettings[K]>) {
    setSettings((current) => ({ ...current, [component]: { ...current[component], ...updates } }))
  }

  function renderPreview() {
    if (selected === 'button') {
      const button = settings.button
      const sizes = { small: 34, medium: 42, large: 50 }
      const style: CSSProperties = {
        minHeight: sizes[button.size],
        borderRadius: button.radius,
        paddingInline: button.padding,
        fontSize: button.fontSize,
      }
      return <DemoButton variant={button.variant} className="editor-button-preview" style={style}>{button.text || 'Button'}</DemoButton>
    }

    if (selected === 'card') {
      const card = settings.card
      const shadow = card.shadow / 100
      return (
        <article className="editor-card-preview" style={{ borderRadius: card.radius, padding: card.padding, borderColor: card.borderVisible ? undefined : 'transparent', boxShadow: `0 18px 50px rgb(0 0 0 / ${shadow * 0.36}), 0 4px 12px rgb(0 0 0 / ${shadow * 0.18})` }}>
          <span className="editor-card-eyebrow">A SMALL MOMENT</span>
          <h3>Room for a good idea.</h3>
          <p>A simple card can make a little space for something worth noticing.</p>
          <span className="editor-card-link">Take a look <b>↗</b></span>
        </article>
      )
    }

    if (selected === 'input') {
      const input = settings.input
      const size = { small: 36, medium: 44, large: 52 }
      return <input className="editor-input-preview" type="text" placeholder={input.placeholder} disabled={input.disabled} value={inputValue} onChange={(event) => setInputValue(event.target.value)} style={{ borderRadius: input.radius, height: size[input.size] }} />
    }

    if (selected === 'toggle') {
      const toggle = settings.toggle
      const diameter = Math.max(14, toggle.size - 6)
      const toggleStyle = {
        '--toggle-width': `${toggle.size * 1.8}px`,
        '--toggle-height': `${toggle.size}px`,
        '--toggle-thumb-size': `${diameter}px`,
        '--toggle-travel': `${toggle.size * 0.8}px`,
        '--toggle-accent': toggle.accent,
      } as CSSProperties
      return <Toggle label="Preview toggle" checked={toggle.defaultOn} onChange={() => update('toggle', { defaultOn: !toggle.defaultOn })} style={toggleStyle} />
    }

    const slider = settings.slider
    return (
      <label className="editor-slider-preview">
        <span><strong>Preview value</strong><output>{slider.value}</output></span>
        <input type="range" min={slider.min} max={slider.max} value={slider.value} style={{ accentColor: slider.accent }} onChange={(event) => update('slider', { value: Number(event.target.value) })} />
        <small><span>{slider.min}</span><span>{slider.max}</span></small>
      </label>
    )
  }

  function renderInspector() {
    if (selected === 'button') {
      const button = settings.button
      return <>
        <SelectProperty label="Variant" value={button.variant} options={[{ value: 'primary', label: 'Primary' }, { value: 'secondary', label: 'Secondary' }, { value: 'ghost', label: 'Ghost' }]} onChange={(variant) => update('button', { variant })} />
        <SelectProperty label="Size" value={button.size} options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} onChange={(size) => update('button', { size })} />
        <RangeProperty label="Border radius" value={button.radius} min={0} max={28} unit="px" onChange={(radius) => update('button', { radius })} />
        <RangeProperty label="Horizontal padding" value={button.padding} min={8} max={40} unit="px" onChange={(padding) => update('button', { padding })} />
        <RangeProperty label="Font size" value={button.fontSize} min={10} max={22} unit="px" onChange={(fontSize) => update('button', { fontSize })} />
        <TextProperty label="Button text" value={button.text} onChange={(text) => update('button', { text })} />
      </>
    }
    if (selected === 'card') {
      const card = settings.card
      return <>
        <RangeProperty label="Border radius" value={card.radius} min={0} max={36} unit="px" onChange={(radius) => update('card', { radius })} />
        <RangeProperty label="Padding" value={card.padding} min={12} max={48} unit="px" onChange={(padding) => update('card', { padding })} />
        <RangeProperty label="Shadow intensity" value={card.shadow} min={0} max={100} unit="%" onChange={(shadow) => update('card', { shadow })} />
        <BooleanProperty label="Show border" checked={card.borderVisible} onChange={(borderVisible) => update('card', { borderVisible })} />
      </>
    }
    if (selected === 'input') {
      const input = settings.input
      return <>
        <TextProperty label="Placeholder" value={input.placeholder} onChange={(placeholder) => update('input', { placeholder })} />
        <RangeProperty label="Border radius" value={input.radius} min={0} max={24} unit="px" onChange={(radius) => update('input', { radius })} />
        <SelectProperty label="Input size" value={input.size} options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} onChange={(size) => update('input', { size })} />
        <BooleanProperty label="Disabled" checked={input.disabled} onChange={(disabled) => update('input', { disabled })} />
      </>
    }
    if (selected === 'toggle') {
      const toggle = settings.toggle
      return <>
        <RangeProperty label="Switch size" value={toggle.size} min={18} max={34} unit="px" onChange={(size) => update('toggle', { size })} />
        <ColorProperty label="Accent color" value={toggle.accent} onChange={(accent) => update('toggle', { accent })} />
        <BooleanProperty label="Default state" checked={toggle.defaultOn} onChange={(defaultOn) => update('toggle', { defaultOn })} />
      </>
    }

    const slider = settings.slider
    return <>
      <NumberProperty label="Minimum" value={slider.min} onChange={(min) => {
        const nextMin = Math.min(min, slider.max - 1)
        update('slider', { min: nextMin, value: Math.min(slider.max, Math.max(nextMin, slider.value)) })
      }} />
      <NumberProperty label="Maximum" value={slider.max} onChange={(max) => {
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
        <div className="visual-editor-title-row"><div><h1>Shape the <span>details.</span></h1><p>Choose a component, adjust its properties, and see what feels right.</p></div><span className="editor-live-badge"><i /> LIVE PREVIEW</span></div>
      </section>

      <div className="editor-workspace">
        <nav className="editor-selector" aria-label="Choose a component">
          <div className="editor-panel-heading"><span>COMPONENTS</span><small>05</small></div>
          {componentOptions.map((component, index) => (
            <button className={`component-choice${selected === component.id ? ' is-selected' : ''}`} type="button" key={component.id} aria-pressed={selected === component.id} onClick={() => setSelected(component.id)}>
              <span className="component-choice-mark">{component.mark}</span><span className="component-choice-copy"><strong>{component.label}</strong><small>{component.description}</small></span><kbd>0{index + 1}</kbd>
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
      <footer className="page-footer"><span>INTERFACE LAB <i>·</i> VISUAL COMPONENT EDITOR</span><span>MAKE IT FEEL RIGHT <i>✳</i></span></footer>
    </div>
  )
}

function NumberProperty({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="editor-property number-property">
      <span>{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}
