(function () {
  const STORAGE_KEY = 'zv_custom_servers_v1'
  const modal = document.getElementById('stream-settings-modal')
  const toggle = document.getElementById('stream-settings-toggle')
  const closeBtn = document.getElementById('stream-settings-close')
  const saveBtn = document.getElementById('stream-settings-save')
  const clearBtn = document.getElementById('stream-settings-clear')
  const area = document.getElementById('stream-settings-json')
  if (!modal || !toggle || !area) return

  const sample = {
    1: { mpdUrl: '', keyId: '', key: '' },
    2: { mpdUrl: '', keyId: '', key: '' },
    3: { mpdUrl: '', keyId: '', key: '' },
  }

  function openModal() {
    let current = sample
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) current = JSON.parse(raw)
    } catch (e) {}
    area.value = JSON.stringify(current, null, 2)
    modal.hidden = false
  }

  function closeModal() {
    modal.hidden = true
  }

  toggle.addEventListener('click', openModal)
  closeBtn && closeBtn.addEventListener('click', closeModal)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal()
  })

  saveBtn &&
    saveBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(area.value)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        location.reload()
      } catch (err) {
        alert('Invalid JSON. Check the config and try again.')
      }
    })

  clearBtn &&
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY)
      location.reload()
    })
})()
