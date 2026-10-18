import { useEffect, useState } from 'react'
import PhotoWidget from './PhotoWidget.jsx'
import ImagePicker from './ImagePicker.jsx'
import { galleryStorage } from './galleryStorage.js'
import { chooseQuote, rememberQuote } from './quotes.js'
import LoadingImage from './LoadingImage.jsx'
import { fitBounds, getViewport, isViewport, widgetStyle } from './layout.js'

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long' })
const imageFiles = import.meta.glob('../images/*.{png,jpg,jpeg,webp,avif}', {
    eager: true,
    query: '?url',
    import: 'default',
  })
const wallpapers = Object.values(imageFiles)
const storageKey = 'newtab-layout-v1'
const imageKey = (image) => Object.keys(imageFiles).find((key) => imageFiles[key] === image) ?? image
const restoreImage = (image) => image === null ? null : typeof image === 'string' && image.startsWith('upload:') ? image : imageFiles[image] ?? wallpapers[0] ?? null

function restoreLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    if (saved?.version !== 1 || !Array.isArray(saved.widgets)) return null
    const ids = new Set()
    const widgets = saved.widgets.filter((widget) => {
      if (!widget || typeof widget.id !== 'string' || ids.has(widget.id)) return false
      ids.add(widget.id)
      return widget.bounds && ['left', 'top', 'width', 'height'].every((key) => Number.isFinite(widget.bounds[key]))
    }).map((widget) => {
      return {
        id: widget.id,
        image: restoreImage(widget.image),
        bounds: isViewport(widget.viewport) ? widget.bounds : fitBounds(widget.bounds),
        viewport: isViewport(widget.viewport) ? widget.viewport : getViewport(),
      }
    })
    return { current: restoreImage(saved.wallpaper), widgets }
  } catch {
    return null
  }
}

function createWidget(index = 0) {
  return {
    id: crypto.randomUUID(),
    image: wallpapers[index % wallpapers.length] ?? null,
    viewport: getViewport(),
    bounds: fitBounds({
      width: 240,
      height: 180,
      left: Math.max(16, window.innerWidth - 280 - (index % 5) * 32),
      top: Math.min(48 + (index % 5) * 40, Math.max(16, window.innerHeight - 196)),
    }),
  }
}

export default function App() {
  const [quote] = useState(chooseQuote)
  const [initialLayout] = useState(restoreLayout)
  const [current, setCurrent] = useState(() => initialLayout ? initialLayout.current : wallpapers[0] ?? null)
  const [choosingWallpaper, setChoosingWallpaper] = useState(false)
  const [widgets, setWidgets] = useState(() => initialLayout?.widgets ?? [createWidget()])
  const [now, setNow] = useState(() => new Date())
  const [menu, setMenu] = useState(null)
  const [gallery, setGallery] = useState({ uploads: [], hidden: [] })
  const [galleryReady, setGalleryReady] = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const galleryImages = [
    ...wallpapers.map((src) => ({ id: src, src, name: Object.keys(imageFiles).find((key) => imageFiles[key] === src)?.split('/').pop() })),
    ...gallery.uploads,
  ].filter((image) => !gallery.hidden.includes(imageKey(image.id)))
  const wallpaperSrc = galleryImages.find((image) => image.id === current)?.src ?? (current?.startsWith('upload:') ? undefined : current)

  useEffect(() => { rememberQuote(quote) }, [quote])

  useEffect(() => {
    let active = true
    galleryStorage().then((saved) => {
      if (active && Array.isArray(saved?.uploads) && Array.isArray(saved?.hidden)) {
        setGallery({
          uploads: saved.uploads.filter((image) => typeof image?.id === 'string' && image.id.startsWith('upload:') && typeof image.src === 'string' && image.src.startsWith('data:image/')),
          hidden: saved.hidden.filter((id) => typeof id === 'string'),
        })
      }
    }).catch(() => {
      if (active) setGalleryError('Image storage is unavailable in this browser.')
    }).finally(() => { if (active) setGalleryReady(true) })
    return () => { active = false }
  }, [])

  async function updateGallery(next) {
    await galleryStorage(next)
    setGallery(next)
    setGalleryError('')
  }

  async function uploadImages(files) {
    const uploads = await Promise.all(Array.from(files).map((file) => new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error('Please choose image files only.'))
      const reader = new FileReader()
      reader.onload = () => resolve({ id: `upload:${crypto.randomUUID()}`, src: reader.result, name: file.name })
      reader.onerror = () => reject(new Error('Could not read this image.'))
      reader.readAsDataURL(file)
    })))
    await updateGallery({ ...gallery, uploads: [...gallery.uploads, ...uploads] })
  }

  async function deleteImage(id) {
    await updateGallery({
      uploads: gallery.uploads.filter((image) => image.id !== id),
      hidden: id.startsWith('upload:') ? gallery.hidden : [...gallery.hidden, imageKey(id)],
    })
    const replacement = galleryImages.find((image) => image.id !== id)?.id ?? null
    if (current === id) setCurrent(replacement)
    setWidgets((items) => items.map((item) => item.image === id ? { ...item, image: replacement } : item))
  }

  useEffect(() => {
    function save() {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          version: 1,
          wallpaper: imageKey(current),
          widgets: widgets.map((widget) => ({ ...widget, image: imageKey(widget.image) })),
        }))
      } catch {
        // Storage may be disabled or full; keep the page usable without it.
      }
    }
    const timer = window.setTimeout(save, 150)
    window.addEventListener('pagehide', save)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', save)
    }
  }, [current, widgets])

  function addWidget() {
    setWidgets((items) => [...items, {
      ...createWidget(items.length),
      image: galleryImages[items.length % galleryImages.length]?.id ?? null,
    }])
    setMenu(null)
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (document.querySelector('dialog[open]')) return
      if (event.key === 'Escape') setMenu(null)
    }
    function dismiss() { setMenu(null) }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', dismiss)
    window.addEventListener('resize', dismiss)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('resize', dismiss)
    }
  }, [])

  return (
    <main
      className="wallpaper"
      aria-label="Wallpaper"
      onContextMenu={(event) => {
        event.preventDefault()
        setMenu({
          x: Math.max(8, Math.min(event.clientX, window.innerWidth - 200)),
          y: Math.max(8, Math.min(event.clientY, window.innerHeight - 110)),
        })
      }}
    >
      {wallpaperSrc ? (
        <LoadingImage className="wallpaper__image is-active" src={wallpaperSrc} key={current} />
      ) : !galleryReady && current?.startsWith('upload:') ? (
        <div className="wallpaper__image is-active skeleton" aria-label="Loading wallpaper" />
      ) : null}
      <time className="clock" dateTime={now.toISOString()}>
        {timeFormatter.format(now)}
        <span className="clock__day">{dayFormatter.format(now)}</span>
      </time>
      {/* Stable DOM order preserves pointer capture when a widget is brought forward. */}
      {[...widgets].sort((a, b) => a.id.localeCompare(b.id)).map((widget) => (
        <PhotoWidget
          key={widget.id}
          image={widget.image}
          imageSrc={galleryImages.find((image) => image.id === widget.image)?.src ?? (widget.image?.startsWith('upload:') ? undefined : widget.image)}
          images={galleryImages}
          galleryReady={galleryReady}
          galleryError={galleryError}
          onUpload={uploadImages}
          onDeleteImage={deleteImage}
          placement={widgetStyle(widget.bounds, widget.viewport)}
          onChange={(changes) => {
            const viewport = getViewport()
            setWidgets((items) => items.map((item) => item.id === widget.id ? {
              ...item,
              ...changes,
              ...(changes.bounds ? { bounds: fitBounds(changes.bounds, viewport.width, viewport.height), viewport } : {}),
            } : item))
          }}
          layer={widgets.findIndex((item) => item.id === widget.id) + 3}
          onAdd={addWidget}
          onRemove={() => setWidgets((items) => items.filter((item) => item.id !== widget.id))}
          onActivate={() => setWidgets((items) => items.at(-1)?.id === widget.id ? items : [...items.filter((item) => item.id !== widget.id), items.find((item) => item.id === widget.id)])}
        />
      ))}
      {menu && (
        <div className="photo-menu" role="menu" style={{ left: menu.x, top: menu.y, zIndex: widgets.length + 10 }} onPointerDown={(event) => event.stopPropagation()}>
          <button role="menuitem" type="button" onClick={() => { setMenu(null); setChoosingWallpaper(true) }}>Choose wallpaper…</button>
          <button role="menuitem" type="button" onClick={addWidget}>Add photo widget</button>
        </div>
      )}
      <figure className="quote">
        <blockquote>“{quote.text}”</blockquote>
        <figcaption>— {quote.author}</figcaption>
      </figure>
      {choosingWallpaper && (
        <ImagePicker
          images={galleryImages}
          selected={current}
          ready={galleryReady}
          storageError={galleryError}
          onUpload={uploadImages}
          onDelete={deleteImage}
          onSelect={(image) => { setCurrent(image); setChoosingWallpaper(false) }}
          onClose={() => setChoosingWallpaper(false)}
        />
      )}
    </main>
  )
}
