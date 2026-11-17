import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type KeyboardEvent } from 'react'
import { FONT_CATALOG, findFontByStack, getFontWeightLabel, searchFonts, type FontCatalogEntry, type FontCategoryFilter } from './fontCatalog'
import { extractFontMetadata, validateFontFile, validateFontSignature, fontStackUsesFamily, type FontMetadata } from './customFontFiles'
import type { CustomFontState } from './useCustomFonts'
import './FontPicker.css'

const categories: { id: FontCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sans-serif', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'monospace', label: 'Mono' },
  { id: 'custom', label: 'Custom' },
]

type FontPickerProps = {
  label: string
  value: string
  customFonts: FontCatalogEntry[]
  uploadedFonts: CustomFontState[]
  protectedStacks: string[]
  isLoadingFonts: boolean
  isUploadingFont: boolean
  fontLibraryNotice: string
  onChange: (fontStack: string) => void
  onSelectFont: (font: FontCatalogEntry) => void
  onUploadFont: (file: File, metadata: FontMetadata) => Promise<string | null>
  onRemoveFont: (id: string) => Promise<string | null>
}

type MetadataDraft = {
  family: string
  style: '' | 'normal' | 'italic'
  weightMode: '' | 'static' | 'variable'
  weight: string
  weightMin: string
  weightMax: string
}

const emptyMetadata: MetadataDraft = { family: '', style: '', weightMode: '', weight: '', weightMin: '', weightMax: '' }

function metadataDraftFrom(metadata: Awaited<ReturnType<typeof extractFontMetadata>>): MetadataDraft {
  return {
    family: metadata?.family ?? '',
    style: metadata?.style ?? '',
    weightMode: metadata?.weights?.kind ?? '',
    weight: metadata?.weights?.kind === 'static' ? String(metadata.weights.values[0] ?? '') : '',
    weightMin: metadata?.weights?.kind === 'variable' ? String(metadata.weights.min) : '',
    weightMax: metadata?.weights?.kind === 'variable' ? String(metadata.weights.max) : '',
  }
}

function toFontMetadata(draft: MetadataDraft): FontMetadata {
  const weights = draft.weightMode === 'variable'
    ? { kind: 'variable' as const, min: Number(draft.weightMin), max: Number(draft.weightMax) }
    : draft.weightMode === 'static'
      ? { kind: 'static' as const, values: [Number(draft.weight)] }
      : undefined
  return { family: draft.family, style: draft.style || undefined, weights }
}

export function FontPicker({ label, value, customFonts, uploadedFonts, protectedStacks, isLoadingFonts, isUploadingFont, fontLibraryNotice, onChange, onSelectFont, onUploadFont, onRemoveFont }: FontPickerProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FontCategoryFilter>('all')
  const [activeIndex, setActiveIndex] = useState(0)
  const [customStackOpen, setCustomStackOpen] = useState(!findFontByStack(value, [...FONT_CATALOG, ...customFonts]))
  const [uploadOpen, setUploadOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<MetadataDraft>(emptyMetadata)
  const [uploadError, setUploadError] = useState('')
  const [uploadFeedback, setUploadFeedback] = useState('')
  const selectedFont = findFontByStack(value, [...FONT_CATALOG, ...customFonts])
  const results = searchFonts(query, category, [...FONT_CATALOG, ...customFonts])
  const activeFontIndex = results.length ? Math.max(0, Math.min(activeIndex, results.length - 1)) : -1
  const protectedFamilies = (family: string) => protectedStacks.some((stack) => fontStackUsesFamily(stack, family))

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) closePicker()
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  useEffect(() => {
    if (open && activeFontIndex >= 0) optionRefs.current[activeFontIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeFontIndex, open])

  function closePicker(restoreFocus = false) {
    setOpen(false)
    setQuery('')
    setCategory('all')
    if (restoreFocus) triggerRef.current?.focus()
  }

  function chooseFont(font: FontCatalogEntry) {
    onChange(font.cssFamily)
    onSelectFont(font)
    setCustomStackOpen(false)
    closePicker(true)
  }

  async function selectFile(nextFile: File | undefined) {
    if (!nextFile) return
    setUploadError('')
    setUploadFeedback('Checking file…')
    setFile(null)
    const validation = validateFontFile(nextFile)
    if (!validation.ok) {
      setUploadError(validation.message)
      setUploadFeedback('')
      return
    }
    try {
      const buffer = await nextFile.arrayBuffer()
      if (!validateFontSignature(new Uint8Array(buffer), validation.format)) {
        setUploadError('The file contents do not match its font extension. Choose a valid font file.')
        setUploadFeedback('')
        return
      }
      const detected = await extractFontMetadata(buffer, validation.format)
      setFile(nextFile)
      setMetadata(metadataDraftFrom(detected))
      setUploadFeedback(detected?.family ? `Detected ${detected.family}. Review the details before adding it.` : 'Font details were not readable. Enter the name and weight information shown by the font author.')
    } catch {
      setUploadError('This file could not be read. Choose a valid font file and try again.')
      setUploadFeedback('')
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void selectFile(event.target.files?.[0])
    event.target.value = ''
  }

  function openFileDialog() {
    fileInputRef.current?.click()
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    void selectFile(event.dataTransfer.files[0])
  }

  async function submitFont(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) return
    setUploadError('')
    const error = await onUploadFont(file, toFontMetadata(metadata))
    if (error) {
      setUploadError(error)
      return
    }
    setUploadFeedback(`${metadata.family.trim()} added to your font library.`)
    setFile(null)
    setMetadata(emptyMetadata)
  }

  async function removeFont(font: CustomFontState) {
    const error = await onRemoveFont(font.record.id)
    setUploadError(error ?? '')
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setActiveIndex(Math.max(0, results.findIndex((font) => font.id === selectedFont?.id)))
        setOpen(true)
      }
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closePicker(true)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? results.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length
      setActiveIndex(nextIndex)
      optionRefs.current[nextIndex]?.focus()
    }
  }

  const triggerTitle = selectedFont?.name ?? 'Custom font stack'

  return (
    <div className="font-picker" ref={rootRef} onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        closePicker(true)
      }
    }}>
      <span className="font-picker-label" id={`${id}-label`}>{label}</span>
      <button className="font-picker-trigger" ref={triggerRef} type="button" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-popover`} onClick={() => setOpen((current) => !current)} onKeyDown={handleTriggerKeyDown}>
        <span className="font-picker-trigger-copy"><strong>{triggerTitle}</strong><small id={`${id}-value`} style={{ fontFamily: value }}>The quick brown fox</small></span>
        <span className={`font-picker-chevron${open ? ' is-open' : ''}`} aria-hidden="true">⌄</span>
      </button>
      {open && <div className="font-picker-popover" id={`${id}-popover`}>
        <label className="font-picker-search-wrap" htmlFor={`${id}-search`}><span aria-hidden="true">⌕</span><input id={`${id}-search`} ref={searchRef} type="search" value={query} placeholder="Search fonts..." onChange={(event) => { setQuery(event.target.value); setActiveIndex(0) }} onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setActiveIndex(0); optionRefs.current[0]?.focus() }
        }} /></label>
        <div className="font-picker-categories" role="group" aria-label={`${label} font category`}>
          {categories.map((item) => <button key={item.id} type="button" aria-pressed={category === item.id} className={category === item.id ? 'is-active' : ''} onClick={() => { setCategory(item.id); setActiveIndex(0) }}>{item.label}</button>)}
        </div>
        {results.length ? <ul className="font-picker-results" role="listbox" aria-label={`${label} fonts`}>
          {results.map((font, index) => <li key={font.id}>
            <button ref={(element) => { optionRefs.current[index] = element }} type="button" role="option" aria-selected={font.cssFamily === value} className={`font-picker-option${font.cssFamily === value ? ' is-selected' : ''}${index === activeFontIndex ? ' is-active' : ''}`} onClick={() => chooseFont(font)} onFocus={() => setActiveIndex(index)} onKeyDown={(event) => handleOptionKeyDown(event, index)}>
              <span className="font-picker-option-copy"><strong>{font.name}{font.assetStatus === 'custom' && <em>Custom</em>}</strong><small>{font.category === 'custom' ? `${font.style ?? 'normal'} · ${getFontWeightLabel(font.weights)}` : `${font.category} · ${getFontWeightLabel(font.weights)}`} · {font.assetStatus === 'self-hosted' ? 'Self-hosted' : font.assetStatus === 'existing-remote' ? 'Remote · network required' : 'Stored on this device'}</small></span>
              <span className="font-picker-specimen" aria-hidden="true" style={{ fontFamily: font.cssFamily }}>Aa 012</span>
              {font.cssFamily === value && <span className="font-picker-check" aria-hidden="true">✓</span>}
            </button>
          </li>)}
        </ul> : <p className="font-picker-empty" role="status">No fonts match this search.</p>}
        <div className="font-picker-custom">
          <button className="font-picker-custom-toggle" type="button" aria-expanded={customStackOpen} onClick={() => setCustomStackOpen((current) => !current)}>Custom CSS font stack <span>{customStackOpen ? '−' : '+'}</span></button>
          {customStackOpen && <label htmlFor={`${id}-custom`}>CSS family list<input id={`${id}-custom`} value={value} maxLength={120} onChange={(event) => onChange(event.target.value)} onBlur={() => { if (!value.trim()) onChange('system-ui, sans-serif') }} /></label>}
        </div>
        <section className="font-picker-upload-section" aria-label="Custom font library">
          <button className="font-picker-custom-toggle" type="button" aria-expanded={uploadOpen} onClick={() => setUploadOpen((current) => !current)}>Upload custom font <span>{uploadOpen ? '−' : '+'}</span></button>
          {uploadOpen && <div className="font-picker-upload-panel">
            <div className={`font-picker-dropzone${dragging ? ' is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
              <strong>{file ? file.name : 'Drop a font file here'}</strong>
              <small>WOFF2, WOFF, TTF or OTF · up to 10 MB</small>
              <input ref={fileInputRef} className="font-picker-file-input" type="file" id={`${id}-file`} accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" onChange={handleFileChange} aria-label="Choose a custom font file" />
              <button className="font-picker-browse" type="button" onClick={openFileDialog}>Browse files</button>
            </div>
            {file && <form className="font-picker-metadata-form" onSubmit={submitFont}>
              <label>Family name<input required maxLength={80} value={metadata.family} onChange={(event) => setMetadata((current) => ({ ...current, family: event.target.value }))} /></label>
              <fieldset><legend>Style</legend><button type="button" aria-pressed={metadata.style === 'normal'} className={metadata.style === 'normal' ? 'is-selected' : ''} onClick={() => setMetadata((current) => ({ ...current, style: 'normal' }))}>Regular</button><button type="button" aria-pressed={metadata.style === 'italic'} className={metadata.style === 'italic' ? 'is-selected' : ''} onClick={() => setMetadata((current) => ({ ...current, style: 'italic' }))}>Italic</button></fieldset>
              <fieldset><legend>Weight information</legend><button type="button" aria-pressed={metadata.weightMode === 'static'} className={metadata.weightMode === 'static' ? 'is-selected' : ''} onClick={() => setMetadata((current) => ({ ...current, weightMode: 'static' }))}>Single weight</button><button type="button" aria-pressed={metadata.weightMode === 'variable'} className={metadata.weightMode === 'variable' ? 'is-selected' : ''} onClick={() => setMetadata((current) => ({ ...current, weightMode: 'variable' }))}>Variable range</button>
                {metadata.weightMode === 'static' && <label>Weight (1–1000)<input required inputMode="numeric" pattern="[0-9]{1,4}" value={metadata.weight} onChange={(event) => setMetadata((current) => ({ ...current, weight: event.target.value }))} /></label>}
                {metadata.weightMode === 'variable' && <div className="font-picker-weight-range"><label>Minimum<input required inputMode="numeric" pattern="[0-9]{1,4}" value={metadata.weightMin} onChange={(event) => setMetadata((current) => ({ ...current, weightMin: event.target.value }))} /></label><label>Maximum<input required inputMode="numeric" pattern="[0-9]{1,4}" value={metadata.weightMax} onChange={(event) => setMetadata((current) => ({ ...current, weightMax: event.target.value }))} /></label></div>}
              </fieldset>
              <button className="font-picker-add-button" type="submit" disabled={isUploadingFont || !metadata.style || !metadata.weightMode}>{isUploadingFont ? 'Loading font…' : 'Add to font library'}</button>
            </form>}
            {(uploadFeedback || fontLibraryNotice) && <p className="font-picker-upload-status" role="status">{uploadFeedback || fontLibraryNotice}</p>}
            {uploadError && <p className="font-picker-upload-error" role="alert">{uploadError}</p>}
            {isLoadingFonts && <p className="font-picker-upload-status" role="status">Loading saved fonts…</p>}
            {uploadedFonts.length > 0 && <div className="font-picker-managed-fonts"><strong>Saved custom fonts</strong>{uploadedFonts.map((font) => {
              const inUse = protectedFamilies(font.record.family)
              return <div className="font-picker-managed-font" key={font.record.id}><span><b>{font.record.family}</b><small>{font.record.fileName} · {font.loaded ? `${font.record.style} · ${getFontWeightLabel(font.record.weights)}` : font.loadError}</small></span><button type="button" disabled={inUse} title={inUse ? 'Choose another Body and Display font before removing this file.' : `Remove ${font.record.family}`} aria-label={`Remove uploaded font ${font.record.family}`} onClick={() => void removeFont(font)}>{inUse ? 'In use' : 'Remove'}</button></div>
            })}</div>}
          </div>}
        </section>
        <p className="font-picker-license">Built-in fonts use SIL OFL 1.1. Custom files stay in this browser.</p>
      </div>}
    </div>
  )
}
