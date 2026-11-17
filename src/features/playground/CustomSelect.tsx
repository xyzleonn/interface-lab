import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export type CustomSelectOption<T extends string = string> = {
  value: T
  label: string
}

type CustomSelectProps<T extends string> = {
  label: string
  options: CustomSelectOption<T>[]
  value: T
  onChange: (value: T) => void
  placeholder?: string
  disabled?: boolean
  compact?: boolean
  previewState?: 'default' | 'hover' | 'focus' | 'open'
}

export function CustomSelect<T extends string>({ label, options, value, onChange, placeholder = 'Choose an option', disabled = false, compact = false, previewState = 'default' }: CustomSelectProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])
  const id = useId()
  const [isOpen, setIsOpen] = useState(previewState === 'open')
  const [activeIndex, setActiveIndex] = useState(-1)
  const availableOptions = [...new Map(options.map((option) => [option.value, option])).values()]
  const selectedIndex = availableOptions.findIndex((option) => option.value === value)
  const activeOptionIndex = availableOptions.length === 0
    ? -1
    : Math.max(0, Math.min(activeIndex, availableOptions.length - 1))
  const activeOptionId = activeOptionIndex >= 0 ? `${id}-option-${activeOptionIndex}` : undefined
  const menuOpen = isOpen && !disabled

  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [menuOpen])

  useEffect(() => {
    if (menuOpen && activeOptionIndex >= 0) optionRefs.current[activeOptionIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeOptionIndex, menuOpen])

  function openMenu(index = selectedIndex >= 0 ? selectedIndex : 0) {
    if (disabled) return
    setActiveIndex(availableOptions.length > 0 ? index : -1)
    setIsOpen(true)
  }

  function chooseOption(option: CustomSelectOption<T>) {
    onChange(option.value)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return

    if (event.key === 'Escape') {
      if (menuOpen) {
        event.preventDefault()
        setIsOpen(false)
      }
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!menuOpen) {
        const currentIndex = selectedIndex >= 0 ? selectedIndex : (event.key === 'ArrowDown' ? -1 : 0)
        const direction = event.key === 'ArrowDown' ? 1 : -1
        openMenu(availableOptions.length > 0 ? (currentIndex + direction + availableOptions.length) % availableOptions.length : -1)
      } else if (availableOptions.length > 0) {
        const direction = event.key === 'ArrowDown' ? 1 : -1
        setActiveIndex((current) => {
          const normalized = Math.max(0, Math.min(current, availableOptions.length - 1))
          return (normalized + direction + availableOptions.length) % availableOptions.length
        })
      }
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      if (!menuOpen || availableOptions.length === 0) return
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : availableOptions.length - 1)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!menuOpen) openMenu()
      else if (activeOptionIndex >= 0) chooseOption(availableOptions[activeOptionIndex])
    }
  }

  return (
    <div className={`editor-custom-select${compact ? ' is-compact' : ''} state-${previewState}`} ref={rootRef} data-preview-state={previewState} onBlur={(event) => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
    }}>
      <span className="editor-custom-select-label" id={`${id}-label`}>{label}</span>
      <button
        className="editor-custom-select-trigger"
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={menuOpen ? activeOptionId : undefined}
        disabled={disabled}
        onClick={() => menuOpen ? setIsOpen(false) : openMenu()}
        onKeyDown={handleKeyDown}
      >
        <span className={`editor-custom-select-value${selectedIndex < 0 ? ' is-placeholder' : ''}`} id={`${id}-value`}>
          {selectedIndex >= 0 ? availableOptions[selectedIndex].label : placeholder}
        </span>
        <span className={`editor-custom-select-chevron${menuOpen ? ' is-open' : ''}`} aria-hidden="true">⌄</span>
      </button>
      <div className="editor-custom-select-menu" data-open={menuOpen} aria-hidden={!menuOpen}>
        <div className="editor-custom-select-menu-inner">
          <ul className="editor-custom-select-options" id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`}>
            {availableOptions.length > 0 ? availableOptions.map((option, index) => (
              <li
                className={`editor-custom-select-option${index === activeOptionIndex && menuOpen ? ' is-active' : ''}${option.value === value ? ' is-selected' : ''}`}
                ref={(element) => { optionRefs.current[index] = element }}
                id={`${id}-option-${index}`}
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onPointerDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseOption(option)}
              >
                <span>{option.label}</span>
                {option.value === value && <span className="editor-custom-select-check" aria-hidden="true">✓</span>}
              </li>
            )) : (
              <li className="editor-custom-select-empty" role="presentation">No options available</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
