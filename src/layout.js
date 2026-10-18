export function getViewport() {
  return { width: window.innerWidth, height: window.innerHeight }
}

export function isViewport(value) {
  return Number.isFinite(value?.width) && value.width > 0 && Number.isFinite(value?.height) && value.height > 0
}

export function fitBounds(bounds, viewportWidth = window.innerWidth, viewportHeight = window.innerHeight) {
  const availableWidth = Math.max(1, viewportWidth - 32)
  const availableHeight = Math.max(1, viewportHeight - 32)
  const width = Math.min(availableWidth, Math.max(128, bounds.width))
  const height = Math.min(availableHeight, Math.max(96, bounds.height))
  return {
    width,
    height,
    left: Math.max(16, Math.min(bounds.left, viewportWidth - width - 16)),
    top: Math.max(16, Math.min(bounds.top, viewportHeight - height - 16)),
  }
}

export function widgetStyle(bounds, source) {
  const width = Math.max(128, bounds.width)
  const height = Math.max(96, bounds.height)
  const horizontalSpace = source.width - bounds.width - 32
  const verticalSpace = source.height - bounds.height - 32
  const x = horizontalSpace > 0 ? Math.max(0, Math.min(1, (bounds.left - 16) / horizontalSpace)) : 0.5
  const y = verticalSpace > 0 ? Math.max(0, Math.min(1, (bounds.top - 16) / verticalSpace)) : 0.5
  // Let CSS resolve the viewport on the same frame as browser zoom, rather
  // than correcting pixel coordinates in a subsequent React render.
  return {
    width: `min(${width}px, max(1px, calc(100vw - 32px)))`,
    height: `min(${height}px, max(1px, calc(100dvh - 32px)))`,
    left: `max(16px, calc(${x * 100}vw + ${16 - x * (width + 32)}px))`,
    top: `max(16px, calc(${y * 100}dvh + ${16 - y * (height + 32)}px))`,
  }
}
