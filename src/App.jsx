import { useEffect, useState } from 'react'
import PhotoWidget from './PhotoWidget.jsx'
import ImagePicker from './ImagePicker.jsx'
import Clock from './Clock.jsx'
import ContextMenu from './ContextMenu.jsx'
import useGallery from './useGallery.js'
import { chooseQuote, rememberQuote } from './quotes.js'
import LoadingImage from './LoadingImage.jsx'
import { fitBounds, getViewport, isViewport, widgetStyle } from './layout.js'
import { defaultWallpaper, defaultWidgetImage, imageKey, restoreImage } from './wallpapers.js'

const storageKey = 'newtab-layout-v1'

function restoreLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    if (saved?.version !== 1 || !Array.isArray(saved.widgets)) return null
    const ids = new Set()
    const widgets = saved.widgets.filter((widget) => {
      if (!widget || typeof widget.id !== 'string' || ids.has(widget.id)) return false
      ids.add(widget.id)
      return widget.bounds
        && ['left', 'top', 'width', 'height'].every((key) => Number.isFinite(widget.bounds[key]))
        && widget.bounds.width > 0 && widget.bounds.height > 0
    }).map((widget) => ({
      id: widget.id,
      image: restoreImage(widget.image),
      bounds: isViewport(widget.viewport) ? widget.bounds : fitBounds(widget.bounds),
      viewport: isViewport(widget.viewport) ? widget.viewport : getViewport(),
    }))
    return { current: restoreImage(saved.wallpaper), widgets }
  } catch {
    return null
  }
}

function createWidget(index = 0, image = defaultWidgetImage) {
  return {
    id: crypto.randomUUID(),
    image,
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
  const [current, setCurrent] = useState(() => initialLayout ? initialLayout.current : defaultWallpaper)
  const [choosingWallpaper, setChoosingWallpaper] = useState(false)
  const [widgets, setWidgets] = useState(() => initialLayout?.widgets ?? [createWidget()])
  const [menu, setMenu] = useState(null)
  const { images, ready, error, imageSource, uploadImages, deleteImage: removeImage } = useGallery()
  const wallpaperSrc = imageSource(current)
  const orderedWidgets = widgets
    .map((widget, index) => ({ widget, layer: index + 3 }))
    .sort((a, b) => a.widget.id.localeCompare(b.widget.id))

  useEffect(() => { rememberQuote(quote) }, [quote])

  async function deleteImage(id) {
    const replacement = await removeImage(id)
    setCurrent((selected) => selected === id ? replacement : selected)
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
    const photo = images.find((image) => image.id === defaultWidgetImage)
      ?? images.find((image) => image.id !== current)
      ?? images[0]
    setWidgets((items) => [...items, createWidget(items.length, photo?.id ?? null)])
    setMenu(null)
  }

  function activateWidget(id) {
    setWidgets((items) => {
      if (items.at(-1)?.id === id) return items
      const widget = items.find((item) => item.id === id)
      return widget ? [...items.filter((item) => item.id !== id), widget] : items
    })
  }

  function updateWidget(id, changes) {
    const viewport = getViewport()
    setWidgets((items) => items.map((item) => item.id === id ? {
      ...item,
      ...changes,
      ...(changes.bounds ? { bounds: fitBounds(changes.bounds, viewport.width, viewport.height), viewport } : {}),
    } : item))
  }

  return (
    <main
      className="wallpaper"
      aria-label="Wallpaper"
      onContextMenu={(event) => {
        event.preventDefault()
        setMenu({ x: event.clientX, y: event.clientY })
      }}
    >
      {wallpaperSrc ? (
        <LoadingImage className="wallpaper__image" src={wallpaperSrc} key={current} />
      ) : !ready && current?.startsWith('upload:') ? (
        <div className="wallpaper__image skeleton" aria-label="Loading wallpaper" />
      ) : null}
      <Clock />
      {/* Stable DOM order preserves pointer capture when a widget is brought forward. */}
      {orderedWidgets.map(({ widget, layer }) => (
        <PhotoWidget
          key={widget.id}
          image={widget.image}
          imageSrc={imageSource(widget.image)}
          images={images}
          galleryReady={ready}
          galleryError={error}
          onUpload={uploadImages}
          onDeleteImage={deleteImage}
          placement={widgetStyle(widget.bounds, widget.viewport)}
          onChange={(changes) => updateWidget(widget.id, changes)}
          layer={layer}
          onAdd={addWidget}
          onRemove={() => setWidgets((items) => items.filter((item) => item.id !== widget.id))}
          onActivate={() => activateWidget(widget.id)}
        />
      ))}
      {menu && (
        <ContextMenu position={menu} onClose={() => setMenu(null)}>
          <button role="menuitem" type="button" onClick={() => { setMenu(null); setChoosingWallpaper(true) }}>Choose wallpaper…</button>
          <button role="menuitem" type="button" onClick={addWidget}>Add photo widget</button>
        </ContextMenu>
      )}
      <figure className="quote">
        <blockquote>“{quote.text}”</blockquote>
        <figcaption>— {quote.author}</figcaption>
      </figure>
      {choosingWallpaper && (
        <ImagePicker
          images={images}
          selected={current}
          ready={ready}
          storageError={error}
          onUpload={uploadImages}
          onDelete={deleteImage}
          onSelect={(image) => { setCurrent(image); setChoosingWallpaper(false) }}
          onClose={() => setChoosingWallpaper(false)}
        />
      )}
    </main>
  )
}
