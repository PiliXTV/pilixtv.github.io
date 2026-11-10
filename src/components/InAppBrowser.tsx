import { useEffect, useId, useRef, useState } from 'react'

type Props = {
  title: string
  initialUrl: string
  accent?: string
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function InAppBrowser({ title, initialUrl }: Props) {
  const inputId = useId()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [address, setAddress] = useState(initialUrl)
  const [frameUrl, setFrameUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(true)
  const [frameKey, setFrameKey] = useState(0)

  useEffect(() => {
    setAddress(initialUrl)
    setFrameUrl(initialUrl)
    setLoading(true)
    setFrameKey((value) => value + 1)
  }, [initialUrl])

  const navigateTo = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    if (!isSafeHttpUrl(withProtocol)) return

    setAddress(withProtocol)
    setFrameUrl(withProtocol)
    setLoading(true)
    setFrameKey((value) => value + 1)
  }

  const refresh = () => {
    setLoading(true)
    setFrameKey((value) => value + 1)
  }

  return (
    <div className="browser">
      <div className="browser__chrome">
        <form
          className="browser__address"
          onSubmit={(event) => {
            event.preventDefault()
            navigateTo(address)
          }}
        >
          <label className="browser__label" htmlFor={inputId}>
            PiliX Browser
          </label>
          <div className="browser__row">
            <button type="button" className="browser__icon-btn" onClick={refresh} aria-label="Refresh">
              ↻
            </button>
            <input
              id={inputId}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              inputMode="url"
            />
            <button type="submit" className="btn btn--primary browser__go">
              Go
            </button>
          </div>
        </form>
        <p className="browser__status">
          {loading ? `Loading ${title}…` : `Viewing ${title} inside PiliX TV`}
        </p>
      </div>

      <div className="browser__viewport">
        {loading && <div className="browser__spinner" aria-hidden="true" />}
        <iframe
          key={frameKey}
          ref={frameRef}
          className="browser__frame"
          title={`${title} — PiliX TV Browser`}
          src={frameUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; payment"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  )
}
