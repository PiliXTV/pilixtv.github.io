(function () {
  const STORAGE_KEY = 'zv_custom_servers_v1'
  const CAMERAS = {
    1: { id: '1', label: 'Main' },
    2: { id: '2', label: 'Dining' },
    3: { id: '3', label: 'External' },
  }

  const modal = document.getElementById('stream-settings-modal')
  const toggle = document.getElementById('stream-settings-toggle')
  const closeBtn = document.getElementById('stream-settings-close')
  const saveBtn = document.getElementById('stream-settings-save')
  const clearCamBtn = document.getElementById('stream-settings-clear-cam')
  const clearAllBtn = document.getElementById('stream-settings-clear')
  const mpdInput = document.getElementById('stream-settings-mpd')
  const keyIdInput = document.getElementById('stream-settings-keyid')
  const keyInput = document.getElementById('stream-settings-key')
  const statusEl = document.getElementById('stream-settings-status')
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.settings-cam-tab'))

  if (!modal || !toggle || !mpdInput || !keyIdInput || !keyInput || !tabs.length) return

  let activeCam = '1'
  let draft = emptyStore()

  function emptyStore() {
    return {
      1: { mpdUrl: '', keyId: '', key: '' },
      2: { mpdUrl: '', keyId: '', key: '' },
      3: { mpdUrl: '', keyId: '', key: '' },
    }
  }

  function readStore() {
    const next = emptyStore()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return next
      const parsed = JSON.parse(raw)
      ;[1, 2, 3].forEach((id) => {
        const row = parsed[id] || parsed[String(id)] || parsed[`cam${id}`] || {}
        next[id] = {
          mpdUrl: String(row.mpdUrl || '').trim(),
          keyId: String(row.keyId || '').trim(),
          key: String(row.key || '').trim(),
        }
      })
    } catch (e) {}
    return next
  }

  function hasOverride(row) {
    return Boolean(row && (row.mpdUrl || row.keyId || row.key))
  }

  function writeFieldsFromDraft() {
    const row = draft[activeCam] || { mpdUrl: '', keyId: '', key: '' }
    mpdInput.value = row.mpdUrl || ''
    keyIdInput.value = row.keyId || ''
    keyInput.value = row.key || ''
    if (statusEl) {
      statusEl.textContent = hasOverride(row)
        ? `${CAMERAS[activeCam].label} has a saved override on this device.`
        : `${CAMERAS[activeCam].label} uses the site default (no override).`
    }
  }

  function captureFieldsToDraft() {
    draft[activeCam] = {
      mpdUrl: mpdInput.value.trim(),
      keyId: keyIdInput.value.trim(),
      key: keyInput.value.trim(),
    }
  }

  function setActiveCam(camId) {
    captureFieldsToDraft()
    activeCam = String(camId)
    tabs.forEach((tab) => {
      const on = tab.getAttribute('data-cam') === activeCam
      tab.classList.toggle('is-active', on)
      tab.setAttribute('aria-selected', on ? 'true' : 'false')
    })
    writeFieldsFromDraft()
  }

  function openModal() {
    draft = readStore()
    setActiveCam(activeCam)
    modal.hidden = false
    mpdInput.focus()
  }

  function closeModal() {
    modal.hidden = true
  }

  function persistAndReload(store) {
    const cleaned = {}
    ;[1, 2, 3].forEach((id) => {
      const row = store[id] || {}
      if (hasOverride(row)) {
        cleaned[id] = {
          mpdUrl: row.mpdUrl || '',
          keyId: row.keyId || '',
          key: row.key || '',
        }
      }
    })
    if (Object.keys(cleaned).length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    location.reload()
  }

  toggle.addEventListener('click', openModal)
  closeBtn && closeBtn.addEventListener('click', closeModal)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal()
  })

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setActiveCam(tab.getAttribute('data-cam')))
  })

  saveBtn &&
    saveBtn.addEventListener('click', () => {
      captureFieldsToDraft()
      const row = draft[activeCam]
      if (!row.mpdUrl) {
        alert('Enter an mpdUrl for this camera (or Clear this camera).')
        mpdInput.focus()
        return
      }
      persistAndReload(draft)
    })

  clearCamBtn &&
    clearCamBtn.addEventListener('click', () => {
      draft[activeCam] = { mpdUrl: '', keyId: '', key: '' }
      writeFieldsFromDraft()
      persistAndReload(draft)
    })

  clearAllBtn &&
    clearAllBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY)
      location.reload()
    })
})()
