import { Link } from 'react-router-dom'
import { SERVICES } from '../services'
import { ServiceIcon } from './ServiceIcon'

type Props = {
  radius?: number
}

export function OrbitHub({ radius = 210 }: Props) {
  const count = SERVICES.length

  return (
    <div className="orbit" style={{ ['--orbit-radius' as string]: `${radius}px` }}>
      <div className="orbit__ring orbit__ring--outer" aria-hidden="true" />
      <div className="orbit__ring orbit__ring--inner" aria-hidden="true" />
      <div className="orbit__glow" aria-hidden="true" />

      <div className="orbit__core">
        <img
          src="/pilix-logo.jpg"
          alt="PiliX Pinas"
          className="orbit__logo"
          width={168}
          height={168}
          draggable={false}
        />
      </div>

      <ul className="orbit__track">
        {SERVICES.map((service, index) => {
          const angle = (360 / count) * index - 90
          return (
            <li
              key={service.id}
              className="orbit__item"
              style={{
                ['--angle' as string]: `${angle}deg`,
                ['--delay' as string]: `${index * 0.12}s`,
                ['--accent' as string]: service.accent,
                ['--accent-soft' as string]: service.accentSoft,
              }}
            >
              <Link
                to={`/watch/${service.id}`}
                className="orbit__link"
                aria-label={`Open ${service.name} on PiliX TV`}
              >
                <span className="orbit__badge">
                  <ServiceIcon service={service} size={56} />
                </span>
                <span className="orbit__label">{service.shortName}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
