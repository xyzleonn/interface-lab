import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { ColorPickerField } from './components/ui/ColorPickerField'
import { useCardParallax } from './hooks/useCardParallax'
import { VisualComponentEditor } from './features/playground/VisualComponentEditor'
import { TokenStudio } from './features/tokens/TokenStudio'
import { getNextOverviewHeadlineIndex, overviewHeadlines } from './features/dashboard/overviewHeadlines'
import { getAppearancePreviewVariables } from './features/tokens/appearancePreview'
import { getDesignTokenVariables } from './features/tokens/tokenCss'
import { useCustomFonts } from './features/tokens/useCustomFonts'
import { loadDesignTokens, saveDesignTokens } from './features/tokens/tokenStorage'
import type { DesignTokens } from './features/tokens/tokenTypes'
import { normalizeColorHex } from './utils/colors'
import { ACCENT_PRESETS, DEFAULT_ACCENT, deriveAccent, getAccentCssVariables, type AccentPresetId } from './utils/accent'
import { normalizeDesignTokens } from './features/tokens/tokenDefaults'
import './App.css'

type IconName = 'grid' | 'sparkles' | 'tokens' | 'shapes' | 'settings' | 'search' | 'command' | 'chevron'

const iconPaths: Record<IconName, string> = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  sparkles: 'm12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3ZM19 14l1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z',
  tokens: 'M4 5h16M4 12h16M4 19h16M8 3v4m8 3v4m-5 3v4',
  shapes: 'M12 3 21 8l-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64',
  search: 'm20 20-4.4-4.4M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  command: 'M9 7V5a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v14a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2V7Z',
  chevron: 'm9 18 6-6-6-6',
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPaths[name]} />
    </svg>
  )
}

type PageId = 'overview' | 'theme-studio' | 'token-studio' | 'playground' | 'settings'
type ThemeMode = 'dark' | 'light'
type AccentId = AccentPresetId | 'custom'
type ThemeSettings = { mode: ThemeMode; accent: AccentId; customColor: string }
type ThemeActivity = { id: number; kind: 'appearance' | 'accent'; title: string; detail: string; time: string }
type ApplicationPreferences = {
  animationsEnabled: boolean
  reducedMotion: boolean
  density: 'comfortable' | 'compact'
  cardReflections: boolean
}

const themeStorageKey = 'interface-lab-theme'
const preferencesStorageKey = 'interface-lab-preferences'
const defaultAccent = DEFAULT_ACCENT
const accentOptions = ACCENT_PRESETS

function loadThemeSettings(): ThemeSettings {
  try {
    const saved = localStorage.getItem(themeStorageKey)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (typeof parsed === 'object' && parsed !== null && 'mode' in parsed && 'accent' in parsed) {
        const value = parsed as ThemeSettings
        const validMode = value.mode === 'dark' || value.mode === 'light'
        const validAccent = value.accent === 'custom' || accentOptions.some((option) => option.id === value.accent)
        const customColor = normalizeColorHex(typeof value.customColor === 'string' ? value.customColor : defaultAccent)
        if (validMode && validAccent && customColor) return { mode: value.mode, accent: value.accent, customColor }
      }
    }
  } catch {
    // If storage is unavailable or malformed, start with the default theme.
  }
  return { mode: 'dark', accent: 'lavender', customColor: defaultAccent }
}

function defaultPreferences(): ApplicationPreferences {
  return {
    animationsEnabled: true,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    density: 'comfortable',
    cardReflections: true,
  }
}

function loadPreferences(): ApplicationPreferences {
  const defaults = defaultPreferences()
  try {
    const saved = localStorage.getItem(preferencesStorageKey)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (typeof parsed === 'object' && parsed !== null) {
        const value = parsed as Partial<ApplicationPreferences>
        return {
          animationsEnabled: typeof value.animationsEnabled === 'boolean' ? value.animationsEnabled : defaults.animationsEnabled,
          reducedMotion: typeof value.reducedMotion === 'boolean' ? value.reducedMotion : defaults.reducedMotion,
          density: value.density === 'compact' ? 'compact' : 'comfortable',
          cardReflections: typeof value.cardReflections === 'boolean' ? value.cardReflections : defaults.cardReflections,
        }
      }
    }
  } catch {
    // Use defaults if storage is unavailable or contains invalid JSON.
  }
  return defaults
}

function getAccentLabel(settings: ThemeSettings) {
  if (settings.accent === 'custom') return `Custom · ${settings.customColor.toUpperCase()}`
  return accentOptions.find((option) => option.id === settings.accent)?.label ?? 'Lavender'
}

function getAccentColor(settings: ThemeSettings) {
  return settings.accent === 'custom'
    ? settings.customColor
    : accentOptions.find((option) => option.id === settings.accent)?.color ?? defaultAccent
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const sections: { id: PageId; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'theme-studio', label: 'Theme studio', icon: 'sparkles' },
  { id: 'token-studio', label: 'Design tokens', icon: 'tokens' },
  { id: 'playground', label: 'Playground', icon: 'shapes' },
]

function getCurrentPage(): PageId {
  const page = window.location.hash.slice(1)
  return sections.some((section) => section.id === page) || page === 'settings'
    ? (page as PageId)
    : 'overview'
}

function Sidebar({ currentPage }: { currentPage: PageId }) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <a className="brand" href="#overview" aria-label="Interface Lab home">
        <img className="brand-mark" src="/assets/interface-lab-logo.png.png" alt="" aria-hidden="true" />
        <span className="brand-name">interface<span>lab</span></span>
        <span className="brand-version">BETA</span>
      </a>

      <div className="workspace-identity">
        <span className="workspace-avatar">IL</span>
        <span className="workspace-copy"><strong>Personal workspace</strong><small>Current workspace</small></span>
      </div>

      <nav className="side-nav">
        <p className="nav-label">WORKSPACE</p>
        {sections.map((item) => (
          <a className={`nav-item${currentPage === item.id ? ' is-active' : ''}`} href={`#${item.id}`} key={item.id} aria-current={currentPage === item.id ? 'page' : undefined}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {currentPage === item.id && <span className="nav-indicator" />}
          </a>
        ))}
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-note">
        <span className="note-orb" />
        <div><strong>A space to explore</strong><p>Make something feel just right.</p></div>
      </div>
      <a className={`nav-item settings-link${currentPage === 'settings' ? ' is-active' : ''}`} href="#settings" aria-current={currentPage === 'settings' ? 'page' : undefined}><Icon name="settings" /><span>Settings</span>{currentPage === 'settings' && <span className="nav-indicator" />}</a>
    </aside>
  )
}

function PageHeader({ currentPage }: { currentPage: PageId }) {
  const pageLabel = sections.find((section) => section.id === currentPage)?.label ?? 'Settings'
  const searchId = useId()
  const searchRootRef = useRef<HTMLDivElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchablePages = [...sections, { id: 'settings' as const, label: 'Settings', icon: 'settings' as const }]
  const matches = searchablePages.filter((page) => page.label.toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    function dismissOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !searchRootRef.current?.contains(event.target)) {
        setSearchOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', dismissOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', dismissOnOutsidePointer)
  }, [searchOpen])

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [])

  function closeSearch(restoreFocus = false) {
    setSearchOpen(false)
    setQuery('')
    if (restoreFocus) searchButtonRef.current?.focus()
  }

  return (
    <header className="page-header">
      <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{pageLabel}</strong></div>
      <div className="header-actions">
        <div className="header-search" ref={searchRootRef}>
          <button className="search-button" ref={searchButtonRef} type="button" aria-label="Find a page" aria-expanded={searchOpen} aria-controls={searchId} onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}><Icon name="search" /><span>Find a page...</span><kbd><Icon name="command" size={12} /> K</kbd></button>
          {searchOpen && <div className="header-search-panel" id={searchId} role="region" aria-label="Page search" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); closeSearch(true) } }}>
            <label className="sr-only" htmlFor={`${searchId}-input`}>Find a page</label>
            <input id={`${searchId}-input`} ref={searchInputRef} type="search" value={query} placeholder="Search workspace pages" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
              if (event.key === 'Enter' && matches[0]) {
                window.location.hash = matches[0].id
                closeSearch(true)
              }
            }} />
            {matches.length > 0 ? <nav aria-label="Matching pages"><ul>{matches.map((page) => <li key={page.id}><a href={`#${page.id}`} aria-current={page.id === currentPage ? 'page' : undefined} onClick={() => closeSearch(true)}><Icon name={page.icon} size={16} /><span>{page.label}</span><Icon name="chevron" size={14} /></a></li>)}</ul></nav> : <p className="header-search-empty" role="status">No pages match “{query.trim()}”.</p>}
            <div className="header-search-hint"><span>Navigate to a page</span><kbd>ESC</kbd></div>
          </div>}
        </div>
        <span className="header-divider" />
        <span className="status-indicator"><i /> All systems calm</span>
      </div>
    </header>
  )
}

function DashboardCard({ className = '', children, href, ariaLabel }: { className?: string; children: ReactNode; href?: string; ariaLabel?: string }) {
  const { ref, onPointerMove, onPointerLeave } = useCardParallax<HTMLElement>()
  const cardClassName = `dashboard-card ${className}${href ? ' dashboard-card--link' : ''}`

  if (href) {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        aria-label={ariaLabel}
        className={cardClassName}
        onPointerMove={(event) => onPointerMove(event)}
        onPointerLeave={() => onPointerLeave()}
      >
        {children}
      </a>
    )
  }

  return (
    <article
      ref={ref}
      className={cardClassName}
      onPointerMove={(event) => onPointerMove(event)}
      onPointerLeave={() => onPointerLeave()}
    >
      {children}
    </article>
  )
}

function PlaygroundPage({ themeAccent }: { themeAccent: string }) {
  return <VisualComponentEditor themeAccent={themeAccent} />
}

function ThemeStudioPage({ settings, tokens, onChange }: { settings: ThemeSettings; tokens: DesignTokens; onChange: (settings: ThemeSettings) => void }) {
  const selectedAccent = settings.accent === 'custom'
    ? { id: 'custom' as const, label: 'Custom', color: settings.customColor }
    : accentOptions.find((option) => option.id === settings.accent) ?? accentOptions[0]

  function selectCustomColor(color: string) {
    const normalized = normalizeColorHex(color)
    if (!normalized) return
    onChange({ ...settings, accent: 'custom', customColor: normalized })
  }

  function resetAccent() {
    onChange({ ...settings, accent: 'lavender', customColor: defaultAccent })
  }

  return (
    <div className="theme-studio-page">
      <section className="theme-studio-intro">
        <div className="eyebrow"><span className="eyebrow-dot" /> THEME STUDIO</div>
        <h1>Set the <span>right mood.</span></h1>
        <p>Shape the atmosphere of your workspace. Changes apply as you make them.</p>
      </section>

      <section className="theme-settings-section" aria-labelledby="appearance-title">
        <div className="section-heading"><div><span className="section-index">01</span><h2 id="appearance-title">Appearance</h2></div><p>Choose the light around your work.</p></div>
        <div className="appearance-options">
          {(['dark', 'light'] as const).map((mode) => (
            <button className={`appearance-option ${mode}${settings.mode === mode ? ' is-selected' : ''}`} type="button" key={mode} aria-pressed={settings.mode === mode} onClick={() => onChange({ ...settings, mode })}>
              <span className={`appearance-preview ${mode}`} aria-hidden="true" style={getAppearancePreviewVariables(tokens, mode) as CSSProperties}><i /><i /><i /><b /></span>
              <span className="appearance-option-copy"><strong>{mode === 'dark' ? 'Dark' : 'Light'}</strong><small>{mode === 'dark' ? 'Easy on the eyes' : 'Clear and airy'}</small></span>
              <span className="selection-mark" aria-hidden="true">✓</span>
            </button>
          ))}
        </div>
      </section>

      <section className="theme-settings-section" aria-labelledby="accent-title">
        <div className="section-heading"><div><span className="section-index">02</span><h2 id="accent-title">Accent color</h2></div><p>One small detail changes the whole feel.</p></div>
        <div className="accent-options" role="group" aria-label="Choose an accent color">
          {accentOptions.map((option) => (
            <button className={`accent-option${settings.accent === option.id ? ' is-selected' : ''}`} type="button" key={option.id} aria-label={option.label} aria-pressed={settings.accent === option.id} onClick={() => onChange({ ...settings, accent: option.id })}>
              <span style={{ backgroundColor: option.color }} />
              <small>{option.label}</small>
            </button>
          ))}
          <button className={`accent-option custom-accent-option${settings.accent === 'custom' ? ' is-selected' : ''}`} type="button" aria-label="Custom accent color" aria-pressed={settings.accent === 'custom'} onClick={() => onChange({ ...settings, accent: 'custom' })}>
            <span className="custom-swatch" style={{ backgroundColor: settings.customColor }}>
              <span className="custom-swatch-icon" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" focusable="false">
                  <line x1="2" y1="6" x2="10" y2="6" />
                  <line x1="6" y1="2" x2="6" y2="10" />
                </svg>
              </span>
            </span>
            <small>Custom</small>
          </button>
        </div>
        <div className="custom-color-controls">
          <ColorPickerField label="Custom accent" value={settings.customColor} onChange={selectCustomColor} className="theme-accent-picker" commitOnChange revertInvalidOnBlur />
          <button className="reset-accent-button" type="button" onClick={resetAccent}>Reset to default</button>
        </div>
      </section>

      <section className="theme-settings-section live-preview-section" aria-labelledby="preview-title">
        <div className="section-heading"><div><span className="section-index">03</span><h2 id="preview-title">Live preview</h2></div><p>Your choices, together.</p></div>
        <div className="theme-live-preview">
          <div className="live-preview-top"><span className="preview-brand-mark">i</span><span>interface<span>lab</span></span><span className="preview-mode-label">{settings.mode} mode</span></div>
          <div className="live-preview-body"><div><small>YOUR WORKSPACE</small><h3>A thoughtful little detail.</h3><p>Accent: {selectedAccent.label}</p></div><button type="button">Looks good <span>↗</span></button></div>
          <div className="live-preview-bottom"><span><i /> Synced with your theme</span><span className="preview-mini-bars"><i /><i /><i /></span></div>
        </div>
      </section>
      <footer className="page-footer"><span>INTERFACE LAB <i>·</i> THEME STUDIO</span><span>MAKE IT YOURS <i>✳</i></span></footer>
    </div>
  )
}

function PreferenceToggle({ checked, title, description, onChange }: { checked: boolean; title: string; description: string; onChange: (checked: boolean) => void }) {
  return (
    <div className="preference-row">
      <span><strong>{title}</strong><small>{description}</small></span>
      <button className={`toggle${checked ? ' is-on' : ''}`} type="button" role="switch" aria-checked={checked} aria-label={title} onClick={() => onChange(!checked)}><span /></button>
    </div>
  )
}

function SettingsPage({
  settings,
  tokens,
  preferences,
  onPreferenceChange,
  onReset,
}: {
  settings: ThemeSettings
  tokens: DesignTokens
  preferences: ApplicationPreferences
  onPreferenceChange: (updates: Partial<ApplicationPreferences>) => void
  onReset: () => void
}) {
  const accentColor = settings.accent === 'custom'
    ? settings.customColor
    : accentOptions.find((option) => option.id === settings.accent)?.color ?? defaultAccent
  const activePalette = tokens.colors[settings.mode]

  return (
    <div className="settings-page">
      <section className="settings-intro">
        <div className="eyebrow"><span className="eyebrow-dot" /> YOUR WORKSPACE</div>
        <h1>Preferences<span>, just so.</span></h1>
        <p>A few small choices to make the space work the way you like.</p>
      </section>

      <div className="settings-grid">
        <section className="settings-section" aria-labelledby="motion-settings-title">
          <div className="section-heading"><div><span className="section-index">01</span><h2 id="motion-settings-title">Motion</h2></div><p>Set the pace of the interface.</p></div>
          <div className="preference-list">
            <PreferenceToggle title="Interface animations" description="Animate page entrances and control transitions." checked={preferences.animationsEnabled} onChange={(checked) => onPreferenceChange({ animationsEnabled: checked })} />
            <PreferenceToggle title="Reduced motion" description="Limit movement, including the dashboard card tilt." checked={preferences.reducedMotion} onChange={(checked) => onPreferenceChange({ reducedMotion: checked })} />
          </div>
        </section>

        <section className="settings-section" aria-labelledby="interface-settings-title">
          <div className="section-heading"><div><span className="section-index">02</span><h2 id="interface-settings-title">Interface</h2></div><p>Choose how much room your content gets.</p></div>
          <div className="density-options" role="group" aria-label="Interface density">
            {(['comfortable', 'compact'] as const).map((density) => (
              <button className={`density-option${preferences.density === density ? ' is-selected' : ''}`} type="button" key={density} aria-pressed={preferences.density === density} onClick={() => onPreferenceChange({ density })}>
                <span className={`density-preview ${density}`} aria-hidden="true"><i /><i /><i /></span>
                <span><strong>{density === 'comfortable' ? 'Comfortable' : 'Compact'}</strong><small>{density === 'comfortable' ? 'A little more breathing room' : 'Fit more into each view'}</small></span>
                <i className="density-check" aria-hidden="true">✓</i>
              </button>
            ))}
          </div>
          <div className="preference-list preference-list-single">
            <PreferenceToggle title="Cursor light reflections" description="Show a soft highlight as you move across dashboard cards." checked={preferences.cardReflections} onChange={(checked) => onPreferenceChange({ cardReflections: checked })} />
          </div>
        </section>

        <section className="settings-section appearance-settings" aria-labelledby="appearance-settings-title">
          <div className="section-heading"><div><span className="section-index">03</span><h2 id="appearance-settings-title">Appearance</h2></div><p>Your active Theme Studio choices.</p></div>
          <div className="settings-theme-summary">
            <div className="settings-theme-preview" aria-hidden="true" style={{ backgroundColor: activePalette.background, borderColor: activePalette.border }}>
              <span className="settings-preview-sidebar" style={{ backgroundColor: activePalette.surface }} />
              <span className="settings-preview-content">
                <i style={{ backgroundColor: activePalette.text }} />
                <i style={{ backgroundColor: activePalette.textMuted }} />
                <b style={{ backgroundColor: accentColor }} />
              </span>
            </div>
            <span className="settings-theme-copy"><strong>{settings.mode === 'dark' ? 'Dark appearance' : 'Light appearance'}</strong><small>{getAccentLabel(settings)}</small></span>
            <span className="settings-theme-palette" role="img" aria-label="Active accent, secondary, raised surface and muted text colors">
              {[accentColor, tokens.colors.secondary, activePalette.surfaceRaised, activePalette.textMuted].map((color, index) => <i key={`${color}-${index}`} style={{ backgroundColor: color }} />)}
            </span>
            <a className="settings-theme-link" href="#theme-studio">Open Theme Studio <span>↗</span></a>
          </div>
        </section>
      </div>

      <section className="settings-reset-section" aria-labelledby="reset-settings-title">
        <div><h2 id="reset-settings-title">Reset preferences</h2><p>Restore motion, density, and appearance preferences to their defaults.</p></div>
        <button className="reset-preferences-button" type="button" onClick={onReset}>Reset all</button>
      </section>
      <footer className="page-footer"><span>INTERFACE LAB <i>·</i> SETTINGS</span><span>SET YOUR OWN PACE <i>✳</i></span></footer>
    </div>
  )
}

function App() {
  const [currentPage, setCurrentPage] = useState<PageId>(getCurrentPage)
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(loadThemeSettings)
  const [themeActivity, setThemeActivity] = useState<ThemeActivity[]>([])
  const [preferences, setPreferences] = useState<ApplicationPreferences>(loadPreferences)
  const [appliedTokens, setAppliedTokens] = useState<DesignTokens>(loadDesignTokens)
  const [draftTokens, setDraftTokens] = useState<DesignTokens>(() => normalizeDesignTokens(appliedTokens))
  const [draftAccentColor, setDraftAccentColor] = useState(() => getAccentColor(themeSettings))
  const customFontLibrary = useCustomFonts()
  const protectedFontStacks = [appliedTokens.typography.fontBody, appliedTokens.typography.fontDisplay, draftTokens.typography.fontBody, draftTokens.typography.fontDisplay]

  useEffect(() => {
    const syncPageWithUrl = () => setCurrentPage(getCurrentPage())
    window.addEventListener('hashchange', syncPageWithUrl)
    return () => window.removeEventListener('hashchange', syncPageWithUrl)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = themeSettings.mode
    try {
      localStorage.setItem(themeStorageKey, JSON.stringify(themeSettings))
    } catch {
      // The selected theme still works for this session if storage is blocked.
    }
  }, [themeSettings])

  useEffect(() => {
    const root = document.documentElement
    const accentColor = themeSettings.accent === 'custom'
      ? themeSettings.customColor
      : accentOptions.find((option) => option.id === themeSettings.accent)?.color ?? defaultAccent
    const appliedVariables = {
      ...getDesignTokenVariables(appliedTokens, themeSettings.mode, accentColor),
      ...getAccentCssVariables(accentColor),
    }
    Object.entries(appliedVariables).forEach(([name, value]) => root.style.setProperty(name, value))
    saveDesignTokens(appliedTokens)
  }, [appliedTokens, themeSettings.accent, themeSettings.customColor, themeSettings.mode])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.animations = preferences.animationsEnabled ? 'on' : 'off'
    root.dataset.reducedMotion = String(preferences.reducedMotion)
    root.dataset.density = preferences.density
    root.dataset.cardReflections = preferences.cardReflections ? 'on' : 'off'
    try {
      localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences))
    } catch {
      // Preferences still apply until this page closes if storage is blocked.
    }
  }, [preferences])

  function updateThemeSettings(next: ThemeSettings) {
    const appearanceChanged = next.mode !== themeSettings.mode
    const accentChanged = next.accent !== themeSettings.accent
      || (next.accent === 'custom' && next.customColor !== themeSettings.customColor)
    if (!appearanceChanged && !accentChanged) return

    const now = new Date()
    const updates: Omit<ThemeActivity, 'id' | 'time'>[] = []
    if (appearanceChanged) {
      updates.push({ kind: 'appearance', title: 'Changed appearance', detail: `${themeSettings.mode} → ${next.mode}` })
    }
    if (accentChanged) {
      updates.push({ kind: 'accent', title: 'Updated accent color', detail: `${getAccentLabel(themeSettings)} → ${getAccentLabel(next)}` })
    }
    setThemeSettings(next)
    if (draftAccentColor === getAccentColor(themeSettings)) setDraftAccentColor(getAccentColor(next))
    setThemeActivity((activity) => [
      ...updates.map((update, index) => ({ ...update, id: now.getTime() + index, time: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) })),
      ...activity,
    ])
  }

  function updatePreferences(updates: Partial<ApplicationPreferences>) {
    setPreferences((current) => ({ ...current, ...updates }))
  }

  function applyTokenDraft() {
    const appliedTokens = normalizeDesignTokens(draftTokens)
    const matchingAccent = accentOptions.find((option) => option.color.toLowerCase() === draftAccentColor.toLowerCase())
    setAppliedTokens(appliedTokens)
    setDraftTokens(normalizeDesignTokens(appliedTokens))
    updateThemeSettings({
      ...themeSettings,
      accent: matchingAccent?.id ?? 'custom',
      customColor: draftAccentColor,
    })
  }

  function discardTokenDraft() {
    setDraftTokens(normalizeDesignTokens(appliedTokens))
    setDraftAccentColor(getAccentColor(themeSettings))
  }

  function resetTokenDraft() {
    setDraftTokens(normalizeDesignTokens(null))
    setDraftAccentColor(defaultAccent)
  }

  function resetPreferences() {
    const confirmed = window.confirm('Reset all preferences to their defaults? This will also restore the dark theme and lavender accent.')
    if (!confirmed) return
    setPreferences(defaultPreferences())
    updateThemeSettings({ mode: 'dark', accent: 'lavender', customColor: defaultAccent })
  }

  const editorAccent = getAccentColor(themeSettings)
  const hasTokenDraftChanges = JSON.stringify(draftTokens) !== JSON.stringify(appliedTokens)
    || draftAccentColor.toLowerCase() !== editorAccent.toLowerCase()

  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} />
      <main className="main-panel">
        <PageHeader currentPage={currentPage} />
        {currentPage === 'overview' ? <OverviewPage settings={themeSettings} activity={themeActivity} motionEnabled={preferences.animationsEnabled && !preferences.reducedMotion} /> : currentPage === 'playground' ? <PlaygroundPage themeAccent={editorAccent} /> : currentPage === 'theme-studio' ? <ThemeStudioPage settings={themeSettings} tokens={appliedTokens} onChange={updateThemeSettings} /> : currentPage === 'token-studio' ? <TokenStudio tokens={draftTokens} mode={themeSettings.mode} accentColor={draftAccentColor} accentVariables={deriveAccent(draftAccentColor)} hasUnappliedChanges={hasTokenDraftChanges} onTokensChange={setDraftTokens} onAccentChange={setDraftAccentColor} onApply={applyTokenDraft} onDiscard={discardTokenDraft} onReset={resetTokenDraft} fontLibrary={customFontLibrary} protectedFontStacks={protectedFontStacks} /> : <SettingsPage settings={themeSettings} tokens={appliedTokens} preferences={preferences} onPreferenceChange={updatePreferences} onReset={resetPreferences} />}
      </main>
    </div>
  )
}

function OverviewPage({ settings, activity, motionEnabled }: { settings: ThemeSettings; activity: ThemeActivity[]; motionEnabled: boolean }) {
  const [headlineIndex, setHeadlineIndex] = useState(0)
  const accent = settings.accent === 'custom'
    ? settings.customColor
    : accentOptions.find((option) => option.id === settings.accent)?.color ?? defaultAccent
  const appearanceChanges = activity.filter((item) => item.kind === 'appearance').length
  const accentChanges = activity.filter((item) => item.kind === 'accent').length

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let interval: number | undefined
    const syncMotion = () => {
      if (interval !== undefined) window.clearInterval(interval)
      interval = undefined
      if (!motionEnabled || reducedMotion.matches) return
      interval = window.setInterval(() => {
        setHeadlineIndex(getNextOverviewHeadlineIndex)
      }, 4500)
    }

    syncMotion()
    reducedMotion.addEventListener('change', syncMotion)
    return () => {
      if (interval !== undefined) window.clearInterval(interval)
      reducedMotion.removeEventListener('change', syncMotion)
    }
  }, [motionEnabled])

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome" aria-labelledby="welcome-title">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR CREATIVE WORKSPACE</div>
          <h1 id="welcome-title">{getGreeting()},<br /><span className="dashboard-headline-track">{overviewHeadlines.map((headline, index) => <span key={headline} className={index === headlineIndex ? 'is-current' : ''} aria-hidden={index !== headlineIndex}>{headline}</span>)}</span></h1>
          <p>A little space to explore ideas, tune the details, and build interfaces that feel like you.</p>
        </div>
        <div className="welcome-orbit" aria-hidden="true"><div className="welcome-orbit-dots"><i /><i /><i /></div><span>✳</span></div>
      </section>

      <section className="dashboard-grid" aria-label="Your workspace">
        <DashboardCard className="quick-card theme-quick-card" href="#theme-studio" ariaLabel="Open Theme Studio">
          <div className="dashboard-card-top"><span className="dashboard-card-icon theme-card-icon"><Icon name="sparkles" /></span><span className="dashboard-card-label">MAKE IT YOURS</span><span className="dashboard-card-arrow"><Icon name="chevron" size={15} /></span></div>
          <div className="quick-card-art theme-art" aria-hidden="true"><span /><span /><span /><i /></div>
          <h2>Theme Studio</h2><p>Find the colors and atmosphere that feel like you.</p>
          <span className="dashboard-card-link">Explore themes <span>↗</span></span>
        </DashboardCard>

        <DashboardCard className="quick-card playground-quick-card" href="#playground" ariaLabel="Open Component Playground">
          <div className="dashboard-card-top"><span className="dashboard-card-icon playground-card-icon"><Icon name="shapes" /></span><span className="dashboard-card-label">PLAY, THEN POLISH</span><span className="dashboard-card-arrow"><Icon name="chevron" size={15} /></span></div>
          <div className="quick-card-art playground-art" aria-hidden="true"><span>Aa</span><i /><b /><em /></div>
          <h2>Component Playground</h2><p>Try buttons, toggles, and little interface details.</p>
          <span className="dashboard-card-link">Open playground <span>↗</span></span>
        </DashboardCard>

        <DashboardCard className="theme-overview-card" href="#theme-studio" ariaLabel="Open Theme Studio to edit the current theme">
          <div className="dashboard-card-top"><span className="dashboard-card-icon theme-card-icon"><Icon name="sparkles" size={15} /></span><span className="dashboard-card-label">CURRENT THEME</span></div>
          <div className="current-theme-display"><span className="theme-color-orb" style={{ backgroundColor: accent }} /><div><strong>{settings.mode === 'dark' ? 'Dark mode' : 'Light mode'}</strong><small>{getAccentLabel(settings)}</small></div></div>
          <div className="theme-card-divider" />
          <div className="theme-attributes"><span><i className="mode-indicator" /> Appearance</span><strong>{settings.mode}</strong></div>
          <div className="theme-attributes"><span><i className="accent-indicator" style={{ backgroundColor: accent }} /> Accent</span><strong>{settings.accent === 'custom' ? 'Custom' : 'Preset'}</strong></div>
          <span className="dashboard-card-link">Edit <span>↗</span></span>
        </DashboardCard>

        <DashboardCard className="activity-card">
          <div className="dashboard-card-top"><div><span className="dashboard-card-label">RECENT ACTIVITY</span><h2>Your session</h2></div><span className="session-live"><i /> LIVE</span></div>
          {activity.length > 0 ? (
            <ul className="activity-list">
              {activity.slice(0, 4).map((item) => (
                <li key={item.id}><span className={`activity-mark ${item.kind}`}><i /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{item.time}</time></li>
              ))}
            </ul>
          ) : (
            <div className="activity-empty"><span className="empty-spark">✳</span><p>Your theme edits will show up here as you explore.</p><a href="#theme-studio">Try a theme <span>↗</span></a></div>
          )}
        </DashboardCard>

        <DashboardCard className="session-stats-card">
          <div className="dashboard-card-top"><div><span className="dashboard-card-label">A FEW REAL NUMBERS</span><h2>This session</h2></div><span className="stats-glyph">⌁</span></div>
          <div className="session-stat"><span>Appearance changes</span><strong>{appearanceChanges}</strong></div>
          <div className="session-stat"><span>Accent explorations</span><strong>{accentChanges}</strong></div>
          <div className="stats-footnote"><span className="session-live"><i /> SESSION ONLY</span><span>Resets when you close the page</span></div>
        </DashboardCard>
      </section>
      <footer className="page-footer"><span>INTERFACE LAB <i>·</i> YOUR CREATIVE WORKSPACE</span><span>TAKE YOUR TIME <i>✳</i></span></footer>
    </div>
  )
}

export default App
