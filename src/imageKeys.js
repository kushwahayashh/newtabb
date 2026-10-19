// Persist source paths instead of Vite's content-hashed asset URLs. Match by
// filename stem so existing selections survive image format optimizations.
export function resolveImageKey(image, files) {
  const paths = Object.keys(files)
  const key = paths.find((path) => files[path] === image) ?? image
  if (typeof key !== 'string' || files[key] || !key.startsWith('../images/')) return key
  const stem = key.replace(/\.[^/.]+$/, '')
  return paths.find((path) => path.replace(/\.[^/.]+$/, '') === stem) ?? key
}
