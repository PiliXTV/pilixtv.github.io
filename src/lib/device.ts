/** Matches the kind of UA checks streaming sites use for “mobile web”. */
export function isMobileUserAgent(ua = navigator.userAgent): boolean {
  const value = ua.toLowerCase()
  const tablet = /(ipad|tablet|(android(?!.*mobile))|kindle|playbook|silk)/i.test(value)
  const phone = /iphone|ipod|android.*mobile|windows phone|mobile/i.test(value)
  return tablet || phone
}

/** In-app browsers often keep a mobile UA even when “desktop mode” feels enabled. */
export function isInAppBrowser(ua = navigator.userAgent): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Twitter|MicroMessenger|\bwv\b|WebView|CriOS\/.+Mobile|EdgiOS/i.test(
    ua,
  )
}
