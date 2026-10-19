function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('newtab-gallery', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('settings')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function normalizeGallery(value, resolveKey = (id) => id) {
  const ids = new Set()
  const uploads = (Array.isArray(value?.uploads) ? value.uploads : []).filter((image) => {
    if (typeof image?.id !== 'string' || !image.id.startsWith('upload:') || ids.has(image.id)) return false
    if (typeof image.src !== 'string' || !image.src.startsWith('data:image/')) return false
    ids.add(image.id)
    return true
  })
  const hidden = (Array.isArray(value?.hidden) ? value.hidden : []).filter((id) => typeof id === 'string').map(resolveKey)
  return { uploads, hidden: [...new Set(hidden)] }
}

async function accessGallery(mode, value) {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('settings', mode)
      const store = transaction.objectStore('settings')
      const request = mode === 'readonly' ? store.get('gallery') : store.put(value, 'gallery')
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export const readGallery = () => accessGallery('readonly')
export const writeGallery = (value) => accessGallery('readwrite', value)
