import { useEffect, useRef, useState } from 'react'
import ImagePicker from './ImagePicker.jsx'

export default function PhotoWidget({ image, imageSrc, images, galleryReady, galleryError, onUpload, onDeleteImage, bounds, onChange, onAdd, onRemove, onActivate, layer }) {
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState(null)
  const gesture = useRef(null)
  const [choosingImage, setChoosingImage] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    if (!removing) return
    const timer = window.setTimeout(onRemove, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180)
    return () => window.clearTimeout(timer)
  }, [removing, onRemove])

  useEffect(() => {
    function dismiss(event) {
      if (event.type === 'pointerdown' || event.key === 'Escape') setMenu(null)
      if (event.key === 'Escape') setEditing(false)
    }
    window.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', dismiss)
    return () => {
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', dismiss)
    }
  }, [])

  function start(event, direction = 'move') {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    onActivate()
    setInteracting(true)
    gesture.current = { direction, bounds, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event) {
    if (!gesture.current) return
    const { direction, bounds: initial, x, y } = gesture.current
    const dx = event.clientX - x
    const dy = event.clientY - y
    if (direction === 'move') {
      onChange({ bounds: {
        ...initial,
        left: Math.max(16, Math.min(window.innerWidth - initial.width - 16, initial.left + dx)),
        top: Math.max(16, Math.min(window.innerHeight - initial.height - 16, initial.top + dy)),
      } })
      return
    }
    let { left, top } = initial
    let right = left + initial.width
    let bottom = top + initial.height
    if (direction.includes('w')) left = Math.max(16, Math.min(right - 128, left + dx))
    if (direction.includes('e')) right = Math.min(window.innerWidth - 16, Math.max(left + 128, right + dx))
    if (direction.includes('n')) top = Math.max(16, Math.min(bottom - 96, top + dy))
    if (direction.includes('s')) bottom = Math.min(window.innerHeight - 16, Math.max(top + 96, bottom + dy))
    onChange({ bounds: { left, top, width: right - left, height: bottom - top } })
  }

  return (
    <aside
      className={`photo-widget${editing ? ' is-resizable' : ''}${interacting ? ' is-interacting' : ''}${removing ? ' is-removing' : ''}`}
      aria-label="Photo widget"
      style={{ ...bounds, right: 'auto', zIndex: layer }}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={() => { gesture.current = null; setInteracting(false) }}
      onPointerCancel={() => { gesture.current = null; setInteracting(false) }}
      onLostPointerCapture={() => { gesture.current = null; setInteracting(false) }}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onActivate()
        setMenu({
          x: Math.max(8, Math.min(event.clientX, window.innerWidth - 200)),
          y: Math.max(8, Math.min(event.clientY, window.innerHeight - 190)),
        })
      }}
    >
      {imageSrc ? <img key={imageSrc} alt="Selected widget photo" className="photo-widget__photo" src={imageSrc} draggable="false" /> : <span className="photo-widget__empty">Choose a photo</span>}
      {editing && (
        <>
          {['n', 'e', 's', 'w', 'nw', 'ne', 'se', 'sw'].map((direction) => (
            <span
              aria-hidden="true"
              className={`photo-widget__grip photo-widget__grip--${direction}`}
              key={direction}
              onPointerDown={(event) => start(event, direction)}
            />
          ))}
          <button
            className="photo-widget__done"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setEditing(false)}
            type="button"
          >Done</button>
        </>
      )}
      {menu && (
        <div
          className="photo-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => { event.preventDefault(); event.stopPropagation() }}
        >
          <button role="menuitem" type="button" onClick={() => { setEditing(!editing); setMenu(null) }}>
            {editing ? 'Finish resizing' : 'Resize widget'}
          </button>
          <button role="menuitem" type="button" onClick={() => { setMenu(null); setChoosingImage(true) }}>Choose image…</button>
          <div className="photo-menu__divider" />
          <button role="menuitem" type="button" onClick={() => { setMenu(null); onAdd() }}>Add photo widget</button>
          <button className="photo-menu__remove" role="menuitem" type="button" onClick={() => { setMenu(null); setRemoving(true) }}>Remove widget</button>
        </div>
      )}
      {choosingImage && (
        <ImagePicker
          images={images}
          ready={galleryReady}
          storageError={galleryError}
          onUpload={onUpload}
          onDelete={onDeleteImage}
          selected={image}
          onSelect={(photo) => { onChange({ image: photo }); setChoosingImage(false) }}
          onClose={() => setChoosingImage(false)}
        />
      )}
    </aside>
  )
}
