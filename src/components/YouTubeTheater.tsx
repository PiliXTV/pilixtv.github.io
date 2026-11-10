import { useMemo, useState } from 'react'

type Clip = {
  id: string
  title: string
}

const STARTERS: Clip[] = [
  { id: 'aqz-KE-bpKQ', title: 'Big Buck Bunny' },
  { id: 'LXb3EKWsInQ', title: 'Brazil in 4K' },
  { id: 'ScMzIvxBSi4', title: 'Peaceful piano' },
  { id: 'hY7m5jjJ9mM', title: 'Cat vibes' },
]

function extractVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v')
      if (v && /^[\w-]{11}$/.test(v)) return v
      const parts = url.pathname.split('/').filter(Boolean)
      const embedIndex = parts.indexOf('embed')
      if (embedIndex >= 0 && parts[embedIndex + 1] && /^[\w-]{11}$/.test(parts[embedIndex + 1])) {
        return parts[embedIndex + 1]
      }
    }
  } catch {
    return null
  }
  return null
}

export function YouTubeTheater() {
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(STARTERS[0].id)
  const [searchTerm, setSearchTerm] = useState('')

  const embedSrc = useMemo(() => {
    if (searchTerm) {
      // Stay inside PiliX TV: use YouTube's embeddable results player surface when possible.
      return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(searchTerm)}`
    }
    return `https://www.youtube.com/embed/${activeId}?autoplay=0&rel=0`
  }, [activeId, searchTerm])

  const onSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault()
    const id = extractVideoId(query)
    if (id) {
      setSearchTerm('')
      setActiveId(id)
      return
    }
    if (query.trim()) {
      setSearchTerm(query.trim())
    }
  }

  return (
    <div className="yt">
      <div className="yt__player-wrap">
        <iframe
          className="yt__player"
          title="YouTube on PiliX TV"
          src={embedSrc}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>

      <aside className="yt__side">
        <form className="yt__search" onSubmit={onSubmit}>
          <label htmlFor="yt-query">Watch on PiliX TV</label>
          <div className="yt__row">
            <input
              id="yt-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Paste a link, video ID, or search"
              autoComplete="off"
            />
            <button type="submit" className="btn btn--primary">
              Play
            </button>
          </div>
        </form>

        <p className="yt__hint">
          Videos play inside PiliX TV. Use Browse / Sign in above to open YouTube in the PiliX
          browser.
        </p>

        <ul className="yt__list">
          {STARTERS.map((clip) => (
            <li key={clip.id}>
              <button
                type="button"
                className={!searchTerm && clip.id === activeId ? 'is-active' : undefined}
                onClick={() => {
                  setSearchTerm('')
                  setActiveId(clip.id)
                }}
              >
                {clip.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
