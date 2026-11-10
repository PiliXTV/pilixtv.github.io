export type StreamingService = {
  id: string
  name: string
  shortName: string
  tagline: string
  homeUrl: string
  loginUrl: string
  watchUrl: string
  accent: string
  accentSoft: string
  }

export const SERVICES: StreamingService[] = [
  {
    id: 'iwant',
    name: 'iWantTFC',
    shortName: 'iWant',
    tagline: 'Kapamilya shows & movies',
    homeUrl: 'https://www.iwanttfc.com',
    loginUrl: 'https://www.iwanttfc.com',
    watchUrl: 'https://www.iwanttfc.com',
    accent: '#e10600',
    accentSoft: 'rgba(225, 6, 0, 0.28)',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    shortName: 'Netflix',
    tagline: 'Series, films & originals',
    homeUrl: 'https://www.netflix.com',
    loginUrl: 'https://www.netflix.com/login',
    watchUrl: 'https://www.netflix.com/browse',
    accent: '#e50914',
    accentSoft: 'rgba(229, 9, 20, 0.28)',
  },
  {
    id: 'disney',
    name: 'Disney+',
    shortName: 'Disney+',
    tagline: 'Disney, Marvel, Star Wars & more',
    homeUrl: 'https://www.disneyplus.com',
    loginUrl: 'https://www.disneyplus.com/login',
    watchUrl: 'https://www.disneyplus.com',
    accent: '#113ccf',
    accentSoft: 'rgba(17, 60, 207, 0.32)',
  },
  {
    id: 'prime',
    name: 'Prime Video',
    shortName: 'Prime',
    tagline: 'Amazon originals & rentals',
    homeUrl: 'https://www.primevideo.com',
    loginUrl: 'https://www.primevideo.com',
    watchUrl: 'https://www.primevideo.com',
    accent: '#00a8e1',
    accentSoft: 'rgba(0, 168, 225, 0.28)',
  },
  {
    id: 'viu',
    name: 'Viu',
    shortName: 'Viu',
    tagline: 'Asian dramas & variety',
    homeUrl: 'https://www.viu.com',
    loginUrl: 'https://www.viu.com',
    watchUrl: 'https://www.viu.com',
    accent: '#ffcc00',
    accentSoft: 'rgba(255, 204, 0, 0.22)',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    shortName: 'YouTube',
    tagline: 'Videos, live & music',
    homeUrl: 'https://www.youtube.com',
    loginUrl: 'https://accounts.google.com/ServiceLogin?service=youtube',
    watchUrl: 'https://www.youtube.com',
    accent: '#ff0033',
    accentSoft: 'rgba(255, 0, 51, 0.28)',
  },
  {
    id: 'hbo',
    name: 'HBO Max',
    shortName: 'HBO',
    tagline: 'HBO hits & Max originals',
    homeUrl: 'https://www.max.com',
    loginUrl: 'https://auth.max.com/login',
    watchUrl: 'https://www.max.com',
    accent: '#b0b8c4',
    accentSoft: 'rgba(176, 184, 196, 0.22)',
  },
  {
    id: 'loklok',
    name: 'Loklok',
    shortName: 'Loklok',
    tagline: 'Movies & series on the go',
    homeUrl: 'https://www.loklok.com',
    loginUrl: 'https://www.loklok.com',
    watchUrl: 'https://www.loklok.com',
    accent: '#ff6a3d',
    accentSoft: 'rgba(255, 106, 61, 0.28)',
  },
]

export function getService(id: string | undefined): StreamingService | undefined {
  return SERVICES.find((service) => service.id === id)
}
