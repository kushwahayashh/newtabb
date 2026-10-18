import { useEffect, useRef, useState } from 'react'

export default function LoadingImage({ src, alt = '', className = '', loading = 'eager' }) {
  const image = useRef(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const element = image.current
    setStatus(element?.complete ? (element.naturalWidth ? 'loaded' : 'error') : 'loading')
  }, [src])

  return (
    <span className={`loading-image ${className} is-${status}`} aria-busy={status === 'loading'}>
      {status === 'loading' && <span className="skeleton loading-image__skeleton" aria-hidden="true" />}
      <img
        ref={image}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        draggable="false"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      {status === 'error' && <span className="loading-image__error">Image unavailable</span>}
    </span>
  )
}
