function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('newtab-gallery', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('settings')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function galleryStorage(value) {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('settings', value === undefined ? 'readonly' : 'readwrite')
      const store = transaction.objectStore('settings')
      const request = value === undefined ? store.get('gallery') : store.put(value, 'gallery')
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}
