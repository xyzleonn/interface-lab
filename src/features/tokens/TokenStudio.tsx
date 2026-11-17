import { useState, type CSSProperties, type ReactNode } from 'react'
import { ColorPickerField } from '../../components/ui/ColorPickerField'
import { RangeSlider } from '../../components/ui/RangeSlider'
import { defaultDesignTokens, normalizeDesignTokens, safeFontFamily } from './tokenDefaults'
import { designTokensToCss, getPreviewTokenVariables } from './tokenCss'
import { loadTokenPresets, saveTokenPresets } from './tokenStorage'
import type { DesignTokens, TokenPreset } from './tokenTypes'
import './TokenStudio.css'

function TokenColorField({ label, value, onChange, onReset }: { label: string; value: string; onChange: (value: string) => void; onReset: () => void }) {
  return (
    <div className="token-color-field">
      <span className="token-color-label">{label}</span>
      <ColorPickerField label={label} value={value} onChange={onChange} className="token-color-control" showLabel={false} />
      <button type="button" aria-label={`Reset ${label}`} onClick={onReset}>↺</button>
    </div>
  )
}

function TokenNumberField({ label, value, min, max, step = 1, unit = 'px', onChange, onReset }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void; onReset: () => void }) {
  return (
    <label className="token-number-field">
      <span>{label}<output>{value}{unit}</output></span>
      <RangeSlider min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} />
      <button type="button" aria-label={`Reset ${label}`} onClick={onReset}>↺</button>
    </label>
  )
}

function TokenTextField({ label, value, onChange, onReset }: { label: string; value: string; onChange: (value: string) => void; onReset: () => void }) {
  return (
    <label className="token-text-field">
      <span>{label}</span><input value={value} maxLength={120} onChange={(event) => onChange(safeFontFamily(event.target.value, value))} />
      <button type="button" aria-label={`Reset ${label}`} onClick={onReset}>↺</button>
    </label>
  )
}

function TokenSection({ number, title, description, children, className = '' }: { number: string; title: string; description: string; children: ReactNode; className?: string }) {
  return <section className={`token-section ${className}`}><div className="token-section-heading"><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></div>{children}</section>
}

export function TokenStudio({ tokens, mode, accentColor, accentVariables, hasUnappliedChanges, onTokensChange, onAccentChange, onApply, onDiscard, onReset }: {
  tokens: DesignTokens
  mode: 'dark' | 'light'
  accentColor: string
  accentVariables: { hover: string; soft: string; border: string; glow: string; contrast: string }
  hasUnappliedChanges: boolean
  onTokensChange: (tokens: DesignTokens) => void
  onAccentChange: (color: string) => void
  onApply: () => void
  onDiscard: () => void
  onReset: () => void
}) {
  const [presets, setPresets] = useState<TokenPreset[]>(loadTokenPresets)
  const [presetName, setPresetName] = useState('')
  const [notice, setNotice] = useState('')
  const [exportFormat, setExportFormat] = useState<'css' | 'json'>('css')
  const [copyNotice, setCopyNotice] = useState('')
  const [previewToggle, setPreviewToggle] = useState(false)
  const palette = tokens.colors[mode]
  const generatedCss = designTokensToCss(tokens, mode, accentColor)
  const generatedJson = JSON.stringify({ mode, accentColor, ...tokens }, null, 2)
  const generatedExport = exportFormat === 'css' ? generatedCss : generatedJson
  const previewVariables = {
    ...getPreviewTokenVariables(tokens, mode, accentColor),
    '--preview-color-accent-hover': accentVariables.hover,
    '--preview-color-accent-soft': accentVariables.soft,
    '--preview-color-accent-border': accentVariables.border,
    '--preview-color-accent-glow': accentVariables.glow,
    '--preview-color-accent-contrast': accentVariables.contrast,
  } as CSSProperties

  function updateColor(key: keyof DesignTokens['colors'], value: string) {
    if (key === 'dark' || key === 'light') return
    onTokensChange({ ...tokens, colors: { ...tokens.colors, [key]: value } })
  }

  function updatePalette(key: keyof typeof palette, value: string) {
    onTokensChange({ ...tokens, colors: { ...tokens.colors, [mode]: { ...palette, [key]: value } } })
  }

  function updateNumber(group: 'typography' | 'spacing' | 'shape' | 'effects', key: string, value: number) {
    const next = { ...tokens, [group]: { ...tokens[group], [key]: value } }
    onTokensChange(normalizeDesignTokens(next))
  }

  function resetNumber(group: 'typography' | 'spacing' | 'shape' | 'effects', key: string) {
    updateNumber(group, key, defaultDesignTokens[group][key as never] as number)
  }

  function setShadowPreset(preset: 'soft' | 'balanced' | 'lifted') {
    const values = {
      soft: { shadowX: 0, shadowY: 6, shadowBlur: 20, shadowOpacity: 0.08 },
      balanced: { shadowX: 0, shadowY: 14, shadowBlur: 38, shadowOpacity: 0.14 },
      lifted: { shadowX: 0, shadowY: 20, shadowBlur: 54, shadowOpacity: 0.22 },
    }[preset]
    onTokensChange(normalizeDesignTokens({ ...tokens, effects: { ...tokens.effects, ...values } }))
  }

  function resetPalette(key: keyof typeof palette) {
    updatePalette(key, defaultDesignTokens.colors[mode][key])
  }

  function savePreset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = presetName.trim().slice(0, 60)
    if (!name) { setNotice('Add a name for this token preset.'); return }
    const preset: TokenPreset = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, savedAt: Date.now(), accentColor, tokens: normalizeDesignTokens(tokens) }
    const next = [preset, ...presets]
    if (!saveTokenPresets(next)) { setNotice('Could not save token presets in this browser.'); return }
    setPresets(next)
    setPresetName('')
    setNotice(`Saved “${name}”.`)
  }

  function loadPreset(preset: TokenPreset) {
    onTokensChange(normalizeDesignTokens(preset.tokens))
    onAccentChange(preset.accentColor)
    setNotice(`Loaded “${preset.name}”.`)
  }

  function deletePreset(preset: TokenPreset) {
    const next = presets.filter((item) => item.id !== preset.id)
    if (!saveTokenPresets(next)) { setNotice('Could not update token presets in this browser.'); return }
    setPresets(next)
    setNotice(`Deleted “${preset.name}”.`)
  }

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(generatedExport)
      setCopyNotice('Copied')
    } catch {
      setCopyNotice('Clipboard unavailable')
    }
    window.setTimeout(() => setCopyNotice(''), 1800)
  }

  return (
    <div className="token-studio-page">
      <header className="token-studio-intro">
        <div className="eyebrow"><span className="eyebrow-dot" /> DESIGN SYSTEM</div>
        <div className="token-title-row"><div><h1>Design <span>tokens.</span></h1><p>Explore token changes in an isolated sandbox. Apply them when you’re ready to update the workspace.</p></div><button className="token-reset-all" type="button" onClick={() => { onReset(); setNotice('Draft restored to default tokens. Apply to workspace when you are ready.') }}>Reset draft</button></div>
        <div className="token-draft-bar">
          <div className="token-draft-status" role="status"><span className={hasUnappliedChanges ? 'is-dirty' : ''} />{hasUnappliedChanges ? 'Unapplied draft changes' : 'Draft matches workspace'}<small>Workspace theme remains unchanged until applied.</small></div>
          <div className="token-draft-actions">
            <button className="token-discard-button" type="button" disabled={!hasUnappliedChanges} onClick={() => { onDiscard(); setNotice('Draft changes discarded. Showing the applied workspace tokens.') }}>Discard changes</button>
            <button className="token-apply-button" type="button" disabled={!hasUnappliedChanges} onClick={() => { onApply(); setNotice('Draft applied to the workspace.') }}>Apply to Workspace</button>
          </div>
        </div>
      </header>

      <section className="token-preview token-live-preview" style={previewVariables} aria-labelledby="token-preview-heading">
        <div className="token-preview-heading"><div><span className="dashboard-card-label">LIVE TOKEN PREVIEW</span><h2 id="token-preview-heading">Your system, in context</h2></div><span className="token-mode-pill">{mode} palette</span></div>
        <div className="token-preview-grid">
          <article className="token-preview-card">
            <span className="token-preview-kicker">COMPONENT SAMPLE</span>
            <h3>Thoughtful by design</h3><p>Shared tokens keep the details consistent as the interface grows.</p>
            <div className="token-preview-actions"><button type="button">Primary action</button><button type="button" className="secondary">Secondary</button></div>
            <input aria-label="Token preview input" placeholder="A token-styled input" />
            <button className={`token-preview-toggle${previewToggle ? ' is-on' : ''}`} type="button" role="switch" aria-label="Preview toggle" aria-checked={previewToggle} onClick={() => setPreviewToggle((value) => !value)}><span /></button>
          </article>
          <div className="token-preview-type"><span>TYPOGRAPHY</span><h3>The quick brown fox</h3><p>Body text uses your selected font, size, and line height.</p><div className="token-weight-samples"><span style={{ fontWeight: tokens.typography.weightNormal }}>Regular</span><span style={{ fontWeight: tokens.typography.weightMedium }}>Medium</span><span style={{ fontWeight: tokens.typography.weightStrong }}>Strong</span></div><small>LABEL · SPACING · DETAIL</small></div>
          <div className="token-preview-swatches" aria-label="Semantic color preview">
            {([['Primary', tokens.colors.primary], ['Accent', accentColor], ['Success', tokens.colors.success], ['Warning', tokens.colors.warning], ['Error', tokens.colors.error]] as const).map(([label, color]) => <div key={label}><i style={{ backgroundColor: color }} /><span>{label}</span><code>{color.toUpperCase()}</code></div>)}
          </div>
        </div>
      </section>

      <div className="token-editor-grid">
        <TokenSection number="01" title="Color tokens" description={`Editing the ${mode} neutral palette. Accent remains linked to Theme Studio.`}>
          <div className="token-color-grid">
            <TokenColorField label="Primary" value={tokens.colors.primary} onChange={(value) => updateColor('primary', value)} onReset={() => updateColor('primary', defaultDesignTokens.colors.primary)} />
            <TokenColorField label="Secondary" value={tokens.colors.secondary} onChange={(value) => updateColor('secondary', value)} onReset={() => updateColor('secondary', defaultDesignTokens.colors.secondary)} />
            <TokenColorField label="Accent" value={accentColor} onChange={onAccentChange} onReset={() => onAccentChange(defaultDesignTokens.colors.primary)} />
            <TokenColorField label="Success" value={tokens.colors.success} onChange={(value) => updateColor('success', value)} onReset={() => updateColor('success', defaultDesignTokens.colors.success)} />
            <TokenColorField label="Warning" value={tokens.colors.warning} onChange={(value) => updateColor('warning', value)} onReset={() => updateColor('warning', defaultDesignTokens.colors.warning)} />
            <TokenColorField label="Error" value={tokens.colors.error} onChange={(value) => updateColor('error', value)} onReset={() => updateColor('error', defaultDesignTokens.colors.error)} />
            {(['background', 'surface', 'surfaceRaised', 'text', 'textMuted', 'textDim', 'border'] as const).map((key) => <TokenColorField key={`${mode}-${key}`} label={key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)} value={palette[key]} onChange={(value) => updatePalette(key, value)} onReset={() => resetPalette(key)} />)}
          </div>
        </TokenSection>

        <TokenSection number="02" title="Typography" description="Tune type scale, weight, and rhythm.">
          <div className="token-font-fields">
            <TokenTextField label="Body font stack" value={tokens.typography.fontBody} onChange={(fontBody) => onTokensChange({ ...tokens, typography: { ...tokens.typography, fontBody } })} onReset={() => onTokensChange({ ...tokens, typography: { ...tokens.typography, fontBody: defaultDesignTokens.typography.fontBody } })} />
            <TokenTextField label="Display font stack" value={tokens.typography.fontDisplay} onChange={(fontDisplay) => onTokensChange({ ...tokens, typography: { ...tokens.typography, fontDisplay } })} onReset={() => onTokensChange({ ...tokens, typography: { ...tokens.typography, fontDisplay: defaultDesignTokens.typography.fontDisplay } })} />
          </div>
          <div className="token-range-grid">
            {([['sizeXs', 'Extra small', 8, 32], ['sizeSm', 'Small', 9, 36], ['sizeMd', 'Base', 10, 40], ['sizeLg', 'Large', 12, 52], ['sizeXl', 'Display', 16, 72]] as const).map(([key, label, min, max]) => <TokenNumberField key={key} label={label} value={tokens.typography[key]} min={min} max={max} onChange={(value) => updateNumber('typography', key, value)} onReset={() => resetNumber('typography', key)} />)}
            {([['weightNormal', 'Regular weight', 300, 800, 100], ['weightMedium', 'Medium weight', 300, 800, 100], ['weightStrong', 'Strong weight', 300, 900, 100]] as const).map(([key, label, min, max, step]) => <TokenNumberField key={key} label={label} value={tokens.typography[key]} min={min} max={max} step={step} unit="" onChange={(value) => updateNumber('typography', key, value)} onReset={() => resetNumber('typography', key)} />)}
            <TokenNumberField label="Body line height" value={tokens.typography.lineHeightBody} min={1} max={2.5} step={0.05} unit="" onChange={(value) => updateNumber('typography', 'lineHeightBody', value)} onReset={() => resetNumber('typography', 'lineHeightBody')} />
            <TokenNumberField label="Heading letter spacing" value={tokens.typography.letterSpacingHeading} min={-0.12} max={0.2} step={0.01} unit="em" onChange={(value) => updateNumber('typography', 'letterSpacingHeading', value)} onReset={() => resetNumber('typography', 'letterSpacingHeading')} />
          </div>
        </TokenSection>

        <TokenSection number="03" title="Spacing & shape" description="Set a shared rhythm and component geometry.">
          <div className="token-range-grid">
            {([['xs', 'Space XS', 0, 64], ['sm', 'Space SM', 0, 80], ['md', 'Space MD', 0, 96], ['lg', 'Space LG', 0, 120], ['xl', 'Space XL', 0, 160], ['xxl', 'Space 2XL', 0, 200]] as const).map(([key, label, min, max]) => <TokenNumberField key={key} label={label} value={tokens.spacing[key]} min={min} max={max} onChange={(value) => updateNumber('spacing', key, value)} onReset={() => resetNumber('spacing', key)} />)}
            {([['radiusSm', 'Small radius', 0, 32], ['radiusMd', 'Medium radius', 0, 40], ['radiusLg', 'Large radius', 0, 56], ['borderWidth', 'Border width', 0, 6], ['controlHeight', 'Control height', 28, 72], ['buttonHeight', 'Button height', 28, 80]] as const).map(([key, label, min, max]) => <TokenNumberField key={key} label={label} value={tokens.shape[key]} min={min} max={max} onChange={(value) => updateNumber('shape', key, value)} onReset={() => resetNumber('shape', key)} />)}
          </div>
          <div className="token-shape-preview" aria-label="Spacing and radius preview">{([tokens.spacing.xs, tokens.spacing.sm, tokens.spacing.md, tokens.spacing.lg, tokens.spacing.xl, tokens.spacing.xxl] as const).map((space, index) => <span key={`${space}-${index}`} style={{ width: `${Math.max(5, space)}px`, height: `${Math.max(5, space)}px`, borderRadius: `${tokens.shape.radiusSm}px` }} />)}<strong>Spacing scale</strong></div>
        </TokenSection>

        <TokenSection number="04" title="Shadows & effects" description="Control elevation and border softness.">
          <div className="token-range-grid">
            {([['shadowX', 'Shadow X offset', -24, 48], ['shadowY', 'Shadow Y offset', -24, 64], ['shadowBlur', 'Shadow blur', 0, 100]] as const).map(([key, label, min, max]) => <TokenNumberField key={key} label={label} value={tokens.effects[key]} min={min} max={max} onChange={(value) => updateNumber('effects', key, value)} onReset={() => resetNumber('effects', key)} />)}
            <TokenNumberField label="Shadow opacity" value={tokens.effects.shadowOpacity} min={0} max={0.6} step={0.01} unit="" onChange={(value) => updateNumber('effects', 'shadowOpacity', value)} onReset={() => resetNumber('effects', 'shadowOpacity')} />
            <TokenNumberField label="Border opacity" value={tokens.effects.borderOpacity} min={0.01} max={0.5} step={0.01} unit="" onChange={(value) => updateNumber('effects', 'borderOpacity', value)} onReset={() => resetNumber('effects', 'borderOpacity')} />
          </div>
          <div className="token-shadow-presets" role="group" aria-label="Shadow presets">
            <span>Presets</span>{(['soft', 'balanced', 'lifted'] as const).map((preset) => <button type="button" key={preset} onClick={() => setShadowPreset(preset)}>{preset}</button>)}
          </div>
          <div className="token-effect-sample"><div><span>Elevation sample</span><strong>Surface level 02</strong></div><i /></div>
        </TokenSection>
      </div>

      <section className="token-presets-section">
        <div className="token-section-heading"><span>05</span><div><h2>Token presets</h2><p>Named design systems are stored separately from component presets.</p></div></div>
        <form className="token-save-form" onSubmit={savePreset}><label htmlFor="token-preset-name">Save current configuration</label><input id="token-preset-name" value={presetName} maxLength={60} placeholder="e.g. Midnight mint" onChange={(event) => setPresetName(event.target.value)} /><button type="submit">Save preset</button></form>
        {notice && <p className="token-notice" role="status">{notice}</p>}
        {presets.length > 0 ? <div className="token-presets-grid">{presets.map((preset) => <article className="token-preset-card" key={preset.id}><div><i style={{ background: preset.accentColor }} /><span>{preset.name}</span></div><small>{preset.tokens.typography.fontDisplay.split(',')[0]} · {new Date(preset.savedAt).toLocaleDateString()}</small><div><button type="button" onClick={() => loadPreset(preset)}>Load preset</button><button type="button" aria-label={`Delete ${preset.name}`} onClick={() => deletePreset(preset)}>Delete</button></div></article>)}</div> : <p className="token-presets-empty">Save your current token values to create your first named preset.</p>}
      </section>

      <section className="token-export-section">
        <div className="token-export-heading"><div><span className="dashboard-card-label">TAKE YOUR TOKENS WITH YOU</span><h2>Export design tokens</h2></div><button type="button" onClick={copyExport}>{copyNotice || `Copy ${exportFormat.toUpperCase()}`}</button></div>
        <div className="token-export-tabs" role="tablist" aria-label="Token export format">{(['css', 'json'] as const).map((format) => <button type="button" role="tab" aria-selected={exportFormat === format} className={exportFormat === format ? 'is-active' : ''} key={format} onClick={() => { setExportFormat(format); setCopyNotice('') }}>{format.toUpperCase()}</button>)}</div>
        <pre><code>{generatedExport}</code></pre>
      </section>
      <footer className="page-footer"><span>INTERFACE LAB <i>·</i> DESIGN TOKEN STUDIO</span><span>DETAILS THAT ADD UP <i>✳</i></span></footer>
    </div>
  )
}
