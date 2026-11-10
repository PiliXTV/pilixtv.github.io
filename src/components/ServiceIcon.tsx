import type { StreamingService } from '../services'

type Props = {
  service: StreamingService
  size?: number
}

export function ServiceIcon({ service, size = 64 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    role: 'img' as const,
    'aria-label': service.name,
  }

  switch (service.id) {
    case 'iwant':
      return (
        <svg {...common}>
          <rect width="64" height="64" rx="16" fill="#1a0505" />
          <text
            x="32"
            y="38"
            textAnchor="middle"
            fill="#e10600"
            fontFamily="Syne, sans-serif"
            fontSize="16"
            fontWeight="800"
          >
            iWant
          </text>
        </svg>
      )
    case 'netflix':
      return (
        <svg {...common}>
          <rect width="64" height="64" rx="16" fill="#141414" />
          <path
            d="M22 12h8.2l11.6 28.4V12H50v40h-8.4L29.8 22.8V52H22V12z"
            fill="#e50914"
          />
        </svg>
      )
    case 'disney':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="disneyGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1a3cff" />
              <stop offset="100%" stopColor="#0a1a66" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="url(#disneyGrad)" />
          <path
            d="M10 36c8-12 22-18 36-14 2 .6 3.4 1.2 4.6 2-8 1.4-16 5.4-21.5 11.2C33 40 38 42 44 42c4.2 0 7.4-1 9.5-2.2.4 1.4.6 2.8.6 4.2C48 48 40 50 32 48c-12-3-18-8-22-12z"
            fill="#fff"
          />
          <text
            x="32"
            y="28"
            textAnchor="middle"
            fill="#fff"
            fontFamily="Syne, sans-serif"
            fontSize="11"
            fontWeight="800"
          >
            Disney+
          </text>
        </svg>
      )
    case 'prime':
      return (
        <svg {...common}>
          <rect width="64" height="64" rx="16" fill="#0f171e" />
          <text
            x="32"
            y="30"
            textAnchor="middle"
            fill="#fff"
            fontFamily="Figtree, sans-serif"
            fontSize="13"
            fontWeight="700"
          >
            prime
          </text>
          <path
            d="M16 38c8 8 24 8 32 0"
            fill="none"
            stroke="#00a8e1"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M42 36l6 2-4 5"
            fill="none"
            stroke="#00a8e1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'viu':
      return (
        <svg {...common}>
          <rect width="64" height="64" rx="16" fill="#111" />
          <text
            x="32"
            y="40"
            textAnchor="middle"
            fill="#ffcc00"
            fontFamily="Syne, sans-serif"
            fontSize="22"
            fontWeight="800"
          >
            viu
          </text>
        </svg>
      )
    case 'youtube':
      return (
        <svg {...common}>
          <rect width="64" height="64" rx="16" fill="#1a1a1a" />
          <rect x="12" y="18" width="40" height="28" rx="8" fill="#ff0033" />
          <path d="M28 26l14 6-14 6V26z" fill="#fff" />
        </svg>
      )
    case 'hbo':
      return (
        <svg {...common}>
          <rect width="64" height="64" rx="16" fill="#0b0d10" />
          <text
            x="32"
            y="30"
            textAnchor="middle"
            fill="#f2f4f7"
            fontFamily="Syne, sans-serif"
            fontSize="16"
            fontWeight="800"
            letterSpacing="1"
          >
            HBO
          </text>
          <text
            x="32"
            y="46"
            textAnchor="middle"
            fill="#b0b8c4"
            fontFamily="Figtree, sans-serif"
            fontSize="11"
            fontWeight="600"
            letterSpacing="3"
          >
            MAX
          </text>
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <rect width="64" height="64" rx="16" fill="#222" />
        </svg>
      )
  }
}
