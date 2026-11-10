import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { InAppBrowser } from '../components/InAppBrowser'
import { ServiceIcon } from '../components/ServiceIcon'
import { YouTubeTheater } from '../components/YouTubeTheater'
import { getService } from '../services'

type Mode = 'watch' | 'login' | 'browse'

export function TheaterPage() {
  const { serviceId } = useParams()
  const service = getService(serviceId)
  const [mode, setMode] = useState<Mode>(serviceId === 'youtube' ? 'watch' : 'browse')

  useEffect(() => {
    setMode(serviceId === 'youtube' ? 'watch' : 'browse')
  }, [serviceId])

  const frameSrc = useMemo(() => {
    if (!service) return ''
    if (mode === 'login') return service.loginUrl
    if (mode === 'watch') return service.watchUrl
    return service.homeUrl
  }, [mode, service])

  if (!service) {
    return <Navigate to="/" replace />
  }

  const showYouTubePlayer = service.id === 'youtube' && mode === 'watch'

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

        <div className="theater__actions">
          <button
            type="button"
            className={mode === 'browse' ? 'is-active' : undefined}
            onClick={() => setMode('browse')}
          >
            Browse
          </button>
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
      </header>

      <div className="theater__stage">
        {showYouTubePlayer ? (
          <YouTubeTheater />
        ) : (
          <InAppBrowser title={service.name} initialUrl={frameSrc} accent={service.accent} />
        )}
      </div>
    </div>
  )
}
