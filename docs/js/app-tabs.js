(function () {
  var TAB_KEY = 'pilix_app_tab'
  var VALID = { profiles: 1, ranker: 1, livestream: 1 }
  var livestream = document.getElementById('panel-livestream')
  var ranker = document.getElementById('panel-ranker')
  var profiles = document.getElementById('panel-profiles')
  // Only real tab buttons — never body[data-app-tab], or every page click retriggers setTab.
  var buttons = Array.prototype.slice.call(
    document.querySelectorAll('.app-tab[data-app-tab], [role="tab"][data-app-tab]')
  )
  if (!livestream || !ranker || !profiles || !buttons.length) return

  function normalizeTab(tab) {
    var t = String(tab || '').toLowerCase()
    if (t === 'profile' || t === 'housemates' || t === 'hm') return 'profiles'
    return VALID[t] ? t : 'profiles'
  }

  function desiredTab() {
    var params = new URLSearchParams(window.location.search)
    if (params.get('r')) return 'ranker'
    var q = (params.get('tab') || '').toLowerCase()
    if (q === 'ranker' || q === 'livestream' || q === 'profiles' || q === 'profile') {
      return normalizeTab(q)
    }
    var hash = (window.location.hash || '').replace(/^#/, '').toLowerCase()
    if (hash === 'ranker' || hash.indexOf('ranker') === 0) return 'ranker'
    if (hash === 'livestream') return 'livestream'
    if (
      hash === 'profiles' ||
      hash === 'profile' ||
      hash.indexOf('profile') === 0 ||
      hash.indexOf('housemate') === 0
    ) {
      return 'profiles'
    }
    // Bare site URL lands on Housemates Profile (first tab).
    return 'profiles'
  }

  function syncUrl(next) {
    var url = new URL(window.location.href)
    if (next === 'profiles') {
      // Profiles is the home view — keep root URL.
      url.searchParams.delete('tab')
      url.searchParams.delete('r')
    } else if (next === 'ranker') {
      url.searchParams.set('tab', 'ranker')
    } else {
      url.searchParams.set('tab', 'livestream')
      url.searchParams.delete('r')
    }
    var nextHref = url.pathname + url.search + url.hash
    var cur = window.location.pathname + window.location.search + window.location.hash
    if (nextHref !== cur) history.replaceState(null, '', nextHref)
  }

  function setTab(tab, pushUrl) {
    var next = normalizeTab(tab)
    var prev = document.body.getAttribute('data-app-tab')
    document.body.setAttribute('data-app-tab', next)
    livestream.hidden = next !== 'livestream'
    ranker.hidden = next !== 'ranker'
    profiles.hidden = next !== 'profiles'
    buttons.forEach(function (btn) {
      var active = btn.getAttribute('data-app-tab') === next
      btn.classList.toggle('is-active', active)
      btn.setAttribute('aria-selected', active ? 'true' : 'false')
    })
    try {
      localStorage.setItem(TAB_KEY, next)
    } catch (e) {}

    if (pushUrl) syncUrl(next)

    // Only notify listeners when the tab actually changes.
    if (prev === next) return

    try {
      window.dispatchEvent(
        new CustomEvent('pilix:tabchange', { detail: { tab: next, prev: prev } })
      )
    } catch (e) {}
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTab(btn.getAttribute('data-app-tab'), true)
    })
  })

  var initial = desiredTab()
  setTab(initial, false)
  // Normalize bookmarks like ?tab=profiles → clean root while staying on Profiles.
  if (initial === 'profiles') syncUrl('profiles')
})()
