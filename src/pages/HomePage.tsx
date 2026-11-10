import { Link } from 'react-router-dom'
import { OrbitHub } from '../components/OrbitHub'
import { SERVICES } from '../services'

export function HomePage() {
  return (
    <main className="home">
      <div className="home__atmosphere" aria-hidden="true">
        <div className="home__beam home__beam--blue" />
        <div className="home__beam home__beam--red" />
        <div className="home__vignette" />
        <div className="home__stars" />
      </div>

      <header className="home__brand">
        <p className="home__wordmark">PiliX TV</p>
        <h1 className="home__headline">One hub. Every stream.</h1>
        <p className="home__lede">
          Tap a service to browse, sign in, and watch inside the PiliX TV browser.
        </p>
      </header>

      <section className="home__stage" aria-label="Streaming services">
        <OrbitHub />
      </section>

      <nav className="home__rail" aria-label="Quick open">
        {SERVICES.map((service) => (
          <Link key={service.id} className="home__chip" to={`/watch/${service.id}`}>
            {service.shortName}
          </Link>
        ))}
      </nav>
    </main>
  )
}
