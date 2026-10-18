import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import LoadingImage from './LoadingImage.jsx'

export default function ImagePicker({ images, selected, onSelect, onClose, onUpload, onDelete, ready, storageError }) {
  const dialog = useRef(null)
  const picker = useRef(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [closing, setClosing] = useState(false)
  const operation = useRef(false)

  useEffect(() => { dialog.current.showModal() }, [])
  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180)
    return () => window.clearTimeout(timer)
  }, [closing, onClose])

  function close() { setClosing(true) }

  async function upload(files) {
    if (!files.length || operation.current || !ready) return
    operation.current = true
    setBusy(true)
    setError('')
    try { await onUpload(files) } catch (error) { setError(error.message || 'Upload failed. Your browser storage may be full.') }
    finally { operation.current = false; setBusy(false) }
  }

  async function remove() {
    if (operation.current || !deleting) return
    operation.current = true
    setError('')
    setBusy(true)
    try { await onDelete(deleting.id); setDeleting(null) }
    catch { setError('Could not delete the image. Please try again.') }
    finally { operation.current = false; setBusy(false) }
  }

  return createPortal(
    <dialog
      ref={dialog}
      className={`image-picker${dragging ? ' is-dragging' : ''}${closing ? ' is-closing' : ''}`}
      aria-labelledby="image-picker-title"
      onCancel={(event) => { event.preventDefault(); if (deleting) setDeleting(null); else close() }}
      onPointerDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) close() }}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation() }}
      onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); upload(event.dataTransfer.files) }}
    >
      <div className="image-picker__content">
        <header className="image-picker__header">
          <h2 id="image-picker-title">Photos</h2>
          <button className="image-picker__close" aria-label="Close gallery" onClick={close} type="button">×</button>
        </header>
        <button className="image-picker__upload" disabled={busy || !ready} onClick={() => picker.current.click()} type="button">
          <span className="image-picker__upload-icon" aria-hidden="true">＋</span>
          <strong>{busy ? 'Saving…' : 'Upload images'}</strong>
        </button>
        <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(event) => { upload(event.target.files); event.target.value = '' }} />
        {(error || storageError) && <p className="image-picker__error" role="alert">{error || storageError}</p>}
        <div className="image-picker__grid" aria-label="Photo collection" aria-busy={busy || !ready}>
          {!ready ? Array.from({ length: 8 }, (_, index) => (
            <div className="image-picker__placeholder skeleton" key={index} aria-hidden="true" />
          )) : images.map((image, index) => (
            <div className="image-picker__item" key={image.id} style={{ '--item-delay': `${Math.min(index, 8) * 30}ms` }}>
              <button className="image-picker__photo" disabled={busy || !!deleting} aria-label={`Choose ${image.name || 'photo'}`} aria-pressed={selected === image.id} onClick={() => onSelect(image.id)} type="button">
                <LoadingImage src={image.src} loading="lazy" />
                {selected === image.id && <span className="image-picker__check" aria-hidden="true">✓</span>}
              </button>
              <button className="image-picker__delete" aria-label={`Delete ${image.name || 'photo'}`} disabled={busy || !ready} onClick={() => setDeleting(image)} type="button">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg>
              </button>
            </div>
          ))}
        </div>
        {ready && images.length === 0 && <p>No photos yet.</p>}
        {deleting && (
          <div className="image-picker__confirmation" role="region" aria-label="Confirm image deletion" aria-live="polite">
            <p>Delete this photo?</p>
            <div><button type="button" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button type="button" disabled={busy} onClick={remove}>Delete photo</button></div>
          </div>
        )}
      </div>
    </dialog>, document.body,
  )
}
