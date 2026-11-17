import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'

function canUseParallax() {
  const root = document.documentElement
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    && root.dataset.animations !== 'off'
    && root.dataset.reducedMotion !== 'true'
}

export function useCardParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  const onPointerMove = useCallback((event: ReactPointerEvent<T>) => {
    if (event.pointerType !== 'mouse' || !canUseParallax() || !ref.current) return

    const bounds = ref.current.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    const tiltX = (0.5 - y) * 12
    const tiltY = (x - 0.5) * 12

    ref.current.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`)
    ref.current.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`)
    ref.current.style.setProperty('--light-x', `${(x * 100).toFixed(1)}%`)
    ref.current.style.setProperty('--light-y', `${(y * 100).toFixed(1)}%`)
  }, [])

  const onPointerLeave = useCallback(() => {
    if (!ref.current) return
    ref.current.style.setProperty('--tilt-x', '0deg')
    ref.current.style.setProperty('--tilt-y', '0deg')
    ref.current.style.setProperty('--light-x', '50%')
    ref.current.style.setProperty('--light-y', '50%')
  }, [])

  return { ref, onPointerMove, onPointerLeave }
}
