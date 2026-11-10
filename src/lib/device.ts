/** Matches the kind of UA checks streaming sites use for “mobile web”. */
export function isMobileUserAgent(ua = navigator.userAgent): boolean {
  const value = ua.toLowerCase()
  const tablet = /(ipad|tablet|(android(?!.*mobile))|kindle|playbook|silk)/i.test(value)
  const phone = /iphone|ipod|android.*mobile|windows phone|mobile/i.test(value)
  return tablet || phone
}
