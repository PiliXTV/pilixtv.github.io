import { useEffect, useId, useState } from 'react'
import { isMobileUserAgent } from '../lib/device'

type Props = {
  title: string
  initialUrl: string
  accent?: string
  /** top-level = same-tab navigation (needed when a site blocks iframes / mobile web) */
  openMode?: 'embed' | 'top-level'
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function openInThisTab(url: string) {
  // Same tab — keeps the “PiliX browser” flow without spawning a new tab.
  window.location.assign(url)
}

export function InAppBrowser({ title, initialUrl, openMode = 'embed' }: Props) {
  const inputId = useId()
  const [address, setAddress] = useState(initialUrl)
  const [frameUrl, setFrameUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(true)
  const [frameKey, setFrameKey] = useState(0)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMobile(isMobileUserAgent())
  }, [])

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

    if (openMode === 'top-level') {
      openInThisTab(withProtocol)
      return
    }

    setFrameUrl(withProtocol)
    setLoading(true)
    setFrameKey((value) => value + 1)
  }

  const refresh = () => {
    if (openMode === 'top-level') {
      openInThisTab(address)
      return
    }
    setLoading(true)
    setFrameKey((value) => value + 1)
  }

  if (openMode === 'top-level') {
    return (
      <div className="browser browser--launch">
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
        </div>

        <section className="browser__launch">
          <div className="browser__launch-card">
            <h1>Open {title} in this tab</h1>
            <p>
              {title} blocks being framed inside other apps and sends phones to an “unsupported /
              download the app” screen. PiliX opens it in <strong>this same tab</strong> as desktop
              web — use your browser Back button to return here.
            </p>

            {mobile && (
              <div className="browser__tip">
                <strong>On your phone first:</strong>
                <ol>
                  <li>Turn on <em>Request Desktop Website</em> (Safari: Aa menu · Chrome: ⋮ menu).</li>
                  <li>Come back to PiliX and tap Open below.</li>
                </ol>
                Without desktop mode, iWant will keep showing Get App.
              </div>
            )}

            <div className="browser__fallback-actions">
              <button type="button" className="btn btn--primary" onClick={() => openInThisTab(address)}>
                Open {title} now
              </button>
              <button type="button" className="btn btn--ghost" onClick={refresh}>
                Retry
              </button>
            </div>
          </div>
        </section>
      </div>
    )
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
