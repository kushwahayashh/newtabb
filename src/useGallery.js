import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizeGallery, readGallery, writeGallery } from './galleryStorage.js'
import { defaultImages, imageKey } from './wallpapers.js'

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose image files only.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve({ id: `upload:${crypto.randomUUID()}`, src: reader.result, name: file.name })
    reader.onerror = () => reject(new Error('Could not read this image.'))
    reader.onabort = () => reject(new Error('Reading the image was interrupted.'))
    reader.readAsDataURL(file)
  })
}

function visibleImages(gallery) {
  const hidden = new Set(gallery.hidden)
  return [...defaultImages, ...gallery.uploads].filter((image) => !hidden.has(imageKey(image.id)))
}

export default function useGallery() {
  const [gallery, setGallery] = useState(() => normalizeGallery())
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const latest = useRef(gallery)
  const pending = useRef(Promise.resolve())

  useEffect(() => {
    let active = true
    readGallery().then((saved) => {
      if (!active) return
      const restored = normalizeGallery(saved, imageKey)
      latest.current = restored
      setGallery(restored)
    }).catch(() => {
      if (active) setError('Image storage is unavailable in this browser.')
    }).finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])

  const updateGallery = useCallback((update) => {
    // Use the last committed collection, including when another picker starts
    // an upload while an earlier operation is still finishing.
    const operation = pending.current.then(async () => {
      const next = update(latest.current)
      await writeGallery(next)
      latest.current = next
      setGallery(next)
      setError('')
      return next
    })
    pending.current = operation.catch(() => {})
    return operation
  }, [])

  const uploadImages = useCallback(async (files) => {
    const uploads = await Promise.all(Array.from(files).map(readImage))
    await updateGallery((current) => ({ ...current, uploads: [...current.uploads, ...uploads] }))
  }, [updateGallery])

  const deleteImage = useCallback(async (id) => {
    const next = await updateGallery((current) => ({
      uploads: current.uploads.filter((image) => image.id !== id),
      hidden: id.startsWith('upload:') ? current.hidden : [...new Set([...current.hidden, imageKey(id)])],
    }))
    return visibleImages(next)[0]?.id ?? null
  }, [updateGallery])

  const images = useMemo(() => visibleImages(gallery), [gallery])
  const sources = useMemo(() => new Map([...defaultImages, ...gallery.uploads].map((image) => [image.id, image.src])), [gallery.uploads])
  const imageSource = useCallback((id) => sources.get(id), [sources])

  return { images, ready, error, imageSource, uploadImages, deleteImage }
}
