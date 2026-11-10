import { useEffect, useId, useState } from 'react'
import { isInAppBrowser, isMobileUserAgent } from '../lib/device'

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
  window.location.assign(url)
}

export function InAppBrowser({ title, initialUrl, openMode = 'embed' }: Props) {
  const inputId = useId()
  const [address, setAddress] = useState(initialUrl)
  const [frameUrl, setFrameUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(true)
  const [frameKey, setFrameKey] = useState(0)
  const [mobile, setMobile] = useState(false)
  const [inApp, setInApp] = useState(false)

  useEffect(() => {
    setMobile(isMobileUserAgent())
    setInApp(isInAppBrowser())
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
            <h1>{title} needs desktop web on its own site</h1>
            <p>
              Desktop mode on <strong>PiliX TV</strong> does not carry over. iWant checks the device
              when <strong>iwanttfc.com</strong> loads — if it still looks like a phone, it forces
              Get App. Open it in this same tab, then enable desktop mode on that page and reload.
            </p>

            <div className="browser__tip">
              <strong>If you still see Get App:</strong>
              <ol>
                <li>
                  On the iWant page (not PiliX), turn on <em>Request Desktop Website</em>, then
                  reload.
                </li>
                <li>
                  Safari: <em>Settings → Safari → Request Desktop Website → All Websites</em> (on).
                </li>
                <li>
                  Chrome: open iWant → ⋮ → <em>Desktop site</em>, then reload.
                </li>
                {inApp && (
                  <li>
                    You are in an in-app browser. Tap <em>Open in Safari/Chrome</em> first — those
                    keep pushing the app.
                  </li>
                )}
                {!mobile && !inApp && (
                  <li>
                    On a computer and still stuck? Clear iWant site data for iwanttfc.com, then open
                    again from PiliX.
                  </li>
                )}
              </ol>
            </div>

            <div className="browser__fallback-actions">
              <button type="button" className="btn btn--primary" onClick={() => openInThisTab(address)}>
                Open {title} in this tab
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => openInThisTab('https://www.iwanttfc.com/login/auth')}
              >
                Open sign-in page
              </button>
            </div>

            <p className="browser__note">
              After iWant loads as desktop web, use Back to return to PiliX TV.
            </p>
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
