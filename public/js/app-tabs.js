(function () {
  var TAB_KEY = 'pilix_app_tab'
  var livestream = document.getElementById('panel-livestream')
  var ranker = document.getElementById('panel-ranker')
  // Only real tab buttons — never body[data-app-tab], or every page click retriggers setTab.
  var buttons = Array.prototype.slice.call(
    document.querySelectorAll('.app-tab[data-app-tab], [role="tab"][data-app-tab]')
  )
  if (!livestream || !ranker || !buttons.length) return

  function desiredTab() {
    var params = new URLSearchParams(window.location.search)
    if (params.get('r')) return 'ranker'
    var q = (params.get('tab') || '').toLowerCase()
    if (q === 'ranker' || q === 'livestream') return q
    var hash = (window.location.hash || '').replace(/^#/, '').toLowerCase()
    if (hash === 'ranker' || hash.indexOf('ranker') === 0) return 'ranker'
    if (hash === 'livestream') return 'livestream'
    try {
      var saved = localStorage.getItem(TAB_KEY)
      if (saved === 'ranker' || saved === 'livestream') return saved
    } catch (e) {}
    return 'livestream'
  }

  function setTab(tab, pushUrl) {
    var next = tab === 'ranker' ? 'ranker' : 'livestream'
    var prev = document.body.getAttribute('data-app-tab')
    document.body.setAttribute('data-app-tab', next)
    livestream.hidden = next !== 'livestream'
    ranker.hidden = next !== 'ranker'
    buttons.forEach(function (btn) {
      var active = btn.getAttribute('data-app-tab') === next
      btn.classList.toggle('is-active', active)
      btn.setAttribute('aria-selected', active ? 'true' : 'false')
    })
    try {
      localStorage.setItem(TAB_KEY, next)
    } catch (e) {}

    if (pushUrl) {
      var url = new URL(window.location.href)
      url.searchParams.set('tab', next)
      if (next !== 'ranker') url.searchParams.delete('r')
      history.replaceState(null, '', url.pathname + url.search + (next === 'ranker' ? '' : ''))
    }

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

  setTab(desiredTab(), false)
})()
