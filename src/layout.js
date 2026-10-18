export function getViewport() {
  return { width: window.innerWidth, height: window.innerHeight }
}

export function isViewport(value) {
  return Number.isFinite(value?.width) && value.width > 0 && Number.isFinite(value?.height) && value.height > 0
}

export function fitBounds(bounds, viewportWidth = window.innerWidth, viewportHeight = window.innerHeight) {
  const availableWidth = Math.max(1, viewportWidth - 32)
  const availableHeight = Math.max(1, viewportHeight - 32)
  const width = Math.min(availableWidth, Math.max(1, bounds.width))
  const height = Math.min(availableHeight, Math.max(1, bounds.height))
  return {
    width,
    height,
    left: Math.max(16, Math.min(bounds.left, viewportWidth - width - 16)),
    top: Math.max(16, Math.min(bounds.top, viewportHeight - height - 16)),
  }
}

export function widgetStyle(bounds, source) {
  // Scale both dimensions uniformly, while keeping positions proportional.
  // A smaller viewport must shrink photos as well as the space between them.
  // CSS handles this synchronously, without resize-driven React updates.
  const width = `min(${bounds.width / source.width * 100}vw, ${bounds.width / source.height * 100}dvh)`
  const height = `min(${bounds.height / source.width * 100}vw, ${bounds.height / source.height * 100}dvh)`
  return {
    width,
    height,
    left: `clamp(0px, ${bounds.left / source.width * 100}vw, calc(100vw - ${width}))`,
    top: `clamp(0px, ${bounds.top / source.height * 100}dvh, calc(100dvh - ${height}))`,
  }
}
