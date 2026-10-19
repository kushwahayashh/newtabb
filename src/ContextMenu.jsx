import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function ContextMenu({ position, onClose, children }) {
  const menu = useRef(null)

  useLayoutEffect(() => {
    const element = menu.current
    const { offsetWidth: width, offsetHeight: height } = element
    element.style.left = `${Math.max(8, Math.min(position.x, window.innerWidth - width - 8))}px`
    element.style.top = `${Math.max(8, Math.min(position.y, window.innerHeight - height - 8))}px`
    element.querySelector('button')?.focus({ preventScroll: true })
  }, [position])

  useEffect(() => {
    function dismiss(event) {
      if (!menu.current?.contains(event.target)) onClose()
    }
    window.addEventListener('pointerdown', dismiss)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  function handleKeyDown(event) {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const buttons = [...menu.current.querySelectorAll('button:not(:disabled)')]
    const current = buttons.indexOf(document.activeElement)
    let index = (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
    if (event.key === 'Home') index = 0
    if (event.key === 'End') index = buttons.length - 1
    buttons[index]?.focus()
  }

  return createPortal(
    <div
      ref={menu}
      className="photo-menu"
      role="menu"
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation() }}
    >
      {children}
    </div>, document.body,
  )
}
