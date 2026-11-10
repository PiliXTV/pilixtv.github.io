import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ServiceIcon } from '../components/ServiceIcon'
import { YouTubeTheater } from '../components/YouTubeTheater'
import { getService } from '../services'

type Mode = 'watch' | 'login'

const CONNECTED_KEY = 'pilix-connected-services'

function readConnected(): string[] {
  try {
    const raw = localStorage.getItem(CONNECTED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

function writeConnected(ids: string[]) {
  localStorage.setItem(CONNECTED_KEY, JSON.stringify(ids))
}

export function TheaterPage() {
  const { serviceId } = useParams()
  const service = getService(serviceId)
  const [mode, setMode] = useState<Mode>('login')
  const [connected, setConnected] = useState(() => readConnected())

  const frameSrc = useMemo(() => {
    if (!service) return ''
    return mode === 'login' ? service.loginUrl : service.watchUrl
  }, [mode, service])

  if (!service) {
    return <Navigate to="/" replace />
  }

  const isConnected = connected.includes(service.id)

  const markConnected = () => {
    const next = Array.from(new Set([...connected, service.id]))
    setConnected(next)
    writeConnected(next)
  }

  const openOfficial = (url: string) => {
    markConnected()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="theater" style={{ ['--service-accent' as string]: service.accent }}>
      <header className="theater__bar">
        <Link to="/" className="theater__back" aria-label="Back to PiliX TV">
          <span aria-hidden="true">←</span>
          <img src="/pilix-logo.jpg" alt="" width={28} height={28} />
          <span>PiliX TV</span>
        </Link>

        <div className="theater__title">
          <ServiceIcon service={service} size={28} />
          <div>
            <strong>{service.name}</strong>
            <span>{service.tagline}</span>
          </div>
        </div>

        {service.id !== 'youtube' ? (
          <div className="theater__actions">
            <button
              type="button"
              className={mode === 'login' ? 'is-active' : undefined}
              onClick={() => setMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'watch' ? 'is-active' : undefined}
              onClick={() => setMode('watch')}
            >
              Watch
            </button>
          </div>
        ) : (
          <div className="theater__actions" aria-hidden="true" />
        )}
      </header>

      <div className="theater__stage">
        {service.id === 'youtube' ? (
          <YouTubeTheater />
        ) : (
          <section className="theater__fallback">
            <div className="theater__fallback-card">
              <ServiceIcon service={service} size={72} />
              <h1>{mode === 'login' ? `Sign in to ${service.name}` : `Watch on ${service.name}`}</h1>
              <p>
                Open {service.name} from PiliX TV. You sign in on their official site — we never ask
                for your password here — then watch in the player tab while PiliX stays your home
                hub.
              </p>

              <div className="theater__fallback-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => openOfficial(frameSrc)}
                >
                  {mode === 'login'
                    ? `Continue to ${service.shortName} login`
                    : `Open ${service.shortName} player`}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => openOfficial(service.homeUrl)}
                >
                  Visit {service.shortName} site
                </button>
              </div>

              <p className="theater__note">
                {isConnected
                  ? `${service.shortName} is marked as connected on this device.`
                  : 'Tip: after you sign in once in the player tab, return here anytime from the orbit.'}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
