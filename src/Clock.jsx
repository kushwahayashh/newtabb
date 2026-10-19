import { useEffect, useState } from 'react'

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long' })

export default function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <time className="clock" dateTime={now.toISOString()}>
      {timeFormatter.format(now)}
      <span className="clock__day">{dayFormatter.format(now)}</span>
    </time>
  )
}
