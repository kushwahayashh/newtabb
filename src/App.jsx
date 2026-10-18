import { useEffect, useState } from 'react'
import PhotoWidget from './PhotoWidget.jsx'
import { galleryStorage } from './galleryStorage.js'

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long' })
const quotes = [
  { text: 'The only true wisdom is in knowing you know nothing.', author: 'Socrates' },
  { text: 'Happiness depends upon ourselves.', author: 'Aristotle' },
  { text: 'He who has a why to live can bear almost any how.', author: 'Friedrich Nietzsche' },
]
const imageFiles = import.meta.glob('../images/*.{png,jpg,jpeg,webp,avif}', {
    eager: true,
    query: '?url',
    import: 'default',
  })
const wallpapers = Object.values(imageFiles)
const storageKey = 'newtab-layout-v1'
const imageKey = (image) => Object.keys(imageFiles).find((key) => imageFiles[key] === image) ?? image

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
      const width = Math.max(128, Math.min(widget.bounds.width, window.innerWidth - 32))
      const height = Math.max(96, Math.min(widget.bounds.height, window.innerHeight - 32))
      return {
        id: widget.id,
        image: widget.image === null ? null : widget.image?.startsWith('upload:') ? widget.image : imageFiles[widget.image] ?? wallpapers[0],
        bounds: {
          width,
          height,
          left: Math.max(16, Math.min(widget.bounds.left, window.innerWidth - width - 16)),
          top: Math.max(16, Math.min(widget.bounds.top, window.innerHeight - height - 16)),
        },
      }
    })
    return { current: Math.max(0, wallpapers.indexOf(imageFiles[saved.wallpaper])), widgets }
  } catch {
    return null
  }
}

function createWidget(index = 0) {
  return {
    id: crypto.randomUUID(),
    image: wallpapers[index % wallpapers.length],
    bounds: {
      width: 240,
      height: 180,
      left: Math.max(16, window.innerWidth - 280 - (index % 5) * 32),
      top: Math.min(48 + (index % 5) * 40, Math.max(16, window.innerHeight - 196)),
    },
  }
}

export default function App() {
  const [initialLayout] = useState(restoreLayout)
  const [current, setCurrent] = useState(() => initialLayout?.current ?? 0)
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

  useEffect(() => {
    let active = true
    galleryStorage().then((saved) => {
      if (active && Array.isArray(saved?.uploads) && Array.isArray(saved?.hidden)) setGallery(saved)
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
    setWidgets((items) => items.map((item) => item.image === id ? { ...item, image: replacement } : item))
  }

  useEffect(() => {
    function save() {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          version: 1,
          wallpaper: imageKey(wallpapers[current]),
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
    setWidgets((items) => [...items, createWidget(items.length)])
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
      if (!wallpapers.length) return
      if (event.key === 'ArrowRight') setCurrent((index) => (index + 1) % wallpapers.length)
      if (event.key === 'ArrowLeft') setCurrent((index) => (index - 1 + wallpapers.length) % wallpapers.length)
    }
    function dismiss() { setMenu(null) }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', dismiss)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', dismiss)
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
          y: Math.max(8, Math.min(event.clientY, window.innerHeight - 60)),
        })
      }}
    >
      {wallpapers.map((image, index) => (
        <div aria-hidden="true" className={`wallpaper__image${current === index ? ' is-active' : ''}`} key={image} style={{ backgroundImage: `url("${image}")` }} />
      ))}
      <time className="clock" dateTime={now.toISOString()}>
        {timeFormatter.format(now)}
        <span className="clock__day">{dayFormatter.format(now)}</span>
      </time>
      {widgets.map((widget, index) => (
        <PhotoWidget
          key={widget.id}
          image={widget.image}
          imageSrc={galleryImages.find((image) => image.id === widget.image)?.src ?? (widget.image?.startsWith('upload:') ? undefined : widget.image)}
          images={galleryImages}
          galleryReady={galleryReady}
          galleryError={galleryError}
          onUpload={uploadImages}
          onDeleteImage={deleteImage}
          bounds={widget.bounds}
          onChange={(changes) => setWidgets((items) => items.map((item) => item.id === widget.id ? { ...item, ...changes } : item))}
          layer={index + 3}
          onAdd={addWidget}
          onRemove={() => setWidgets((items) => items.filter((item) => item.id !== widget.id))}
          onActivate={() => setWidgets((items) => items.at(-1)?.id === widget.id ? items : [...items.filter((item) => item.id !== widget.id), items.find((item) => item.id === widget.id)])}
        />
      ))}
      {menu && (
        <div className="photo-menu" role="menu" style={{ left: menu.x, top: menu.y, zIndex: widgets.length + 10 }} onPointerDown={(event) => event.stopPropagation()}>
          <button role="menuitem" type="button" onClick={addWidget}>Add photo widget</button>
        </div>
      )}
      <figure className="quote" key={current}>
        <blockquote>“{quotes[current % quotes.length].text}”</blockquote>
        <figcaption>— {quotes[current % quotes.length].author}</figcaption>
      </figure>
      {wallpapers.length > 1 && (
        <nav className="wallpaper-indicators" aria-label="Choose wallpaper">
          {wallpapers.map((image, index) => (
            <button aria-label={`Show wallpaper ${index + 1}`} aria-current={current === index ? 'true' : undefined} className={`wallpaper-indicator${current === index ? ' is-active' : ''}`} key={image} onClick={() => setCurrent(index)} type="button" />
          ))}
        </nav>
      )}
    </main>
  )
}
