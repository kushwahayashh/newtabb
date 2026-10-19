import { resolveImageKey } from './imageKeys.js'

const files = import.meta.glob('../images/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const defaultImages = Object.entries(files).map(([path, src]) => ({
  id: src,
  src,
  name: path.split('/').pop(),
}))

export const defaultWallpaper = defaultImages[0]?.id ?? null
export const imageKey = (image) => resolveImageKey(image, files)

export function restoreImage(image) {
  if (image === null || (typeof image === 'string' && image.startsWith('upload:'))) return image
  return files[imageKey(image)] ?? defaultWallpaper
}
